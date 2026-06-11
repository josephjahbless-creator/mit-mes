/**
 * Strategic Objectives Controller
 * Handles endpoints for Dira ya Taifa 2050 strategic objectives and flagships
 */

const prisma = require('../../config/db');
const logger = require('../../utils/logger');

class StrategicObjectivesController {
  /**
   * Get all strategic objectives (7 flagships)
   */
  async getAllObjectives(req, res) {
    try {
      const { status, priority_level } = req.query;

      const where = {};
      if (status) where.status = status;
      if (priority_level) where.priority_level = parseInt(priority_level, 10);

      const objectives = await prisma.strategicObjectiveDira.findMany({
        where,
        include: {
          projectObjectives: {
            include: {
              project: {
                include: {
                  progressSnapshots: {
                    take: 1,
                    orderBy: { snapshot_date: 'desc' }
                  }
                }
              }
            }
          },
          progressSnapshots: {
            take: 1,
            orderBy: { snapshot_date: 'desc' }
          }
        },
        orderBy: { priority_level: 'asc' }
      });

      res.status(200).json({ success: true, data: objectives });
    } catch (error) {
      logger.error(`Error fetching strategic objectives: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get a specific strategic objective with full details
   */
  async getObjectiveById(req, res) {
    try {
      const { id } = req.params;

      const objective = await prisma.strategicObjectiveDira.findUnique({
        where: { id },
        include: {
          projectObjectives: {
            include: {
              project: {
                include: {
                  progressSnapshots: { orderBy: { snapshot_date: 'desc' }, take: 5 }
                }
              }
            }
          },
          progressSnapshots: { orderBy: { snapshot_date: 'desc' }, take: 10 }
        }
      });

      if (!objective) {
        return res.status(404).json({ success: false, error: 'Strategic objective not found' });
      }

      res.status(200).json({ success: true, data: objective });
    } catch (error) {
      logger.error(`Error fetching strategic objective: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get flagship status dashboard (all 7 flagships with progress)
   */
  async getFlagshipStatusDashboard(req, res) {
    try {
      const objectives = await prisma.strategicObjectiveDira.findMany({
        where: { status: 'active' },
        include: {
          projectObjectives: {
            include: {
              project: {
                include: {
                  progressSnapshots: { take: 1, orderBy: { snapshot_date: 'desc' } }
                }
              }
            }
          },
          progressSnapshots: { take: 14, orderBy: { snapshot_date: 'desc' } }
        },
        orderBy: { priority_level: 'asc' }
      });

      const dashboard = objectives.map((obj) => {
        // Oldest → newest for charting a sparkline
        const history = [...obj.progressSnapshots].reverse().map((s) => ({
          date: s.snapshot_date,
          value: s.overall_achievement_percentage ?? 0
        }));
        return {
          ...obj,
          stats: {
            projects_total: obj.projectObjectives.length,
            projects_active: obj.projectObjectives.filter((po) =>
              po.project?.progressSnapshots?.some((s) => s.status !== 'delayed')
            ).length,
            projects_at_risk: obj.projectObjectives.filter((po) =>
              po.project?.progressSnapshots?.some((s) => s.status === 'at_risk')
            ).length,
            current_progress: obj.progressSnapshots[0]?.overall_achievement_percentage || 0,
            status: obj.progressSnapshots[0]?.status || 'on_track',
            trend: history
          }
        };
      });

      res.status(200).json({ success: true, data: dashboard, timestamp: new Date() });
    } catch (error) {
      logger.error(`Error fetching flagship status dashboard: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get objective progress history
   */
  async getObjectiveProgress(req, res) {
    try {
      const { id } = req.params;
      const { days = 90 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days, 10));

      const progress = await prisma.strategicObjectiveProgress.findMany({
        where: {
          strategic_objective_id: id,
          snapshot_date: { gte: startDate }
        },
        orderBy: { snapshot_date: 'asc' }
      });

      res.status(200).json({ success: true, data: progress, days_analyzed: days });
    } catch (error) {
      logger.error(`Error fetching objective progress: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Link a project to a strategic objective
   */
  async linkProjectToObjective(req, res) {
    try {
      // id (from URL) is the strategic objective; projectId comes from the body
      const strategicObjectiveId = req.params.id || req.body.strategicObjectiveId;
      const { projectId, contributionType = 'primary', weighting = 100 } = req.body;

      if (!projectId || !strategicObjectiveId) {
        return res.status(400).json({
          success: false,
          error: 'projectId and strategicObjectiveId are required'
        });
      }

      const existing = await prisma.projectStrategicObjective.findUnique({
        where: {
          projectId_strategic_objective_id: {
            projectId,
            strategic_objective_id: strategicObjectiveId
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Project is already linked to this strategic objective'
        });
      }

      const linkage = await prisma.projectStrategicObjective.create({
        data: {
          projectId,
          strategic_objective_id: strategicObjectiveId,
          contribution_type: contributionType,
          weighting: parseFloat(weighting),
          status: 'active'
        },
        include: { project: true, strategicObjective: true }
      });

      res.status(201).json({ success: true, data: linkage });
    } catch (error) {
      logger.error(`Error linking project to objective: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Unlink a project from a strategic objective
   */
  async unlinkProjectFromObjective(req, res) {
    try {
      const strategicObjectiveId = req.params.id;
      const projectId = req.params.projectId;

      await prisma.projectStrategicObjective.deleteMany({
        where: { projectId, strategic_objective_id: strategicObjectiveId }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error(`Error unlinking project from objective: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * List the strategic objectives (flagships) a project is linked to
   */
  async getProjectFlagships(req, res) {
    try {
      const links = await prisma.projectStrategicObjective.findMany({
        where: { projectId: req.params.projectId },
        include: {
          strategicObjective: {
            select: { id: true, code: true, name: true, flagship_badge: true }
          }
        }
      });
      res.status(200).json({ success: true, data: links });
    } catch (error) {
      logger.error(`Error fetching project flagships: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get all foundational reforms
   */
  async getAllReforms(req, res) {
    try {
      const { status } = req.query;
      const where = {};
      if (status) where.status = status;

      const reforms = await prisma.foundationalReform.findMany({
        where,
        orderBy: { created_at: 'desc' }
      });

      res.status(200).json({ success: true, data: reforms });
    } catch (error) {
      logger.error(`Error fetching foundational reforms: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get comprehensive integration status
   */
  async getIntegrationStatus(req, res) {
    try {
      const [objectives, projects, mappings, indicators, reforms] = await Promise.all([
        prisma.strategicObjectiveDira.count({ where: { status: 'active' } }),
        prisma.projectStrategicObjective.count(),
        prisma.activityIndicatorMapping.count({ where: { enabled: true } }),
        prisma.indicator.count({ where: { isActive: true } }),
        prisma.foundationalReform.count({ where: { status: 'active' } })
      ]);

      const recentPerformance = await prisma.performanceData.findMany({
        where: { status: 'validated' },
        orderBy: { created_at: 'desc' },
        take: 100,
        include: { indicator: true }
      });

      const autoCalculatedCount = recentPerformance.filter(
        (p) => p.data_source === 'auto_calculated'
      ).length;

      const pct = recentPerformance.length
        ? ((autoCalculatedCount / recentPerformance.length) * 100).toFixed(2)
        : '0.00';
      const avgConfidence = recentPerformance.length
        ? (
            recentPerformance.reduce((sum, p) => sum + Number(p.confidence_score || 0), 0) /
            recentPerformance.length
          ).toFixed(2)
        : '0.00';

      res.status(200).json({
        success: true,
        data: {
          strategic_objectives: objectives,
          linked_projects: projects,
          activity_indicator_mappings: mappings,
          indicators,
          foundational_reforms: reforms,
          recent_performance_data: recentPerformance.length,
          auto_calculated_percentage: `${pct}%`,
          average_confidence_score: avgConfidence,
          last_calculation: recentPerformance[0]?.created_at || null
        }
      });
    } catch (error) {
      logger.error(`Error fetching integration status: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new StrategicObjectivesController();
