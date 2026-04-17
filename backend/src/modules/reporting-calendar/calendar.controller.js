const prisma = require('../../config/db');

const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

// ── Compute derived fields for a calendar entry ───────────────────────────────
function enrichEntry(entry, now) {
  const deadline = new Date(entry.deadline);
  const startDate = new Date(entry.startDate);
  const daysUntilDeadline = Math.ceil((deadline - now) / 86400000);

  let status;
  if (!entry.isActive) {
    status = 'closed';
  } else if (startDate > now) {
    status = 'upcoming';
  } else if (deadline >= now) {
    status = 'open';
  } else {
    status = 'overdue';
  }

  // isLate: deadline has passed and the period is not locked
  const isLate = deadline < now && !(entry.periodLock?.isLocked);

  return {
    ...entry,
    isLate,
    daysUntilDeadline,
    status,
  };
}

// ── GET /api/calendar?fiscalYear=2025-2026 ─────────────────────────────────────
async function list(req, res) {
  const { fiscalYear } = req.query;

  const where = {};
  if (fiscalYear) where.fiscalYear = fiscalYear;

  const entries = await prisma.reportingCalendar.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      // Fetch the matching period lock so we can compute isLate accurately
      // We use a raw approach because prisma doesn't allow joining on non-FK fields.
      // We'll augment after fetching.
    },
    orderBy: [{ fiscalYear: 'asc' }, { period: 'asc' }],
  });

  // Fetch period locks for the same fiscal years to join manually
  const fiscalYears = [...new Set(entries.map(e => e.fiscalYear))];
  const locks = fiscalYears.length > 0
    ? await prisma.reportingPeriodLock.findMany({
        where: { fiscalYear: { in: fiscalYears } },
        select: { fiscalYear: true, period: true, isLocked: true },
      })
    : [];

  const lockMap = {};
  for (const l of locks) {
    lockMap[`${l.fiscalYear}__${l.period}`] = l;
  }

  const now = new Date();
  const enriched = entries.map(entry => {
    const lock = lockMap[`${entry.fiscalYear}__${entry.period}`] || null;
    return enrichEntry({ ...entry, periodLock: lock }, now);
  });

  res.json(enriched);
}

