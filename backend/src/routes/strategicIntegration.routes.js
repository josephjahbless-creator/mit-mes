/**
 * Strategic Integration Routes
 * Endpoints for Dira ya Taifa 2050 integration and automated indicator calculations
 */

const express = require('express');
const router = express.Router();

const prisma = require('../config/db');
const strategicObjectivesController = require('../modules/strategic-integration/strategicObjectives.controller');
const indicatorCalculationService = require('../services/indicatorCalculationService');
const { authenticate, authorize } = require('../middleware/auth');

const DEFAULT_PERIOD = {
  period: 'Q2-2026',
  fiscalYear: '2025-2026',
  reportingPeriod: 'Q2',
  start_date: '2025-10-01',
  end_date: '2025-12-31'
};

// ═════════════════════════════════════════════════════════════════════════════════
// STRATEGIC OBJECTIVES ROUTES
// ═════════════════════════════════════════════════════════════════════════════════

router.get('/strategic-objectives', authenticate, (req, res) =>
  strategicObjectivesController.getAllObjectives(req, res)
);

router.get('/strategic-objectives/:id', authenticate, (req, res) =>
  strategicObjectivesController.getObjectiveById(req, res)
);

router.get('/strategic-objectives/:id/progress', authenticate, (req, res) =>
  strategicObjectivesController.getObjectiveProgress(req, res)
);

router.get('/dashboard/flagship-status', authenticate, (req, res) =>
  strategicObjectivesController.getFlagshipStatusDashboard(req, res)
);

router.post(
  '/strategic-objectives/:id/link-project',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  (req, res) => strategicObjectivesController.linkProjectToObjective(req, res)
);

router.delete(
  '/strategic-objectives/:id/link-project/:projectId',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  (req, res) => strategicObjectivesController.unlinkProjectFromObjective(req, res)
);

router.get('/projects/:projectId/flagships', authenticate, (req, res) =>
  strategicObjectivesController.getProjectFlagships(req, res)
);

// ═════════════════════════════════════════════════════════════════════════════════
// FOUNDATIONAL REFORMS ROUTES
// ═════════════════════════════════════════════════════════════════════════════════

router.get('/foundational-reforms', authenticate, (req, res) =>
  strategicObjectivesController.getAllReforms(req, res)
);

// ═════════════════════════════════════════════════════════════════════════════════
// SYSTEM INTEGRATION ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════════

router.get(
  '/integration-status',
  authenticate,
  authorize('super_admin', 'admin'),
  (req, res) => strategicObjectivesController.getIntegrationStatus(req, res)
);

/**
 * POST /api/v1/indicators/:id/recalculate
 * Manually trigger indicator recalculation
 */
