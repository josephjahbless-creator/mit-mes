const prisma = require('../../config/db');

// ── GET /api/period-locks?fiscalYear=2025-2026 ────────────────────────────────
async function list(req, res) {
  const { fiscalYear } = req.query;

  const where = {};
  if (fiscalYear) where.fiscalYear = fiscalYear;

  const locks = await prisma.reportingPeriodLock.findMany({
    where,
    include: {
      lockedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ fiscalYear: 'asc' }, { period: 'asc' }],
  });

  res.json(locks);
}

// ── POST /api/period-locks/lock  { fiscalYear, period, notes } ─────────────────
// Roles: super_admin, me_officer
async function lock(req, res) {
  const { fiscalYear, period, notes } = req.body;

  if (!fiscalYear || typeof fiscalYear !== 'string') {
    return res.status(400).json({ error: 'fiscalYear is required' });
  }
  if (!period) {
    return res.status(400).json({ error: 'period is required' });
  }

  const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
  if (!VALID_PERIODS.includes(period)) {
    return res.status(400).json({ error: 'period must be one of: ' + VALID_PERIODS.join(', ') });
  }

  const result = await prisma.reportingPeriodLock.upsert({
    where: { fiscalYear_period: { fiscalYear, period } },
    update: {
      isLocked:  true,
      lockedById: req.user.id,
      lockedAt:  new Date(),
      notes:     notes || null,
    },
    create: {
      fiscalYear,
      period,
      isLocked:  true,
      lockedById: req.user.id,
      lockedAt:  new Date(),
      notes:     notes || null,
    },
    include: {
      lockedBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.status(200).json(result);
}

// ── POST /api/period-locks/unlock  { fiscalYear, period } ─────────────────────
// Roles: super_admin only
async function unlock(req, res) {
  const { fiscalYear, period } = req.body;

  if (!fiscalYear || typeof fiscalYear !== 'string') {
    return res.status(400).json({ error: 'fiscalYear is required' });
  }
  if (!period) {
    return res.status(400).json({ error: 'period is required' });
  }

  const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
  if (!VALID_PERIODS.includes(period)) {
    return res.status(400).json({ error: 'period must be one of: ' + VALID_PERIODS.join(', ') });
  }

  // Upsert: if the record doesn't exist yet, create it in unlocked state
  const result = await prisma.reportingPeriodLock.upsert({
    where: { fiscalYear_period: { fiscalYear, period } },
    update: {
      isLocked:   false,
      lockedById: null,
      lockedAt:   null,
      // Preserve notes — unlock does not wipe the reason the lock existed
    },
    create: {
      fiscalYear,
      period,
      isLocked:   false,
      lockedById: null,
      lockedAt:   null,
    },
    include: {
      lockedBy: { select: { id: true, name: true, role: true } },
    },
  });

  res.status(200).json(result);
}

// ── GET /api/period-locks/check/:fiscalYear/:period ───────────────────────────
// Returns { isLocked, lockedAt, lockedBy } — used by frontend before submit
async function check(req, res) {
  const { fiscalYear, period } = req.params;

  const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
  if (!VALID_PERIODS.includes(period)) {
    return res.status(400).json({ error: 'period must be one of: ' + VALID_PERIODS.join(', ') });
  }

  const lock = await prisma.reportingPeriodLock.findUnique({
    where: { fiscalYear_period: { fiscalYear, period } },
    include: {
      lockedBy: { select: { id: true, name: true } },
    },
  });

  if (!lock) {
    // No record → not locked
    return res.json({ isLocked: false, lockedAt: null, lockedBy: null });
  }

  res.json({
    isLocked: lock.isLocked,
    lockedAt: lock.lockedAt,
    lockedBy: lock.lockedBy,
    notes:    lock.notes,
  });
}

module.exports = { list, lock, unlock, check };
