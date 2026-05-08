const prisma = require('../../config/db');

async function get(req, res) {
  const { level, referenceId } = req.params;
  const toc = await prisma.theoryOfChange.findUnique({
    where: { level_referenceId: { level, referenceId } },
    include: {
      assumptions: { orderBy: { orderNo: 'asc' } },
      risks:       { orderBy: { orderNo: 'asc' } },
      createdBy:   { select: { id: true, name: true } },
    },
  });
  res.json(toc || { level, referenceId, narrative: null, assumptions: [], risks: [] });
}

async function upsert(req, res) {
  const { level, referenceId, narrative } = req.body;
  if (!level || !referenceId) return res.status(400).json({ error: 'level and referenceId required' });
  const toc = await prisma.theoryOfChange.upsert({
    where:  { level_referenceId: { level, referenceId } },
    update: { narrative, createdById: req.user.id },
    create: { level, referenceId, narrative, createdById: req.user.id },
    include: { assumptions: true, risks: true },
  });
  res.json(toc);
}

async function addAssumption(req, res) {
  const { text, category, orderNo } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const count = await prisma.toCAssumption.count({ where: { tocId: req.params.tocId } });
  const row = await prisma.toCAssumption.create({
    data: { tocId: req.params.tocId, text, category: category || null, orderNo: orderNo ?? count },
  });
  res.status(201).json(row);
}

async function updateAssumption(req, res) {
  const row = await prisma.toCAssumption.update({
    where: { id: req.params.id },
    data:  { text: req.body.text, category: req.body.category, orderNo: req.body.orderNo },
  });
  res.json(row);
}

async function deleteAssumption(req, res) {
  await prisma.toCAssumption.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

async function addRisk(req, res) {
  const { title, description, likelihood, impact, mitigation, orderNo } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const count = await prisma.toCRisk.count({ where: { tocId: req.params.tocId } });
  const row = await prisma.toCRisk.create({
    data: {
      tocId: req.params.tocId, title,
      description: description || null,
      likelihood: likelihood || null,
      impact:     impact     || null,
      mitigation: mitigation || null,
      orderNo: orderNo ?? count,
    },
  });
  res.status(201).json(row);
}

async function updateRisk(req, res) {
  const row = await prisma.toCRisk.update({
    where: { id: req.params.id },
    data:  {
      title: req.body.title, description: req.body.description,
      likelihood: req.body.likelihood, impact: req.body.impact,
      mitigation: req.body.mitigation, orderNo: req.body.orderNo,
    },
  });
  res.json(row);
}

async function deleteRisk(req, res) {
  await prisma.toCRisk.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

async function listAll(req, res) {
  // Return all ToC entries for an overview
  const items = await prisma.theoryOfChange.findMany({
    include: {
      _count: { select: { assumptions: true, risks: true } },
    },
    orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(items);
}

module.exports = {
  get, upsert, listAll,
  addAssumption, updateAssumption, deleteAssumption,
  addRisk, updateRisk, deleteRisk,
};
