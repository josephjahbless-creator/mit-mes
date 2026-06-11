/**
 * Progress Snapshot Service (Dira ya Taifa 2050).
 *
 * Writes point-in-time progress rows so flagship & project dashboards can show
 * trend lines over time:
 *   - project_progress_snapshots      (one row per project)
 *   - strategic_objective_progress    (one row per flagship, rolled up from its projects)
 *
 * Intended to run nightly via cron, but also callable on-demand.
 */

const prisma = require('../config/db');
const logger = require('../utils/logger');

function clampPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Compute a single project's completion from its activities & milestones.
 */
function computeProjectCompletion(project) {
  const acts = project.activities || [];
  const miles = project.milestones || [];

  const actTotal = acts.length;
  const actDone = acts.filter((a) => a.isCompleted).length;
  const mileTotal = miles.length;
  const mileDone = miles.filter((m) => m.status === 'completed').length;

  let completion;
  if (project.status === 'completed') {
    completion = 100;
  } else if (actTotal + mileTotal === 0) {
    completion = project.status === 'ongoing' ? 10 : 0; // minimal credit for started work
  } else {
    completion = ((actDone + mileDone) / (actTotal + mileTotal)) * 100;
  }

  // Determine status vs. timeline
  let status = 'in_progress';
  const now = new Date();
  const end = project.endDate ? new Date(project.endDate) : null;
  if (project.status === 'completed') status = 'on_schedule';
  else if (project.status === 'delayed') status = 'delayed';
  else if (end && now > end && completion < 100) status = 'delayed';
  else if (completion >= 70) status = 'on_schedule';
  else if (completion >= 40) status = 'tracking';
  else status = 'at_risk';

  return {
    completion: clampPct(completion),
    status,
    activities_total: actTotal,
    activities_completed: actDone,
  };
}

/**
 * Snapshot every project. Returns a map of projectId → latest computed snapshot.
 */
async function snapshotProjects() {
  const projects = await prisma.project.findMany({
    include: {
      activities: { select: { isCompleted: true } },
      milestones: { select: { status: true } },
    },
  });

  const byId = {};
  for (const project of projects) {
    const c = computeProjectCompletion(project);
    byId[project.id] = c;
    await prisma.projectProgressSnapshot.create({
      data: {
        project_id: project.id,
        overall_completion_percentage: c.completion,
        status: c.status,
        activities_completed: c.activities_completed,
        activities_total: c.activities_total,
        indicators_on_track: 0,
        indicators_total: 0,
        forecasted_completion_date: project.endDate || null,
      },
    });
  }
  return { count: projects.length, byId };
}

/**
 * Snapshot every flagship, rolling up from its linked projects.
 */
async function snapshotObjectives(projectSnapshots = {}) {
  const objectives = await prisma.strategicObjectiveDira.findMany({
    where: { status: 'active' },
    include: { projectObjectives: true },
  });

  let count = 0;
  for (const obj of objectives) {
    const links = obj.projectObjectives || [];
    let weightedSum = 0;
    let weightTotal = 0;
    let active = 0;
    let atRisk = 0;
    let completedProjects = 0;

    for (const link of links) {
      const snap = projectSnapshots[link.projectId];
      if (!snap) continue;
      const w = Number(link.weighting) || 100;
      weightedSum += snap.completion * w;
      weightTotal += w;
      if (snap.status === 'delayed' || snap.status === 'at_risk') atRisk++;
      else active++;
      if (snap.completion >= 100) completedProjects++;
    }

    const achievement = weightTotal > 0 ? clampPct(weightedSum / weightTotal) : 0;

    let status = 'on_track';
    if (links.length > 0 && completedProjects === links.length) status = 'completed';
    else if (achievement >= 60) status = 'on_track';
    else if (achievement >= 30) status = 'at_risk';
    else if (links.length > 0) status = 'off_track';
    else status = 'on_track'; // no projects yet → not penalised

    await prisma.strategicObjectiveProgress.create({
      data: {
        strategic_objective_id: obj.id,
        overall_achievement_percentage: achievement,
        status,
        projects_active: active,
        projects_on_track: active,
        projects_at_risk: atRisk,
        key_indicators_achieved: 0,
        key_indicators_total: 0,
        flagged_risks: [],
      },
    });
    count++;
  }
  return { count };
}

/**
 * Run a full snapshot pass (projects then objectives).
 */
async function runSnapshot() {
  const started = Date.now();
  const projects = await snapshotProjects();
  const objectives = await snapshotObjectives(projects.byId);
  const ms = Date.now() - started;
  logger.info(`[ProgressSnapshot] Wrote ${projects.count} project + ${objectives.count} objective snapshot(s) in ${ms}ms`);
  return { projects: projects.count, objectives: objectives.count, ms };
}

module.exports = { runSnapshot, snapshotProjects, snapshotObjectives, computeProjectCompletion };
