const prisma = require('../../config/db');

function institutionFilter(req, query = {}) {
  if (req.user.role !== 'super_admin' && req.user.role !== 'me_officer') {
    query.institutionId = req.user.institutionId;
  } else if (req.query.institutionId) {
    query.institutionId = req.query.institutionId;
  }
  return query;
}

async function listPlans(req, res) {
  const where = institutionFilter(req, {});
  if (req.query.fiscalYear) where.fiscalYear = req.query.fiscalYear;

  const plans = await prisma.budgetPlan.findMany({
    where,
    include: {
      activity: { include: { output: { select: { id: true, name: true } } } },
      institution: { select: { id: true, name: true, code: true } },
      expenditures: { select: { id: true, amount: true, period: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = plans.map(p => {
    const totalSpent = p.expenditures
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    return { ...p, totalSpent, variance: p.totalBudget - totalSpent, absorptionRate: p.totalBudget > 0 ? (totalSpent / p.totalBudget) * 100 : 0 };
  });
  res.json(result);
}

async function getPlan(req, res) {
  const plan = await prisma.budgetPlan.findUnique({
    where: { id: req.params.id },
    include: {
      activity: { include: { output: { include: { outcome: { include: { objective: true } } } } } },
      institution: true,
      expenditures: { include: { submittedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
}

async function createPlan(req, res) {
  const { activityId, institutionId, fiscalYear, q1Budget, q2Budget, q3Budget, q4Budget, fundingSource, currency } = req.body;
  if (!activityId) return res.status(400).json({ error: 'activityId is required' });
  if (!fiscalYear) return res.status(400).json({ error: 'fiscalYear is required' });
  const targetInstitutionId = req.user.role === 'admin' ? req.user.institutionId : institutionId;
  const total = (q1Budget || 0) + (q2Budget || 0) + (q3Budget || 0) + (q4Budget || 0);

  try {
    const plan = await prisma.budgetPlan.upsert({
      where: { activityId_institutionId_fiscalYear: { activityId, institutionId: targetInstitutionId, fiscalYear } },
      update: { q1Budget, q2Budget, q3Budget, q4Budget, totalBudget: total, fundingSource, currency },
      create: { activityId, institutionId: targetInstitutionId, fiscalYear, q1Budget, q2Budget, q3Budget, q4Budget, totalBudget: total, fundingSource, currency },
    });
    res.status(201).json(plan);
  } catch (e) { throw e; }
}

async function updatePlan(req, res) {
  const { q1Budget, q2Budget, q3Budget, q4Budget, fundingSource, currency } = req.body;

  // admin role can only edit their own institution's plans
  if (req.user.role === 'admin') {
    const existing = await prisma.budgetPlan.findUnique({
      where: { id: req.params.id },
      select: { institutionId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Budget plan not found' });
    if (existing.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'You can only edit your own institution\'s budget plans' });
    }
  }

  const total = (q1Budget || 0) + (q2Budget || 0) + (q3Budget || 0) + (q4Budget || 0);
  const plan = await prisma.budgetPlan.update({
    where: { id: req.params.id },
    data: { q1Budget, q2Budget, q3Budget, q4Budget, totalBudget: total, fundingSource, currency },
  });
  res.json(plan);
}

async function listExpenditures(req, res) {
  const where = institutionFilter(req, {});
  if (req.query.budgetPlanId) where.budgetPlanId = req.query.budgetPlanId;
  if (req.query.period) where.period = req.query.period;
  if (req.query.status) where.status = req.query.status;

  const expenditures = await prisma.expenditure.findMany({
    where,
    include: {
      budgetPlan: { include: { activity: { select: { id: true, name: true } } } },
      institution: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(expenditures);
}

async function createExpenditure(req, res) {
  const { budgetPlanId, period, amount, description, evidenceUrl } = req.body;
  const plan = await prisma.budgetPlan.findUnique({ where: { id: budgetPlanId } });
  if (!plan) return res.status(404).json({ error: 'Budget plan not found' });

  const targetInstitutionId = req.user.role === 'data_collector' || req.user.role === 'admin'
    ? req.user.institutionId : plan.institutionId;

  const exp = await prisma.expenditure.create({
    data: { budgetPlanId, institutionId: targetInstitutionId, period, amount, description, evidenceUrl, submittedById: req.user.id, status: 'submitted' },
  });
  res.status(201).json(exp);
}

async function approveExpenditure(req, res) {
  // admin role scoped to own institution; super_admin/me_officer can approve any
  if (req.user.role === 'admin') {
    const existing = await prisma.expenditure.findUnique({
      where: { id: req.params.id },
      select: { institutionId: true },
    });
    if (!existing) return res.status(404).json({ error: 'Expenditure not found' });
    if (existing.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'You can only approve your own institution\'s expenditures' });
    }
  }
  const exp = await prisma.expenditure.update({
    where: { id: req.params.id },
    data: { status: 'approved', approvedById: req.user.id, approvedAt: new Date() },
  });
  res.json(exp);
}

async function summary(req, res) {
  const where = institutionFilter(req, {});
  if (req.query.fiscalYear) where.fiscalYear = req.query.fiscalYear;

  const plans = await prisma.budgetPlan.findMany({
    where,
    include: { expenditures: { where: { status: 'approved' } } },
  });

  const totalBudget = plans.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = plans.reduce((s, p) => s + p.expenditures.reduce((e, ex) => e + ex.amount, 0), 0);
  const variance = totalBudget - totalSpent;
  const absorptionRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  res.json({ totalBudget, totalSpent, variance, absorptionRate: Math.round(absorptionRate * 100) / 100 });
}

module.exports = { listPlans, getPlan, createPlan, updatePlan, listExpenditures, createExpenditure, approveExpenditure, summary };
