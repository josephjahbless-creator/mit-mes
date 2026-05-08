const express = require('express');
const prisma   = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /custom-forms
router.get('/', async (req, res) => {
  const forms = await prisma.customForm.findMany({
    where:   { isActive: true },
    include: { createdBy: { select: { name: true } }, _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(forms);
});

// POST /custom-forms
router.post('/', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  const { name, description, schema, indicatorId } = req.body;
  if (!name || !schema) return res.status(400).json({ error: 'name and schema are required' });
  const form = await prisma.customForm.create({
    data: { name, description, schema, indicatorId: indicatorId || null, createdById: req.user.id },
  });
  res.status(201).json(form);
});

// GET /custom-forms/:id
router.get('/:id', async (req, res) => {
  const form = await prisma.customForm.findUnique({
    where:   { id: req.params.id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json(form);
});

// PATCH /custom-forms/:id
router.patch('/:id', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  const { name, description, schema, isActive } = req.body;
  const data = {};
  if (name        != null) { data.name        = name;        data.version = { increment: 1 }; }
  if (description != null)  data.description  = description;
  if (schema      != null) { data.schema      = schema;      data.version = { increment: 1 }; }
  if (isActive    != null)  data.isActive     = isActive;
  const form = await prisma.customForm.update({ where: { id: req.params.id }, data });
  res.json(form);
});

// DELETE /custom-forms/:id (soft delete)
router.delete('/:id', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  await prisma.customForm.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Form deactivated' });
});

// POST /custom-forms/:id/submit
router.post('/:id/submit', async (req, res) => {
  const form = await prisma.customForm.findUnique({ where: { id: req.params.id } });
  if (!form || !form.isActive) return res.status(404).json({ error: 'Form not found or inactive' });

  const { data, period, fiscalYear, latitude, longitude } = req.body;
  if (!data) return res.status(400).json({ error: 'data is required' });

  const response = await prisma.customFormResponse.create({
    data: {
      formId:        form.id,
      submittedById: req.user.id,
      institutionId: req.user.institutionId || null,
      data,
      period:    period    || null,
      fiscalYear: fiscalYear || null,
      latitude:  latitude  || null,
      longitude: longitude || null,
      status:    'submitted',
    },
  });
  res.status(201).json(response);
});

// GET /custom-forms/:id/responses
router.get('/:id/responses', authorize('super_admin', 'admin', 'me_officer'), async (req, res) => {
  const responses = await prisma.customFormResponse.findMany({
    where:   { formId: req.params.id },
    include: {
      submittedBy: { select: { name: true } },
      institution: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(responses);
});

module.exports = router;
