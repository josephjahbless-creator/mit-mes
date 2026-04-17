const prisma = require('../../config/db');

// ── Helper: build full framework tree snapshot ─────────────────────────────────
async function buildFrameworkSnapshot(fiscalYear) {
  const objectives = await prisma.strategicObjective.findMany({
    orderBy: { orderNo: 'asc' },
    include: {
      outcomes: {
        orderBy: { orderNo: 'asc' },
        include: {
          outputs: {
            orderBy: { orderNo: 'asc' },
            include: {
              activities:  { orderBy: { orderNo: 'asc' } },
              indicators:  { orderBy: { code: 'asc' } },
            },
          },
        },
      },
    },
  });
  return { fiscalYear, capturedAt: new Date(), objectives };
}

// ── GET /api/framework-versions?fiscalYear= ────────────────────────────────────
async function list(req, res) {
  const where = {};
  if (req.query.fiscalYear) where.fiscalYear = req.query.fiscalYear;

  const versions = await prisma.frameworkVersion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy:  { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(versions);
}

// ── POST /api/framework-versions ──────────────────────────────────────────────
async function create(req, res) {
  const { fiscalYear, versionLabel, description } = req.body;

  if (!fiscalYear)    return res.status(400).json({ error: 'fiscalYear is required' });
  if (!versionLabel)  return res.status(400).json({ error: 'versionLabel is required' });

  const snapshot = await buildFrameworkSnapshot(fiscalYear);

  const version = await prisma.frameworkVersion.create({
    data: {
      fiscalYear,
      versionLabel,
      description: description || null,
      snapshot,
      createdById: req.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(version);
}

// ── POST /api/framework-versions/:id/approve ──────────────────────────────────
async function approve(req, res) {
  const existing = await prisma.frameworkVersion.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ error: 'Framework version not found' });
  if (existing.isActive) return res.status(400).json({ error: 'Version is already active' });

  // Deactivate all other versions for same fiscal year, then activate this one
  await prisma.$transaction([
    prisma.frameworkVersion.updateMany({
      where: { fiscalYear: existing.fiscalYear, id: { not: existing.id } },
      data:  { isActive: false },
    }),
    prisma.frameworkVersion.update({
      where: { id: existing.id },
      data:  {
        isActive:    true,
        approvedById: req.user.id,
        approvedAt:  new Date(),
      },
    }),
  ]);

  const updated = await prisma.frameworkVersion.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy:  { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(updated);
}

// ── GET /api/framework-versions/:id/snapshot ──────────────────────────────────
async function getSnapshot(req, res) {
  const version = await prisma.frameworkVersion.findUnique({
    where: { id: req.params.id },
    select: {
      id:           true,
      versionLabel: true,
      fiscalYear:   true,
      isActive:     true,
      snapshot:     true,
      createdAt:    true,
    },
  });
  if (!version) return res.status(404).json({ error: 'Framework version not found' });
  res.json(version.snapshot);
}

module.exports = { list, create, approve, getSnapshot };
