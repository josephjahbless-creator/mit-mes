const prisma = require('../../config/db');

async function list(req, res) {
  const items = await prisma.disaggregation.findMany({
    where: { isActive: true },
    include: { options: { where: { isActive: true }, orderBy: { orderNo: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json(items);
}

async function getOne(req, res) {
  const item = await prisma.disaggregation.findUnique({
    where: { id: req.params.id },
    include: { options: { orderBy: { orderNo: 'asc' } } },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
}

async function create(req, res) {
  const { name, description, isGlobal, isRequired, options = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const disagg = await prisma.disaggregation.create({
    data: {
      name, description, isGlobal: isGlobal !== false, isRequired: !!isRequired,
      options: {
        create: options.map((o, i) => ({
          label: o.label, code: o.code || null, orderNo: o.orderNo ?? i,
        })),
      },
    },
    include: { options: { orderBy: { orderNo: 'asc' } } },
  });
  res.status(201).json(disagg);
}

async function update(req, res) {
  const { name, description, isGlobal, isRequired, isActive } = req.body;
  const item = await prisma.disaggregation.update({
    where: { id: req.params.id },
    data: { name, description, isGlobal, isRequired, isActive },
    include: { options: true },
  });
  res.json(item);
}

async function remove(req, res) {
  await prisma.disaggregation.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

async function listOptions(req, res) {
  const options = await prisma.disaggregationOption.findMany({
    where: { disaggregationId: req.params.id },
    orderBy: { orderNo: 'asc' },
  });
  res.json(options);
}

async function addOption(req, res) {
  const { label, code, orderNo } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  const count = await prisma.disaggregationOption.count({ where: { disaggregationId: req.params.id } });
  const option = await prisma.disaggregationOption.create({
    data: { disaggregationId: req.params.id, label, code: code || null, orderNo: orderNo ?? count },
  });
  res.status(201).json(option);
}

async function updateOption(req, res) {
  const { label, code, orderNo, isActive } = req.body;
  const option = await prisma.disaggregationOption.update({
    where: { id: req.params.optId },
    data: { label, code, orderNo, isActive },
  });
  res.json(option);
}

async function removeOption(req, res) {
  await prisma.disaggregationOption.delete({ where: { id: req.params.optId } });
  res.json({ message: 'Deleted' });
}

async function getActualDisagg(req, res) {
  const rows = await prisma.actualDisaggregation.findMany({
    where: { actualId: req.params.actualId },
    include: {
      disaggregation: { select: { id: true, name: true } },
      option:         { select: { id: true, label: true, code: true } },
    },
  });
  res.json(rows);
}

async function saveActualDisagg(req, res) {
  const { disaggregationId, optionId, value, indicatorId } = req.body;
  if (!disaggregationId || !optionId) return res.status(400).json({ error: 'disaggregationId and optionId required' });
  if (!indicatorId) return res.status(400).json({ error: 'indicatorId required' });

  const row = await prisma.actualDisaggregation.upsert({
    where: { actualId_disaggregationId_optionId: { actualId: req.params.actualId, disaggregationId, optionId } },
    update: { value: value !== undefined ? Number(value) : null },
    create: {
      actualId: req.params.actualId, indicatorId,
      disaggregationId, optionId,
      value: value !== undefined ? Number(value) : null,
    },
  });
  res.json(row);
}

async function bulkSaveActualDisagg(req, res) {
  // body: { indicatorId, entries: [{ disaggregationId, optionId, value }] }
  const { indicatorId, entries = [] } = req.body;
  if (!indicatorId) return res.status(400).json({ error: 'indicatorId required' });
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array' });

  const results = [];
  for (const e of entries) {
    const row = await prisma.actualDisaggregation.upsert({
      where: { actualId_disaggregationId_optionId: { actualId: req.params.actualId, disaggregationId: e.disaggregationId, optionId: e.optionId } },
      update: { value: e.value !== undefined ? Number(e.value) : null },
      create: { actualId: req.params.actualId, indicatorId, disaggregationId: e.disaggregationId, optionId: e.optionId, value: e.value !== undefined ? Number(e.value) : null },
    });
    results.push(row);
  }
  res.json(results);
}

module.exports = {
  list, getOne, create, update, remove,
  listOptions, addOption, updateOption, removeOption,
  getActualDisagg, saveActualDisagg, bulkSaveActualDisagg,
};
