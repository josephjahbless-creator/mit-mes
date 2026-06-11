/**
 * Indicator Calculation Service
 * Handles automatic calculation of indicator values from activity data
 * Part of the Dira ya Taifa 2050 strategic integration
 */

const prisma = require('../config/db');
const logger = require('../utils/logger');

class IndicatorCalculationService {
  /**
   * Calculate indicator value based on linked activities
   * @param {string} indicatorId - ID of the indicator to calculate
   * @param {Object} period - { period, fiscalYear, reportingPeriod, start_date, end_date }
   * @returns {Promise<Object>} - Calculated performance data
   */
  async calculateIndicatorValue(indicatorId, period) {
    try {
      logger.info(`Calculating indicator value for indicator: ${indicatorId}, period: ${period.period}`);

      // Get all enabled activity-indicator mappings for this indicator,
      // each with the activity and that activity's validated actuals for the period.
      const mappings = await prisma.activityIndicatorMapping.findMany({
        where: {
          indicator_id: indicatorId,
          enabled: true
        },
        include: {
          activity: {
            include: {
              actuals: {
                where: {
                  // Only count values submitted for THIS indicator — an activity
                  // may feed several indicators within the same output.
                  indicatorId: indicatorId,
                  fiscalYear: period.fiscalYear,
                  reportingPeriod: period.reportingPeriod,
                  status: 'approved'
                }
              }
            }
          }
        }
      });

      if (mappings.length === 0) {
        logger.warn(`No active mappings found for indicator ${indicatorId}`);
        return null;
      }

      // Shape into { activity, mapping } items
      const relevantActivities = mappings.map((mapping) => ({
        activity: mapping.activity,
        mapping
      }));

      // Group activities by aggregation method
      const grouped = this._groupByAggregationMethod(relevantActivities);

      // Calculate based on each aggregation method
      let indicatorValue = 0;
      const contributingActivities = [];

      for (const [method, items] of Object.entries(grouped)) {
        const result = this._applyAggregation(method, items);
        indicatorValue += result.value;
        contributingActivities.push(...result.activities);
      }

      // Get indicator details for target and baseline values
      const indicator = await prisma.indicator.findUnique({
        where: { id: indicatorId }
      });

      // Calculate achievement percentage
      const targetValue = indicator?.maxValue || 100;
      const baselineValue = indicator?.baselineValue || 0;
      const achievementPercentage = targetValue ? (indicatorValue / targetValue) * 100 : 0;

      // Get previous value if exists
      const previousPerformanceData = await prisma.performanceData.findFirst({
        where: {
          indicator_id: indicatorId,
          status: 'final'
        },
        orderBy: { period_end: 'desc' }
      });

      // Store performance data
      const performanceData = await prisma.performanceData.create({
        data: {
          indicator_id: indicatorId,
          period: period.period,
          period_start: new Date(period.start_date),
          period_end: new Date(period.end_date),
          actual_value: indicatorValue,
          previous_value: previousPerformanceData?.actual_value ?? null,
          target_value: targetValue,
          baseline_value: baselineValue,
          achievement_percentage: parseFloat(achievementPercentage.toFixed(2)),
          data_source: 'auto_calculated',
          source_activities: contributingActivities,
          confidence_score: this._calculateConfidenceScore(relevantActivities),
          status: 'validated'
        }
      });

      // Create audit trail entry
      await this._createAuditTrail({
        entity_type: 'indicator',
        entity_id: indicatorId,
        change_type: 'auto_calculated',
        reason_code: 'activity_completion',
        previous_value: previousPerformanceData?.actual_value?.toString() ?? null,
        new_value: indicatorValue.toString(),
        triggered_by_id: null,
        triggered_by_type: 'system',
        correlation_id: performanceData.id,
        metadata: {
          contributing_activities: contributingActivities.length,
          achievement_percentage: achievementPercentage,
          period: period.period
        }
      });

      logger.info(`Successfully calculated indicator ${indicatorId}: value=${indicatorValue}, achievement=${achievementPercentage.toFixed(2)}%`);

      return {
        indicatorId,
        actual_value: indicatorValue,
        achievement_percentage: achievementPercentage,
        contributing_activities: contributingActivities.length,
        performanceDataId: performanceData.id
      };
    } catch (error) {
      logger.error(`Error calculating indicator ${indicatorId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group mappings by aggregation method
   */
  _groupByAggregationMethod(relevantActivities) {
    const grouped = {};
    for (const item of relevantActivities) {
      const method = item.mapping.aggregation_method;
      if (!grouped[method]) grouped[method] = [];
      grouped[method].push(item);
    }
    return grouped;
  }

  /**
   * Apply aggregation method to activity values
   */
  _applyAggregation(method, items) {
    const activities = items.map((item) => item.activity).filter(Boolean);
    let result = 0;

    switch (method) {
      case 'sum':
        result = items.reduce((sum, item) => {
          const value = item.activity?.actuals?.[0]?.actualValue || 0;
          return sum + parseFloat(value);
        }, 0);
        break;

      case 'average': {
        const sum = items.reduce((acc, item) => {
          const value = item.activity?.actuals?.[0]?.actualValue || 0;
          return acc + parseFloat(value);
        }, 0);
        result = items.length ? sum / items.length : 0;
        break;
      }

      case 'weighted_average':
        result = items.reduce((acc, item) => {
          const value = item.activity?.actuals?.[0]?.actualValue || 0;
          const weight = parseFloat(item.mapping.weighting) || 100;
          return acc + parseFloat(value) * (weight / 100);
        }, 0);
        break;

      case 'count':
        result = items.filter((item) => (item.activity?.actuals?.length || 0) > 0).length;
        break;

      case 'percentage': {
        const completed = items.filter((item) => (item.activity?.actuals?.length || 0) > 0).length;
        result = items.length ? (completed / items.length) * 100 : 0;
        break;
      }

      case 'formula':
        // Custom formula evaluation would be implemented here.
        result = 0;
        break;

      default:
        result = 0;
    }

    return {
      value: result,
      activities: activities.map((a) => a.id)
    };
  }

  /**
   * Calculate confidence score based on data completeness and recency
   */
  _calculateConfidenceScore(relevantActivities) {
    if (relevantActivities.length === 0) return 0;

    const withData = relevantActivities.filter(
      (item) => (item.activity?.actuals?.length || 0) > 0
    ).length;
    const completeness = (withData / relevantActivities.length) * 100;

    const recentCount = relevantActivities.filter((item) => {
      const submitted = item.activity?.actuals?.[0]?.submittedAt;
      if (!submitted) return false;
      const daysAgo = (Date.now() - new Date(submitted).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).length;
    const recency = (recentCount / relevantActivities.length) * 100;

    return parseFloat((completeness * 0.6 + recency * 0.4).toFixed(2));
  }

  /**
   * Create audit trail entry (best-effort, never throws)
   */
  async _createAuditTrail(data) {
    try {
      await prisma.auditTrailDira.create({ data });
    } catch (error) {
      logger.error(`Error creating audit trail: ${error.message}`);
    }
  }

  /**
   * Recalculate all indicators for a given period
   */
  async recalculateAllIndicators(period) {
    try {
      logger.info(`Starting batch recalculation for period: ${period.period}`);

      const indicators = await prisma.indicator.findMany({
        where: { isActive: true },
        include: {
          activityToIndicatorMappings: { where: { enabled: true } }
        }
      });

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const indicator of indicators) {
        if (indicator.activityToIndicatorMappings.length > 0) {
          try {
            const result = await this.calculateIndicatorValue(indicator.id, period);
            if (result) {
              results.push(result);
              successCount++;
            }
          } catch (error) {
            logger.error(`Failed to calculate indicator ${indicator.id}: ${error.message}`);
            errorCount++;
          }
        }
      }

      logger.info(`Batch recalculation completed: ${successCount} succeeded, ${errorCount} failed`);
      return { total: indicators.length, successful: successCount, failed: errorCount, results };
    } catch (error) {
      logger.error(`Error in batch recalculation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Derive a period descriptor from a fiscal year + reporting period.
   * Tanzania fiscal year runs July–June, e.g. "2025-2026" starts July 2025.
   */
  _derivePeriod(fiscalYear, reportingPeriod) {
    const startYear = parseInt(String(fiscalYear).split('-')[0], 10) || new Date().getFullYear();
    const endYear = startYear + 1;
    const ranges = {
      Q1: [`${startYear}-07-01`, `${startYear}-09-30`],
      Q2: [`${startYear}-10-01`, `${startYear}-12-31`],
      Q3: [`${endYear}-01-01`, `${endYear}-03-31`],
      Q4: [`${endYear}-04-01`, `${endYear}-06-30`],
      Annual: [`${startYear}-07-01`, `${endYear}-06-30`],
    };
    const [start_date, end_date] = ranges[reportingPeriod] || ranges.Annual;
    return {
      period: `${reportingPeriod}-${endYear}`,
      fiscalYear,
      reportingPeriod,
      start_date,
      end_date,
    };
  }

  /**
   * Triggered when an IndicatorActual is approved. If the actual is tied to an
   * activity that feeds one or more indicators, recalculate each of those
   * indicators automatically. Safe to call fire-and-forget.
   * @returns {Promise<{recalculated:number}>}
   */
  async onActualApproved(actualId) {
    try {
      const actual = await prisma.indicatorActual.findUnique({
        where: { id: actualId },
        select: {
          id: true,
          activityId: true,
          fiscalYear: true,
          reportingPeriod: true,
        },
      });

      if (!actual || !actual.activityId) {
        return { recalculated: 0 };
      }

      // Which indicators does this activity feed?
      const mappings = await prisma.activityIndicatorMapping.findMany({
        where: { activity_id: actual.activityId, enabled: true },
        select: { indicator_id: true },
      });

      if (mappings.length === 0) return { recalculated: 0 };

      const period = this._derivePeriod(actual.fiscalYear, actual.reportingPeriod);
      const seen = new Set();
      let recalculated = 0;

      for (const m of mappings) {
        if (seen.has(m.indicator_id)) continue;
        seen.add(m.indicator_id);
        try {
          await this.calculateIndicatorValue(m.indicator_id, period);
          recalculated++;
        } catch (err) {
          logger.error(`Auto-recalc failed for indicator ${m.indicator_id}: ${err.message}`);
        }
      }

      logger.info(`onActualApproved(${actualId}): recalculated ${recalculated} indicator(s) from activity ${actual.activityId}`);
      return { recalculated };
    } catch (error) {
      logger.error(`onActualApproved error for ${actualId}: ${error.message}`);
      return { recalculated: 0 };
    }
  }

  /**
   * Get calculation trace for an indicator (audit history)
   */
  async getCalculationTrace(indicatorId) {
    try {
      return await prisma.auditTrailDira.findMany({
        where: { entity_type: 'indicator', entity_id: indicatorId },
        orderBy: { created_at: 'desc' },
        take: 50
      });
    } catch (error) {
      logger.error(`Error getting calculation trace: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback indicator to previous value (if activity fails)
   */
  async rollbackIndicator(indicatorId, performanceDataId, reason) {
    try {
      logger.info(`Rolling back indicator ${indicatorId} due to: ${reason}`);

      await prisma.performanceData.update({
        where: { id: performanceDataId },
        data: { status: 'archived' }
      });

      const previousData = await prisma.performanceData.findFirst({
        where: { indicator_id: indicatorId, status: { not: 'archived' } },
        orderBy: { period_end: 'desc' }
      });

      await this._createAuditTrail({
        entity_type: 'indicator',
        entity_id: indicatorId,
        change_type: 'rolled_back',
        reason_code: 'activity_failed',
        previous_value: performanceDataId,
        new_value: previousData?.id || null,
        triggered_by_type: 'system',
        correlation_id: performanceDataId,
        metadata: { reason }
      });

      logger.info(`Successfully rolled back indicator ${indicatorId}`);
      return previousData;
    } catch (error) {
      logger.error(`Error rolling back indicator: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new IndicatorCalculationService();
