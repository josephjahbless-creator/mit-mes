const prisma = require('../../config/db');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');

const PROJECT_INCLUDE = {
  institution: { select: { id: true, name: true, code: true } },
  department:  { select: { id: true, name: true, code: true } },
  unit:        { select: { id: true, name: true, code: true } },
  milestones:  { orderBy: { orderNo: 'asc' } },
  activities:  { orderBy: { orderNo: 'asc' } },
  expenditures:{ orderBy: { date: 'desc' } },
};

// ── Sustainability engine ─────────────────────────────────────────────────────
function computeSustainability(project) {
  const totalBudget   = project.totalBudget || 0;
  const totalSpent    = project.expenditures.reduce((s, e) => s + e.amount, 0);
  const milestones    = project.milestones;
  const activities    = project.activities;

  // Time elapsed %
  let timeElapsed = 0;
  if (project.startDate && project.endDate) {
    const total = new Date(project.endDate) - new Date(project.startDate);
    const elapsed = Date.now() - new Date(project.startDate);
    timeElapsed = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  // Budget utilisation %
  const budgetUtil = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  // Milestone completion %
  const milestoneTotal     = milestones.length;
  const milestonesComplete = milestones.filter(m => m.status === 'completed').length;
  const milestonePct       = milestoneTotal > 0 ? Math.round((milestonesComplete / milestoneTotal) * 100) : 0;

  // Activity completion %
  const actTotal     = activities.length;
  const actComplete  = activities.filter(a => a.isCompleted).length;
  const actPct       = actTotal > 0 ? Math.round((actComplete / actTotal) * 100) : 0;

  // Overall progress (weighted average)
  const progressPct = Math.round(
    (milestonePct * 0.4) + (actPct * 0.35) + (budgetUtil * 0.25)
  );

  // Sustainability dimensions (0–100 each)
  const financial     = budgetUtil >= 10 && budgetUtil <= 95 ? 80 : budgetUtil > 95 ? 40 : 30;
  const operational   = actPct;
  const institutional = milestonePct;
  const environmental = 70; // static until env data is added
  const sustainScore  = Math.round((financial + operational + institutional + environmental) / 4);

  // Weakness detection
  const issues = [];
  const recommendations = [];

  // Delayed milestones
  const delayedMs = milestones.filter(m =>
    m.status !== 'completed' && m.dueDate && new Date(m.dueDate) < new Date()
  );
  if (delayedMs.length > 0) {
    const days = Math.round((Date.now() - new Date(delayedMs[0].dueDate)) / 86400000);
    issues.push(`${delayedMs.length} milestone(s) overdue — ${delayedMs[0].title} delayed by ${days} day(s)`);
    recommendations.push('Conduct urgent milestone review and update timeline');
  }

  // Budget under-utilisation vs time
  if (timeElapsed > 50 && budgetUtil < timeElapsed - 20) {
    issues.push(`Only ${budgetUtil}% budget utilised while ${timeElapsed}% of project timeline has elapsed`);
    recommendations.push('Accelerate procurement and payment processing');
  }

  // Over-expenditure risk
  if (budgetUtil > 90 && progressPct < 70) {
    issues.push(`Over-expenditure risk: ${budgetUtil}% budget used but only ${progressPct}% progress achieved`);
    recommendations.push('Reallocate resources and conduct financial review immediately');
  }

  // Low activity completion
  if (actTotal > 0 && actPct < 40 && timeElapsed > 40) {
    issues.push(`Activity completion rate is low (${actPct}%) relative to elapsed time (${timeElapsed}%)`);
    recommendations.push('Increase monitoring frequency and assign clear activity owners');
  }

  // No expenditure recorded
  if (totalBudget > 0 && totalSpent === 0 && project.status === 'ongoing') {
    issues.push('No expenditure recorded for an ongoing project');
    recommendations.push('Ensure financial records are up to date');
  }

  if (recommendations.length === 0 && progressPct >= 0) {
    recommendations.push('Continue regular monitoring and maintain current implementation pace');
  }

  return {
    totalSpent,
    remainingBalance: totalBudget - totalSpent,
    budgetUtil,
    timeElapsed,
    progressPct,
    milestonePct,
    actPct,
    sustainScore,
    sustainRating: sustainScore >= 70 ? 'strong' : sustainScore >= 40 ? 'moderate' : 'weak',
    dimensions: { financial, operational, institutional, environmental },
    issues,
    recommendations,
  };
}

// ── Scope filter ──────────────────────────────────────────────────────────────
function scopeWhere(user) {
  if (['super_admin', 'me_officer'].includes(user.role)) return {};
  return {
    OR: [
      { institutionId: user.institutionId },
      // dept/unit scope could be added when user has departmentId
    ],
  };
}

// ── List projects ─────────────────────────────────────────────────────────────
async function listProjects(req, res) {
  const { status, institutionId, fiscalYear, search } = req.query;
  const where = {
    ...scopeWhere(req.user),
    ...(status ? { status } : {}),
    ...(institutionId ? { institutionId } : {}),
    ...(fiscalYear ? { fiscalYear } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    include: {
      ...PROJECT_INCLUDE,
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = projects.map(p => {
    const metrics = computeSustainability(p);
    return { ...p, metrics };
  });

  res.json(result);
}

// ── Get single project ────────────────────────────────────────────────────────
async function getProject(req, res) {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ...scopeWhere(req.user) },
    include: PROJECT_INCLUDE,
  });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json({ ...project, metrics: computeSustainability(project) });
}

// ── Create project ────────────────────────────────────────────────────────────
async function createProject(req, res) {
  const { name, code, goal, description, institutionId, departmentId, unitId,
          status, startDate, endDate, totalBudget, fiscalYear, fundingSource } = req.body;
  const project = await prisma.project.create({
    data: {
      name, code: code || null, goal: goal || null, description: description || null,
      institutionId: institutionId || null, departmentId: departmentId || null, unitId: unitId || null,
      status: status || 'planned',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalBudget: parseFloat(totalBudget) || 0,
      fiscalYear: fiscalYear || getCurrentFiscalYear(),
      fundingSource: fundingSource || null,
      createdById: req.user.id,
    },
    include: PROJECT_INCLUDE,
  });
  res.status(201).json({ ...project, metrics: computeSustainability(project) });
}

// ── Update project ────────────────────────────────────────────────────────────
async function updateProject(req, res) {
  const { name, code, goal, description, institutionId, departmentId, unitId,
          status, startDate, endDate, totalBudget, fiscalYear, fundingSource } = req.body;
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code: code || null } : {}),
      ...(goal !== undefined ? { goal: goal || null } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(institutionId !== undefined ? { institutionId: institutionId || null } : {}),
      ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
      ...(unitId !== undefined ? { unitId: unitId || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(totalBudget !== undefined ? { totalBudget: parseFloat(totalBudget) || 0 } : {}),
      ...(fiscalYear !== undefined ? { fiscalYear } : {}),
      ...(fundingSource !== undefined ? { fundingSource: fundingSource || null } : {}),
    },
    include: PROJECT_INCLUDE,
  });
  res.json({ ...project, metrics: computeSustainability(project) });
}