// ── POST /api/calendar  { fiscalYear, period, startDate, deadline, reminderDays, description } ─
// Upserts on fiscalYear + period
async function create(req, res) {
  const { fiscalYear, period, startDate, deadline, reminderDays, description } = req.body;

  if (!fiscalYear || typeof fiscalYear !== 'string') {
    return res.status(400).json({ error: 'fiscalYear is required' });
  }
  if (!period || !VALID_PERIODS.includes(period)) {
    return res.status(400).json({ error: 'period must be one of: ' + VALID_PERIODS.join(', ') });
  }
  if (!startDate) {
    return res.status(400).json({ error: 'startDate is required' });
  }
  if (!deadline) {
    return res.status(400).json({ error: 'deadline is required' });
  }

  const parsedStart    = new Date(startDate);
  const parsedDeadline = new Date(deadline);

  if (isNaN(parsedStart.getTime())) {
    return res.status(400).json({ error: 'startDate is not a valid date' });
  }
  if (isNaN(parsedDeadline.getTime())) {
    return res.status(400).json({ error: 'deadline is not a valid date' });
  }
  if (parsedDeadline <= parsedStart) {
    return res.status(400).json({ error: 'deadline must be after startDate' });
  }

  const entry = await prisma.reportingCalendar.upsert({
    where: { fiscalYear_period: { fiscalYear, period } },
    update: {
      startDate:    parsedStart,
      deadline:     parsedDeadline,
      reminderDays: reminderDays != null ? Number(reminderDays) : undefined,
      description:  description  !== undefined ? description : undefined,
    },
    create: {
      fiscalYear,
      period,
      startDate:    parsedStart,
      deadline:     parsedDeadline,
      reminderDays: reminderDays != null ? Number(reminderDays) : 7,
      description:  description || null,
      createdById:  req.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Fetch matching lock for enrichment
  const lock = await prisma.reportingPeriodLock.findUnique({
    where: { fiscalYear_period: { fiscalYear, period } },
    select: { isLocked: true },
  });

  const now = new Date();
  res.status(201).json(enrichEntry({ ...entry, periodLock: lock }, now));
}

// ── PATCH /api/calendar/:id  { startDate, deadline, reminderDays, description, isActive } ─
async function update(req, res) {
  const { startDate, deadline, reminderDays, description, isActive } = req.body;

  const existing = await prisma.reportingCalendar.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const data = {};

  if (startDate !== undefined) {
    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'startDate is not a valid date' });
    data.startDate = parsed;
  }
  if (deadline !== undefined) {
    const parsed = new Date(deadline);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'deadline is not a valid date' });
    data.deadline = parsed;
  }

  // Validate that updated deadline is still after updated/existing startDate
  const effectiveStart    = data.startDate    || existing.startDate;
  const effectiveDeadline = data.deadline     || existing.deadline;
  if (effectiveDeadline <= effectiveStart) {
    return res.status(400).json({ error: 'deadline must be after startDate' });
  }

  if (reminderDays !== undefined) data.reminderDays = Number(reminderDays);
  if (description  !== undefined) data.description  = description || null;
  if (isActive     !== undefined) data.isActive      = Boolean(isActive);

  const updated = await prisma.reportingCalendar.update({
    where: { id: req.params.id },
    data,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  const lock = await prisma.reportingPeriodLock.findUnique({
    where: { fiscalYear_period: { fiscalYear: updated.fiscalYear, period: updated.period } },
    select: { isLocked: true },
  });

  const now = new Date();
  res.json(enrichEntry({ ...updated, periodLock: lock }, now));
}

// ── DELETE /api/calendar/:id ──────────────────────────────────────────────────
async function remove(req, res) {
  const existing = await prisma.reportingCalendar.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.reportingCalendar.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── GET /api/calendar/current ─────────────────────────────────────────────────
// Returns the currently active reporting period based on today's date.
// Logic:
//   1. Find the entry where startDate <= now <= deadline (open window).
//   2. If none, return the next upcoming entry (startDate > now).
//   3. If none upcoming, return the most recently past entry.
async function current(req, res) {
  const now = new Date();

  // Fetch all active calendar entries ordered by start date
  const entries = await prisma.reportingCalendar.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ fiscalYear: 'asc' }, { startDate: 'asc' }],
  });

  if (entries.length === 0) {
    return res.json(null);
  }

  // Pull period locks in bulk for enrichment
  const fiscalYears = [...new Set(entries.map(e => e.fiscalYear))];
  const locks = await prisma.reportingPeriodLock.findMany({
    where: { fiscalYear: { in: fiscalYears } },
    select: { fiscalYear: true, period: true, isLocked: true },
  });
  const lockMap = {};
  for (const l of locks) {
    lockMap[`${l.fiscalYear}__${l.period}`] = l;
  }

  // 1. Currently open: startDate <= now <= deadline
  const open = entries.find(e =>
    new Date(e.startDate) <= now && new Date(e.deadline) >= now
  );
  if (open) {
    const lock = lockMap[`${open.fiscalYear}__${open.period}`] || null;
    return res.json(enrichEntry({ ...open, periodLock: lock }, now));
  }

  // 2. Next upcoming: startDate > now (closest future)
  const upcoming = entries.find(e => new Date(e.startDate) > now);
  if (upcoming) {
    const lock = lockMap[`${upcoming.fiscalYear}__${upcoming.period}`] || null;
    return res.json(enrichEntry({ ...upcoming, periodLock: lock }, now));
  }

  // 3. Most recently ended: last entry whose deadline < now
  const past = [...entries].reverse().find(e => new Date(e.deadline) < now);
  if (past) {
    const lock = lockMap[`${past.fiscalYear}__${past.period}`] || null;
    return res.json(enrichEntry({ ...past, periodLock: lock }, now));
  }

  res.json(null);
}

module.exports = { list, create, update, remove, current };
