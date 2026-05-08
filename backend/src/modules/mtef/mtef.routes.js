const express = require('express');
const prisma   = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

const includeDetails = {
  activity: {
    select: { id: true, name: true,
      output: { select: { name: true, outcome: { select: { name: true, objective: { select: { name: true } } } } } } },
  },
  institution: { select: { id: true, name: true, code: true } },
};

// GET /mtef
router.get('/', async (req, res) => {
  const { institutionId, fiscalYear } = req.query;
  const where = {};
  if (institutionId) where.institutionId = institutionId;
  const budgets = await prisma.mtefBudget.findMany({
    where, include: includeDetails, orderBy: { createdAt: 'desc' },
  });
  res.json(budgets);
});

// GET /mtef/summary
router.get('/summary', async (req, res) => {
  const raw = await prisma.mtefBudget.groupBy({
    by: ['institutionId'],
    _sum: { year1Budget: true, year2Budget: true, year3Budget: true, totalBudget: true },
  });
  const institutions = await prisma.institution.findMany({
    where: { id: { in: raw.map(r => r.institutionId) } },
    select: { id: true, name: true, code: true },
  });
  const instMap = Object.fromEntries(institutions.map(i => [i.id, i]));
  const summary = raw.map(r => ({
    institution:  instMap[r.institutionId],
    year1Total:   r._sum.year1Budget,
    year2Total:   r._sum.year2Budget,
    year3Total:   r._sum.year3Budget,
    grandTotal:   r._sum.totalBudget,
  }));
  res.json(summary);
});

// POST /mtef
router.post('/', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  const { activityId, institutionId, year1, year2, year3,
          year1Budget, year2Budget, year3Budget,
          fundingSource, programCode, subProgramCode, currency, notes } = req.body;
  if (!activityId || !institutionId) {
    return res.status(400).json({ error: 'activityId and institutionId are required' });
  }
  const y1 = parseFloat(year1Budget) || 0;
  const y2 = parseFloat(year2Budget) || 0;
  const y3 = parseFloat(year3Budget) || 0;
  const budget = await prisma.mtefBudget.upsert({
    where: { activityId_institutionId: { activityId, institutionId } },
    create: {
      activityId, institutionId,
      year1: year1 || '2025-2026', year2: year2 || '2026-2027', year3: year3 || '2027-2028',
      year1Budget: y1, year2Budget: y2, year3Budget: y3, totalBudget: y1 + y2 + y3,
      fundingSource, programCode, subProgramCode, currency: currency || 'TZS', notes,
    },
    update: {
      year1: year1 || '2025-2026', year2: year2 || '2026-2027', year3: year3 || '2027-2028',
      year1Budget: y1, year2Budget: y2, year3Budget: y3, totalBudget: y1 + y2 + y3,
      fundingSource, programCode, subProgramCode, currency: currency || 'TZS', notes,
    },
    include: includeDetails,
  });
  res.status(201).json(budget);
});

// PATCH /mtef/:id
router.patch('/:id', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  const data = {};
  const fields = ['year1', 'year2', 'year3', 'year1Budget', 'year2Budget', 'year3Budget',
                  'fundingSource', 'programCode', 'subProgramCode', 'currency', 'notes'];
  fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
  if (data.year1Budget !== undefined || data.year2Budget !== undefined || data.year3Budget !== undefined) {
    const existing = await prisma.mtefBudget.findUnique({ where: { id: req.params.id } });
    const y1 = parseFloat(data.year1Budget ?? existing.year1Budget) || 0;
    const y2 = parseFloat(data.year2Budget ?? existing.year2Budget) || 0;
    const y3 = parseFloat(data.year3Budget ?? existing.year3Budget) || 0;
    data.totalBudget = y1 + y2 + y3;
  }
  const budget = await prisma.mtefBudget.update({
    where: { id: req.params.id }, data, include: includeDetails,
  });
  res.json(budget);
});

// DELETE /mtef/:id
router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  await prisma.mtefBudget.delete({ where: { id: req.params.id } });
  res.json({ message: 'MTEF budget entry deleted' });
});

module.exports = router;