// ── Delete project ────────────────────────────────────────────────────────────
async function deleteProject(req, res) {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── Milestones ────────────────────────────────────────────────────────────────
async function createMilestone(req, res) {
  const { title, description, dueDate, status, orderNo } = req.body;
  const m = await prisma.projectMilestone.create({
    data: {
      projectId: req.params.id, title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || 'not_started',
      orderNo: parseInt(orderNo) || 0,
    },
  });
  res.status(201).json(m);
}

async function updateMilestone(req, res) {
  const { title, description, dueDate, status, orderNo, completedAt } = req.body;
  const m = await prisma.projectMilestone.update({
    where: { id: req.params.milestoneId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(orderNo !== undefined ? { orderNo: parseInt(orderNo) } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    },
  });
  res.json(m);
}

async function deleteMilestone(req, res) {
  await prisma.projectMilestone.delete({ where: { id: req.params.milestoneId } });
  res.status(204).end();
}

// ── Activities ────────────────────────────────────────────────────────────────
async function createProjectActivity(req, res) {
  const { name, description, responsible, dueDate, isCompleted, orderNo } = req.body;
  const a = await prisma.projectActivity.create({
    data: {
      projectId: req.params.id, name,
      description: description || null,
      responsible: responsible || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      isCompleted: !!isCompleted,
      orderNo: parseInt(orderNo) || 0,
    },
  });
  res.status(201).json(a);
}

async function updateProjectActivity(req, res) {
  const { name, description, responsible, dueDate, isCompleted, orderNo } = req.body;
  const a = await prisma.projectActivity.update({
    where: { id: req.params.activityId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(responsible !== undefined ? { responsible: responsible || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(isCompleted !== undefined ? {
        isCompleted: !!isCompleted,
        completedAt: isCompleted ? new Date() : null,
      } : {}),
      ...(orderNo !== undefined ? { orderNo: parseInt(orderNo) } : {}),
    },
  });
  res.json(a);
}

async function deleteProjectActivity(req, res) {
  await prisma.projectActivity.delete({ where: { id: req.params.activityId } });
  res.status(204).end();
}

// ── Expenditures ──────────────────────────────────────────────────────────────
async function createProjectExpenditure(req, res) {
  const { amount, description, period, date } = req.body;
  const e = await prisma.projectExpenditure.create({
    data: {
      projectId: req.params.id,
      amount: parseFloat(amount) || 0,
      description: description || null,
      period: period || null,
      date: date ? new Date(date) : new Date(),
    },
  });
  res.status(201).json(e);
}

async function updateProjectExpenditure(req, res) {
  const { amount, description, period, date } = req.body;
  const e = await prisma.projectExpenditure.update({
    where: { id: req.params.expenditureId },
    data: {
      ...(amount !== undefined ? { amount: parseFloat(amount) || 0 } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(period !== undefined ? { period: period || null } : {}),
      ...(date !== undefined ? { date: date ? new Date(date) : new Date() } : {}),
    },
  });
  res.json(e);
}

async function deleteProjectExpenditure(req, res) {
  await prisma.projectExpenditure.delete({ where: { id: req.params.expenditureId } });
  res.status(204).end();
}

module.exports = {
  listProjects, getProject, createProject, updateProject, deleteProject,
  createMilestone, updateMilestone, deleteMilestone,
  createProjectActivity, updateProjectActivity, deleteProjectActivity,
  createProjectExpenditure, updateProjectExpenditure, deleteProjectExpenditure,
};