router.post(
  '/indicators/:id/recalculate',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const period = req.body?.period || DEFAULT_PERIOD;
      const result = await indicatorCalculationService.calculateIndicatorValue(id, period);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/indicators/:id/calculation-trace
 */
router.get('/indicators/:id/calculation-trace', authenticate, async (req, res) => {
  try {
    const trace = await indicatorCalculationService.getCalculationTrace(req.params.id);
    res.status(200).json({ success: true, data: trace });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/activities/:id/complete
 * Mark activity complete and trigger automatic indicator calculations
 */
router.post(
  '/activities/:id/complete',
  authenticate,
  authorize('data_collector', 'me_officer', 'admin', 'super_admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const status = req.body?.status || 'completed';

      const activity = await prisma.activity.update({
        where: { id },
        data: { workplanStatus: status },
        include: {
          activityToIndicatorMappings: { include: { indicator: true } }
        }
      });

      let indicatorsUpdated = 0;
      if (status === 'completed') {
        const period = req.body?.period || DEFAULT_PERIOD;
        const processed = new Set();
        for (const mapping of activity.activityToIndicatorMappings) {
          if (processed.has(mapping.indicator_id)) continue;
          processed.add(mapping.indicator_id);
          await indicatorCalculationService.calculateIndicatorValue(mapping.indicator_id, period);
          indicatorsUpdated++;
        }
      }

      res.status(200).json({ success: true, data: activity, indicators_updated: indicatorsUpdated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/activity-indicator-mappings
 * Create a mapping linking an activity to an indicator
 */
router.post(
  '/activity-indicator-mappings',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  async (req, res) => {
    try {
      const {
        activityId,
        indicatorId,
        contributionType = 'direct',
        aggregationMethod = 'sum',
        weighting = 100,
        dataElementKey = null,
        calculationFormula = null
      } = req.body;

      if (!activityId || !indicatorId) {
        return res.status(400).json({
          success: false,
          error: 'activityId and indicatorId are required'
        });
      }

      const mapping = await prisma.activityIndicatorMapping.upsert({
        where: {
          activity_id_indicator_id: { activity_id: activityId, indicator_id: indicatorId }
        },
        update: {
          contribution_type: contributionType,
          aggregation_method: aggregationMethod,
          weighting: parseFloat(weighting),
          data_element_key: dataElementKey,
          calculation_formula: calculationFormula,
          enabled: true
        },
        create: {
          activity_id: activityId,
          indicator_id: indicatorId,
          contribution_type: contributionType,
          aggregation_method: aggregationMethod,
          weighting: parseFloat(weighting),
          data_element_key: dataElementKey,
          calculation_formula: calculationFormula,
          enabled: true
        }
      });

      res.status(201).json({ success: true, data: mapping });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/snapshots/run
 * Manually trigger a strategic progress snapshot (also runs nightly via cron)
 */
router.post(
  '/snapshots/run',
  authenticate,
  authorize('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { runSnapshot } = require('../services/progressSnapshotService');
      const result = await runSnapshot();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/activities-lite
 * Lightweight searchable activity list for the mapping picker
 */
router.get('/activities-lite', authenticate, async (req, res) => {
  try {
    const { search = '', take = 30 } = req.query;
    const activities = await prisma.activity.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, workplanStatus: true, progressPct: true },
      orderBy: { name: 'asc' },
      take: Math.min(parseInt(take, 10) || 30, 100)
    });
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/indicators/:id/mappings
 * List the activity mappings that feed a given indicator
 */
router.get('/indicators/:id/mappings', authenticate, async (req, res) => {
  try {
    const mappings = await prisma.activityIndicatorMapping.findMany({
      where: { indicator_id: req.params.id },
      include: { activity: { select: { id: true, name: true, workplanStatus: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/activity-indicator-mappings/:id
 */
router.delete(
  '/activity-indicator-mappings/:id',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  async (req, res) => {
    try {
      await prisma.activityIndicatorMapping.delete({ where: { id: req.params.id } });
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/indicators/:id/performance
 * Latest performance-data rows for an indicator (auto-calculated values)
 */
router.get('/indicators/:id/performance', authenticate, async (req, res) => {
  try {
    const rows = await prisma.performanceData.findMany({
      where: { indicator_id: req.params.id },
      orderBy: { created_at: 'desc' },
      take: 12
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/reports/cascade-analysis
 */
router.get('/reports/cascade-analysis', authenticate, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const auditTrail = await prisma.auditTrailDira.findMany({
      where: {
        created_at: {
          gte: from_date ? new Date(from_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          lte: to_date ? new Date(to_date) : new Date()
        },
        change_type: 'auto_calculated'
      },
      orderBy: { created_at: 'desc' }
    });

    const byEntityType = {};
    auditTrail.forEach((entry) => {
      byEntityType[entry.entity_type] = (byEntityType[entry.entity_type] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        total_auto_calculations: auditTrail.length,
        by_entity_type: byEntityType,
        time_period: { from: from_date || 'last 90 days', to: to_date || 'today' }
      },
      recent_updates: auditTrail.slice(0, 50)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/reports/data-quality
 */
router.get('/reports/data-quality', authenticate, async (req, res) => {
  try {
    const [totalPerformanceData, autoCalculated, manual] = await Promise.all([
      prisma.performanceData.count(),
      prisma.performanceData.count({ where: { data_source: 'auto_calculated' } }),
      prisma.performanceData.count({ where: { data_source: 'manual_entry' } })
    ]);

    const confidenceScores = await prisma.performanceData.findMany({
      select: { confidence_score: true }
    });

    const avgConfidence = confidenceScores.length
      ? (
          confidenceScores.reduce((sum, d) => sum + Number(d.confidence_score || 0), 0) /
          confidenceScores.length
        ).toFixed(2)
      : '0.00';

    const pct = (n) =>
      totalPerformanceData ? `${((n / totalPerformanceData) * 100).toFixed(2)}%` : '0.00%';

    res.status(200).json({
      success: true,
      data: {
        total_performance_records: totalPerformanceData,
        auto_calculated: { count: autoCalculated, percentage: pct(autoCalculated) },
        manual_entry: { count: manual, percentage: pct(manual) },
        average_confidence_score: avgConfidence,
        indicators_with_rules: await prisma.indicatorCalculationRule.count({ where: { enabled: true } })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
