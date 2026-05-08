'use strict';

const prisma = require('../../config/db');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');
const aiService = require('../../services/ai/ai.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely divide; returns null if denominator is 0 or null. */
function safePct(actual, target) {
  if (target == null || target === 0 || actual == null) return null;
  return Math.round((actual / target) * 10000) / 100; // two-decimal %
}

/** Average of a numeric array, ignoring nulls.  Returns null if no valid values. */
function avg(arr) {
  const valid = arr.filter(v => v != null);
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/**
 * Derive the "previous" fiscal year from the current one.
 * e.g. "2025-2026" → "2024-2025"
 */
function prevFiscalYear(fy) {
  const parts = fy.split('-');
  if (parts.length !== 2) return null;
  const start = parseInt(parts[0], 10);
  return `${start - 1}-${start}`;
}

/** Map a ReportingPeriod enum value to the matching target column name. */
const PERIOD_TARGET_COL = {
  Q1: 'q1Target',
  Q2: 'q2Target',
  Q3: 'q3Target',
  Q4: 'q4Target',
  Annual: 'annualTarget',
};

const ORDERED_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ── 1. Trends ─────────────────────────────────────────────────────────────────
/**
 * GET /api/analytics/trends?indicatorId=&fiscalYear=&institutionId=
 *
 * Returns per-period achievement for the current fiscal year alongside the
 * previous year's data, plus a simple trend assessment.
 */
async function trends(req, res) {
  const {
    indicatorId,
    fiscalYear = getCurrentFiscalYear(),
    institutionId,
  } = req.query;

  if (!indicatorId) {
    return res.status(400).json({ error: 'indicatorId is required' });
  }

  const previousFY = prevFiscalYear(fiscalYear);

  // Load indicator metadata
  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    select: {
      id: true, name: true, code: true, unit: true,
      formulaType: true, reportingFrequency: true,
    },
  });
  if (!indicator) return res.status(404).json({ error: 'Indicator not found' });

  // Scope filters for actuals
  const actualsWhere = (fy) => ({
    indicatorId,
    fiscalYear: fy,
    status: 'approved',
    ...(institutionId ? { institutionId } : {}),
  });

  // Scope filters for targets
  const targetsWhere = (fy) => ({
    indicatorId,
    fiscalYear: fy,
    ...(institutionId ? { institutionId } : {}),
  });

  const [currentActuals, previousActuals, currentTargets, previousTargets] =
    await Promise.all([
      prisma.indicatorActual.findMany({
        where: actualsWhere(fiscalYear),
        select: { reportingPeriod: true, actualValue: true },
      }),
      previousFY
        ? prisma.indicatorActual.findMany({
            where: actualsWhere(previousFY),
            select: { reportingPeriod: true, actualValue: true },
          })
        : Promise.resolve([]),
      prisma.indicatorTarget.findMany({
        where: targetsWhere(fiscalYear),
        select: {
          q1Target: true, q2Target: true, q3Target: true,
          q4Target: true, annualTarget: true,
        },
      }),
      previousFY
        ? prisma.indicatorTarget.findMany({
            where: targetsWhere(previousFY),
            select: {
              q1Target: true, q2Target: true, q3Target: true,
              q4Target: true, annualTarget: true,
            },
          })
        : Promise.resolve([]),
    ]);

  // Aggregate targets across multiple institution rows (sum)
  const aggregateTarget = (targetRows, period) => {
    const col = PERIOD_TARGET_COL[period];
    if (!col) return null;
    const values = targetRows.map(t => t[col]).filter(v => v != null);
    return values.length ? values.reduce((s, v) => s + v, 0) : null;
  };

  // Aggregate actuals across multiple institution rows (sum)
  const aggregateActual = (actualRows, period) => {
    const rows = actualRows.filter(a => a.reportingPeriod === period && a.actualValue != null);
    return rows.length ? rows.reduce((s, a) => s + a.actualValue, 0) : null;
  };

  const buildPeriodRows = (actualRows, targetRows, fy) =>
    ORDERED_PERIODS.map(period => {
      const actual = aggregateActual(actualRows, period);
      const target = aggregateTarget(targetRows, period);
      const achievement = safePct(actual, target);
      return { period, fiscalYear: fy, actual, target, achievement };
    });

  const currentRows  = buildPeriodRows(currentActuals,  currentTargets,  fiscalYear);
  const previousRows = previousFY
    ? buildPeriodRows(previousActuals, previousTargets, previousFY)
    : [];

  // Convert array rows → { Q1: achievement%, Q2: ... } objects for frontend
  const toMap = (rows) => Object.fromEntries(rows.map(r => [r.period, r.achievement]));

  const currentMap  = toMap(currentRows);
  const previousMap = toMap(previousRows);

  // Trend: compare average achievement of current vs previous
  const currentAvg  = avg(currentRows.map(r => r.achievement));
  const previousAvg = avg(previousRows.map(r => r.achievement));

  let trend = 'stable';
  if (currentAvg != null && previousAvg != null) {
    if (currentAvg > previousAvg + 5) trend = 'improving';
    else if (currentAvg < previousAvg - 5) trend = 'declining';
  } else if (currentAvg != null && previousAvg == null) {
    trend = 'stable'; // no baseline for comparison
  }

  return res.json({
    indicatorName: indicator.name,
    indicatorCode: indicator.code,
    current:  currentMap,
    previous: previousMap,
    trend,
  });
}

// ── 2. Rankings ───────────────────────────────────────────────────────────────
/**
 * GET /api/analytics/rankings?fiscalYear=&period=&ownerType=Institution|Department|Unit
 *
 * Returns entities sorted by weighted average achievement percentage.
 */
async function rankings(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period,
    ownerType = 'Institution',
  } = req.query;

  if (!['Institution', 'Department', 'Unit'].includes(ownerType)) {
    return res.status(400).json({ error: 'ownerType must be Institution, Department, or Unit' });
  }
  if (!period) {
    return res.status(400).json({ error: 'period is required' });
  }

  // Determine which id/name fields to use based on ownerType
  const entityIdField = {
    Institution: 'institutionId',
    Department:  'departmentId',
    Unit:        'unitId',
  }[ownerType];

  const targetCol = PERIOD_TARGET_COL[period];
  if (!targetCol) return res.status(400).json({ error: 'Invalid period' });

  // institutionId is non-nullable (always set), so no null-filter needed for Institution.
  // departmentId / unitId are nullable — filter them to exclude null.
  const nullFilter = ownerType === 'Institution'
    ? {}
    : { [entityIdField]: { not: null } };

  // Fetch approved actuals for the period
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      fiscalYear,
      reportingPeriod: period,
      status: 'approved',
      ...nullFilter,
    },
    select: {
      indicatorId: true,
      [entityIdField]: true,
      actualValue: true,
    },
  });

  if (actuals.length === 0) return res.json({ rankings: [] });

  // Collect unique entity IDs and indicator IDs
  const entityIds    = [...new Set(actuals.map(a => a[entityIdField]).filter(Boolean))];
  const indicatorIds = [...new Set(actuals.map(a => a.indicatorId))];

  // Fetch targets for those indicators + entities
  const targets = await prisma.indicatorTarget.findMany({
    where: {
      indicatorId: { in: indicatorIds },
      fiscalYear,
      institutionId: ownerType === 'Institution' ? { in: entityIds } : undefined,
    },
    select: {
      indicatorId: true,
      institutionId: true,
      [targetCol]: true,
    },
  });

  // Build a map: indicatorId → target value
  // For Department/Unit we use a global target (institution-level target),
  // keyed only by indicatorId (first match wins as a proxy).
  const targetMap = {};
  for (const t of targets) {
    const key = ownerType === 'Institution'
      ? `${t.indicatorId}::${t.institutionId}`
      : t.indicatorId;
    if (!(key in targetMap)) targetMap[key] = t[targetCol];
  }

  // Group actuals by entity
  const entityMap = {};
  for (const a of actuals) {
    const eid = a[entityIdField];
    if (!eid) continue;
    if (!entityMap[eid]) entityMap[eid] = [];
    entityMap[eid].push(a);
  }

  // Compute per-entity stats
  const rows = [];
  for (const [eid, eidActuals] of Object.entries(entityMap)) {
    let totalActual = 0;
    let totalTarget = 0;
    let indicatorCount = 0;
    const achievements = [];

    for (const a of eidActuals) {
      const tKey = ownerType === 'Institution'
        ? `${a.indicatorId}::${eid}`
        : a.indicatorId;
      const target = targetMap[tKey];
      const actual = a.actualValue;
      if (actual == null) continue;
      totalActual += actual;
      if (target != null && target > 0) {
        totalTarget += target;
        achievements.push((actual / target) * 100);
        indicatorCount++;
      }
    }

    const avgAchievement = achievements.length
      ? Math.round((achievements.reduce((s, v) => s + v, 0) / achievements.length) * 100) / 100
      : null;

    rows.push({
      entityId:       eid,
      indicators:     eidActuals.length,
      avgAchievement,
      totalActual,
      totalTarget,
    });
  }

  // Sort by avgAchievement desc, null last
  rows.sort((a, b) => {
    if (a.avgAchievement == null && b.avgAchievement == null) return 0;
    if (a.avgAchievement == null) return 1;
    if (b.avgAchievement == null) return -1;
    return b.avgAchievement - a.avgAchievement;
  });

  // Fetch entity names
  let entityNames = {};
  if (ownerType === 'Institution') {
    const entities = await prisma.institution.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, name: true, code: true },
    });
    for (const e of entities) entityNames[e.id] = { id: e.id, name: e.name, code: e.code };
  } else if (ownerType === 'Department') {
    const entities = await prisma.department.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, name: true, code: true },
    });
    for (const e of entities) entityNames[e.id] = { id: e.id, name: e.name, code: e.code };
  } else {
    const entities = await prisma.unit.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, name: true, code: true },
    });
    for (const e of entities) entityNames[e.id] = { id: e.id, name: e.name, code: e.code };
  }

  const ranked = rows.map((r, idx) => ({
    rank:           idx + 1,
    id:             r.entityId,
    name:           entityNames[r.entityId]?.name ?? 'Unknown',
    code:           entityNames[r.entityId]?.code ?? null,
    indicatorCount: r.indicators,
    avgAchievement: r.avgAchievement,
    totalActual:    r.totalActual,
    totalTarget:    r.totalTarget,
  }));

  return res.json({ rankings: ranked });
}

// ── 3. Forecasting ────────────────────────────────────────────────────────────
/**
 * GET /api/analytics/forecasting?indicatorId=&fiscalYear=&institutionId=
 *
 * Uses Q1–Q3 actuals to project Q4 and annual total via simple linear
 * extrapolation (average-of-observed * 4 for annual).
 */
async function forecasting(req, res) {
  const {
    indicatorId,
    fiscalYear = getCurrentFiscalYear(),
    institutionId,
  } = req.query;

  if (!indicatorId) return res.status(400).json({ error: 'indicatorId is required' });

  const [indicator, actuals, targets] = await Promise.all([
    prisma.indicator.findUnique({
      where: { id: indicatorId },
      select: { id: true, name: true, code: true, unit: true },
    }),
    prisma.indicatorActual.findMany({
      where: {
        indicatorId,
        fiscalYear,
        status: 'approved',
        ...(institutionId ? { institutionId } : {}),
      },
      select: { reportingPeriod: true, actualValue: true },
    }),
    prisma.indicatorTarget.findMany({
      where: {
        indicatorId,
        fiscalYear,
        ...(institutionId ? { institutionId } : {}),
      },
      select: {
        q1Target: true, q2Target: true, q3Target: true,
        q4Target: true, annualTarget: true,
      },
    }),
  ]);

  if (!indicator) return res.status(404).json({ error: 'Indicator not found' });

  // Sum actuals per period (supports multi-institution aggregation)
  const actualByPeriod = {};
  for (const a of actuals) {
    if (a.actualValue == null) continue;
    actualByPeriod[a.reportingPeriod] =
      (actualByPeriod[a.reportingPeriod] ?? 0) + a.actualValue;
  }

  // Sum targets per period
  const sumTargets = { q1: 0, q2: 0, q3: 0, q4: 0, annual: 0 };
  for (const t of targets) {
    sumTargets.q1     += t.q1Target     ?? 0;
    sumTargets.q2     += t.q2Target     ?? 0;
    sumTargets.q3     += t.q3Target     ?? 0;
    sumTargets.q4     += t.q4Target     ?? 0;
    sumTargets.annual += t.annualTarget ?? 0;
  }
  const annualTarget = sumTargets.annual > 0 ? sumTargets.annual : null;

  const q1 = actualByPeriod['Q1'] ?? null;
  const q2 = actualByPeriod['Q2'] ?? null;
  const q3 = actualByPeriod['Q3'] ?? null;
  const q4Actual = actualByPeriod['Q4'] ?? null;

  // Build observed sequence (only non-null values)
  const observed = [q1, q2, q3].filter(v => v != null);

  let projectedQ4 = null;
  let projectedAnnual = null;

  if (observed.length >= 2) {
    // Linear regression on observed quarters (index 1-based)
    const n = observed.length;
    const xMean = (n + 1) / 2;
    const yMean = observed.reduce((s, v) => s + v, 0) / n;

    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
      sxy += (i + 1 - xMean) * (observed[i] - yMean);
      sxx += (i + 1 - xMean) ** 2;
    }
    const slope     = sxx !== 0 ? sxy / sxx : 0;
    const intercept = yMean - slope * xMean;

    // Predict Q4 (x = 4)
    projectedQ4     = Math.max(0, intercept + slope * 4);
    projectedAnnual = observed.reduce((s, v) => s + v, 0) + projectedQ4;
  } else if (observed.length === 1) {
    // Only one data point: flat projection
    projectedQ4     = observed[0];
    projectedAnnual = observed[0] * 4;
  }

  // If Q4 actual is already in, use it for annual projection
  if (q4Actual != null) {
    const allFour = [q1, q2, q3, q4Actual].filter(v => v != null);
    projectedAnnual = allFour.reduce((s, v) => s + v, 0);
    projectedQ4     = q4Actual; // no longer a projection
  }

  // Determine likelihood
  let likelihood = null;
  if (projectedAnnual != null && annualTarget != null && annualTarget > 0) {
    const pct = projectedAnnual / annualTarget;
    if (pct >= 0.9)      likelihood = 'on_track';
    else if (pct >= 0.7) likelihood = 'at_risk';
    else                 likelihood = 'off_track';
  }

  const currentTotal = [q1, q2, q3].filter(v => v != null).reduce((s, v) => s + v, 0) || null;

  return res.json({
    indicatorName:   indicator.name,
    indicatorCode:   indicator.code,
    fiscalYear,
    // actuals object keyed by period (frontend uses data.actuals?.Q1 etc.)
    actuals: { Q1: q1, Q2: q2, Q3: q3, Q4: q4Actual },
    // flat projection fields (frontend uses data.projectedQ4, data.projectedAnnual)
    projectedQ4:      projectedQ4     != null ? Math.round(projectedQ4     * 100) / 100 : null,
    projectedAnnual:  projectedAnnual != null ? Math.round(projectedAnnual * 100) / 100 : null,
    currentTotal,
    annualTarget,
    likelihood,
  });
}

// ── 4. Performance Matrix ─────────────────────────────────────────────────────
/**
 * GET /api/analytics/performance-matrix?fiscalYear=&period=
 *
 * Builds a matrix where each row is an institution and each column is an
 * indicator.  Cell value = achievement % or null.
 */
async function performanceMatrix(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period,
  } = req.query;

  if (!period) return res.status(400).json({ error: 'period is required' });

  const targetCol = PERIOD_TARGET_COL[period];
  if (!targetCol) return res.status(400).json({ error: 'Invalid period' });

  // Fetch all active institutions
  const institutions = await prisma.institution.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  // Fetch all active indicators
  const indicators = await prisma.indicator.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { code: 'asc' },
  });

  if (institutions.length === 0 || indicators.length === 0) {
    return res.json({ entities: [], indicators: [], matrix: {} });
  }

  const institutionIds = institutions.map(i => i.id);
  const indicatorIds   = indicators.map(i => i.id);

  // Fetch approved actuals for the period
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      fiscalYear,
      reportingPeriod: period,
      status: 'approved',
      institutionId: { in: institutionIds },
      indicatorId:   { in: indicatorIds },
    },
    select: { institutionId: true, indicatorId: true, actualValue: true },
  });

  // Fetch targets
  const targets = await prisma.indicatorTarget.findMany({
    where: {
      fiscalYear,
      institutionId: { in: institutionIds },
      indicatorId:   { in: indicatorIds },
    },
    select: { institutionId: true, indicatorId: true, [targetCol]: true },
  });

  // Build lookup maps: "institutionId::indicatorId" → value
  const actualMap = {};
  for (const a of actuals) {
    const key = `${a.institutionId}::${a.indicatorId}`;
    actualMap[key] = (actualMap[key] ?? 0) + (a.actualValue ?? 0);
  }

  const targetMap = {};
  for (const t of targets) {
    const key = `${t.institutionId}::${t.indicatorId}`;
    targetMap[key] = (targetMap[key] ?? 0) + (t[targetCol] ?? 0);
  }

  // Build matrix in { matrix[entityId][indicatorId] = achievement% } format
  const matrixObj = {};
  for (const inst of institutions) {
    matrixObj[inst.id] = {};
    for (const ind of indicators) {
      const key    = `${inst.id}::${ind.id}`;
      const actual = actualMap[key];
      const target = targetMap[key];
      matrixObj[inst.id][ind.id] = safePct(actual, target);
    }
  }

  return res.json({
    fiscalYear,
    period,
    entities:   institutions.map(i => ({ id: i.id, name: i.name, code: i.code })),
    indicators: indicators.map(i => ({ id: i.id, name: i.name, code: i.code })),
    matrix:     matrixObj,
  });
}

// ── 5. Summary ────────────────────────────────────────────────────────────────
/**
 * GET /api/analytics/summary?fiscalYear=&period=
 *
 * High-level system-wide statistics.
 */
async function summary(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period,
  } = req.query;

  // ── Submission status breakdown ───────────────────────────────────────────
  const statusWhere = { fiscalYear, ...(period ? { reportingPeriod: period } : {}) };

  const [submissionGroups, approvedActuals, allTargets] = await Promise.all([
    // Counts per SubmissionStatus
    prisma.indicatorActual.groupBy({
      by: ['status'],
      where: statusWhere,
      _count: { id: true },
    }),
    // Approved actuals (with values) for achievement computation
    prisma.indicatorActual.findMany({
      where: { ...statusWhere, status: 'approved' },
      select: { indicatorId: true, institutionId: true, actualValue: true, reportingPeriod: true },
    }),
    // Targets for the fiscal year
    prisma.indicatorTarget.findMany({
      where: { fiscalYear },
      select: {
        indicatorId: true, institutionId: true,
        q1Target: true, q2Target: true, q3Target: true,
        q4Target: true, annualTarget: true,
      },
    }),
  ]);

  // Submission counts by status
  const submissionsByStatus = {
    draft: 0, submitted: 0, pending_supervisor: 0,
    pending_me: 0, approved: 0, rejected: 0,
  };
  let totalSubmissions = 0;
  for (const g of submissionGroups) {
    submissionsByStatus[g.status] = g._count.id;
    totalSubmissions += g._count.id;
  }

  // ── Overall system achievement % ─────────────────────────────────────────
  // Build target lookup: indicatorId::institutionId → period-target
  const targetLookup = {};
  for (const t of allTargets) {
    const key = `${t.indicatorId}::${t.institutionId}`;
    targetLookup[key] = t;
  }

  const achievementValues = [];
  let onTrackCount = 0, atRiskCount = 0, offTrackCount = 0;

  // Group approved actuals by indicator+institution
  const actualMap = {};
  for (const a of approvedActuals) {
    const key = `${a.indicatorId}::${a.institutionId}`;
    if (!actualMap[key]) actualMap[key] = {};
    actualMap[key][a.reportingPeriod] = (actualMap[key][a.reportingPeriod] ?? 0) + (a.actualValue ?? 0);
  }

  for (const [key, periodMap] of Object.entries(actualMap)) {
    const target = targetLookup[key];
    if (!target) continue;

    // Determine which periods to evaluate (all that have data)
    const periods = period ? [period] : ORDERED_PERIODS;
    for (const p of periods) {
      const tCol   = PERIOD_TARGET_COL[p];
      const tVal   = target[tCol];
      const aVal   = periodMap[p];
      if (aVal == null || tVal == null || tVal === 0) continue;
      const pct = (aVal / tVal) * 100;
      achievementValues.push(pct);
    }

    // Classify by annual or Q4 target for on_track/at_risk/off_track
    const annualT = target.annualTarget;
    if (annualT != null && annualT > 0) {
      // Sum all available actuals as a proxy for projected annual
      const totalActual = Object.values(periodMap).reduce((s, v) => s + v, 0);
      const pct = totalActual / annualT;
      if (pct >= 0.9)      onTrackCount++;
      else if (pct >= 0.7) atRiskCount++;
      else                 offTrackCount++;
    }
  }

  const overallAchievement = achievementValues.length
    ? Math.round((achievementValues.reduce((s, v) => s + v, 0) / achievementValues.length) * 100) / 100
    : null;

  // ── Compliance rate ───────────────────────────────────────────────────────
  // Expected = unique (indicatorId × institutionId) pairs that have targets
  const expectedPairs = new Set(allTargets.map(t => `${t.indicatorId}::${t.institutionId}`)).size;
  // Submitted = pairs that have at least one non-draft actual for this FY/period
  const submittedActuals = await prisma.indicatorActual.findMany({
    where: {
      fiscalYear,
      ...(period ? { reportingPeriod: period } : {}),
      status: { not: 'draft' },
    },
    select: { indicatorId: true, institutionId: true },
  });
  const submittedPairs = new Set(submittedActuals.map(a => `${a.indicatorId}::${a.institutionId}`)).size;
  const complianceRate = expectedPairs > 0
    ? Math.round((submittedPairs / expectedPairs) * 10000) / 100
    : null;

  // ── Top 3 & Bottom 3 institutions by avgAchievement ──────────────────────
  const institutions = await prisma.institution.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
  });

  const instAchievement = {};
  for (const inst of institutions) {
    const pairs = Object.entries(actualMap)
      .filter(([k]) => k.endsWith(`::${inst.id}`))
      .map(([, periodMap]) => {
        const relevant = period ? [period] : ORDERED_PERIODS;
        return relevant
          .map(p => {
            const tKey  = `${Object.keys(actualMap).find(k => k.endsWith(`::${inst.id}`))?.split('::')[0]}::${inst.id}`;
            const t = targetLookup[tKey];
            const aVal = periodMap[p];
            const tVal = t?.[PERIOD_TARGET_COL[p]];
            if (aVal == null || tVal == null || tVal === 0) return null;
            return (aVal / tVal) * 100;
          })
          .filter(v => v != null);
      })
      .flat();
    if (pairs.length > 0) {
      instAchievement[inst.id] = avg(pairs);
    }
  }

  // Re-compute per-institution correctly by grouping actual+target properly
  const instActualGroups = {};
  for (const a of approvedActuals) {
    if (!instActualGroups[a.institutionId]) instActualGroups[a.institutionId] = [];
    instActualGroups[a.institutionId].push(a);
  }

  const instStats = institutions
    .filter(inst => instActualGroups[inst.id])
    .map(inst => {
      const rows    = instActualGroups[inst.id];
      const periods = period ? [period] : ORDERED_PERIODS;
      const pctsArr = [];
      for (const a of rows) {
        const key  = `${a.indicatorId}::${a.institutionId}`;
        const t    = targetLookup[key];
        if (!t) continue;
        for (const p of periods) {
          const aVal = a.reportingPeriod === p ? a.actualValue : null;
          const tVal = t[PERIOD_TARGET_COL[p]];
          if (aVal == null || tVal == null || tVal === 0) continue;
          pctsArr.push((aVal / tVal) * 100);
        }
      }
      const avgAch = pctsArr.length
        ? Math.round((pctsArr.reduce((s, v) => s + v, 0) / pctsArr.length) * 100) / 100
        : null;
      return { id: inst.id, name: inst.name, code: inst.code, achievement: avgAch };
    })
    .filter(r => r.achievement != null)
    .sort((a, b) => b.achievement - a.achievement);

  const top3    = instStats.slice(0, 3);
  const bottom3 = instStats.slice(-3).reverse();

  return res.json({
    fiscalYear,
    period: period || 'all',
    // Flat submission counts (expected by frontend)
    totalSubmissions,
    approvedSubmissions: submissionsByStatus.approved ?? 0,
    pendingSubmissions:  (submissionsByStatus.submitted ?? 0) + (submissionsByStatus.pending_supervisor ?? 0) + (submissionsByStatus.pending_me ?? 0),
    rejectedSubmissions: submissionsByStatus.rejected ?? 0,
    // Achievement
    overallAchievement,
    // Status counts (flat names expected by frontend)
    onTrack:  onTrackCount,
    atRisk:   atRiskCount,
    offTrack: offTrackCount,
    // Compliance
    complianceRate,
    // Performers
    topPerformers:    top3,
    bottomPerformers: bottom3,
  });
}

// ── 6. Descriptive Statistics ─────────────────────────────────────────────────
/**
 * GET /api/analytics/descriptive?indicatorId=&fiscalYear=&period=&institutionId=
 *
 * Returns n, mean, median, std-dev, min, max, P25, P75, P90 and a frequency
 * distribution (10 buckets) for approved actual values of one indicator.
 */
async function descriptive(req, res) {
  const {
    indicatorId,
    fiscalYear = getCurrentFiscalYear(),
    period,
    institutionId,
  } = req.query;

  if (!indicatorId) return res.status(400).json({ error: 'indicatorId is required' });

  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    select: { id: true, name: true, code: true, unit: true },
  });
  if (!indicator) return res.status(404).json({ error: 'Indicator not found' });

  const where = {
    indicatorId,
    fiscalYear,
    status: 'approved',
    actualValue: { not: null },
    ...(period        ? { reportingPeriod: period }  : {}),
    ...(institutionId ? { institutionId }             : {}),
  };

  const actuals = await prisma.indicatorActual.findMany({
    where,
    select: {
      actualValue: true,
      reportingPeriod: true,
      institution: { select: { name: true, code: true } },
    },
    orderBy: { actualValue: 'asc' },
  });

  const values = actuals.map(a => a.actualValue).filter(v => v != null);
  const n = values.length;

  if (n === 0) {
    return res.json({
      indicatorName: indicator.name,
      indicatorCode: indicator.code,
      unit: indicator.unit,
      n: 0, mean: null, median: null, stdDev: null,
      min: null, max: null, p25: null, p75: null, p90: null,
      distribution: [],
    });
  }

  // Sort ascending (already sorted by Prisma)
  const sorted = [...values].sort((a, b) => a - b);

  const mean = sorted.reduce((s, v) => s + v, 0) / n;

  const percentile = (p) => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };

  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Frequency distribution — 10 equal-width buckets
  const minV = sorted[0];
  const maxV = sorted[n - 1];
  const BUCKETS = 10;
  const bucketWidth = maxV > minV ? (maxV - minV) / BUCKETS : 1;
  const distribution = Array.from({ length: BUCKETS }, (_, i) => ({
    from:  Math.round((minV + i * bucketWidth) * 100) / 100,
    to:    Math.round((minV + (i + 1) * bucketWidth) * 100) / 100,
    count: 0,
  }));

  for (const v of sorted) {
    const idx = Math.min(Math.floor((v - minV) / bucketWidth), BUCKETS - 1);
    distribution[idx].count++;
  }

  // Per-institution breakdown for scatter/box plots
  const byInstitution = actuals.map(a => ({
    institution: a.institution?.name ?? 'Unknown',
    code:        a.institution?.code ?? '',
    period:      a.reportingPeriod,
    value:       a.actualValue,
  }));

  return res.json({
    indicatorName: indicator.name,
    indicatorCode: indicator.code,
    unit:          indicator.unit,
    n,
    mean:   Math.round(mean   * 100) / 100,
    median: Math.round(percentile(50) * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min:    sorted[0],
    max:    sorted[n - 1],
    p25:    Math.round(percentile(25) * 100) / 100,
    p75:    Math.round(percentile(75) * 100) / 100,
    p90:    Math.round(percentile(90) * 100) / 100,
    distribution,
    dataPoints: byInstitution,
  });
}

// ── 7. Variance Analysis ──────────────────────────────────────────────────────
/**
 * GET /api/analytics/variance?fiscalYear=&period=&institutionId=
 *
 * For every indicator that has a target for this period, returns the gap
 * between target and actual: absolute variance and % variance.
 */
async function varianceAnalysis(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period,
    institutionId,
  } = req.query;

  if (!period) return res.status(400).json({ error: 'period is required' });
  const targetCol = PERIOD_TARGET_COL[period];
  if (!targetCol) return res.status(400).json({ error: 'Invalid period' });

  const targetWhere = {
    fiscalYear,
    ...(institutionId ? { institutionId } : {}),
    [targetCol]: { not: null },
  };

  const [targets, actuals] = await Promise.all([
    prisma.indicatorTarget.findMany({
      where: targetWhere,
      select: {
        indicatorId: true,
        institutionId: true,
        [targetCol]: true,
        indicator: { select: { id: true, name: true, code: true, unit: true } },
      },
    }),
    prisma.indicatorActual.findMany({
      where: {
        fiscalYear,
        reportingPeriod: period,
        status: 'approved',
        ...(institutionId ? { institutionId } : {}),
      },
      select: { indicatorId: true, institutionId: true, actualValue: true },
    }),
  ]);

  // Build actual lookup: indicatorId::institutionId → sum of actuals
  const actualMap = {};
  for (const a of actuals) {
    const key = `${a.indicatorId}::${a.institutionId}`;
    actualMap[key] = (actualMap[key] ?? 0) + (a.actualValue ?? 0);
  }

  // Group targets by indicator
  const indicatorMap = {};
  for (const t of targets) {
    const iid = t.indicatorId;
    if (!indicatorMap[iid]) {
      indicatorMap[iid] = { indicator: t.indicator, target: 0, actual: 0 };
    }
    indicatorMap[iid].target += t[targetCol] ?? 0;
    const key = `${iid}::${t.institutionId}`;
    indicatorMap[iid].actual += actualMap[key] ?? 0;
  }

  const rows = Object.values(indicatorMap)
    .filter(r => r.indicator)
    .map(r => {
      const gap    = r.actual - r.target;
      const gapPct = r.target > 0 ? Math.round((gap / r.target) * 10000) / 100 : null;
      const achievement = r.target > 0 ? Math.round((r.actual / r.target) * 10000) / 100 : null;
      const status =
        achievement === null  ? 'no_data'
        : achievement >= 90   ? 'on_track'
        : achievement >= 60   ? 'at_risk'
        : 'off_track';
      return {
        indicatorId:   r.indicator.id,
        indicatorName: r.indicator.name,
        indicatorCode: r.indicator.code,
        unit:          r.indicator.unit,
        target:        Math.round(r.target  * 100) / 100,
        actual:        Math.round(r.actual  * 100) / 100,
        gap:           Math.round(gap       * 100) / 100,
        gapPct,
        achievement,
        status,
      };
    })
    .sort((a, b) => (a.achievement ?? 200) - (b.achievement ?? 200)); // worst first

  return res.json({ fiscalYear, period, rows });
}

// ── 8. Disaggregation Analysis ────────────────────────────────────────────────
/**
 * GET /api/analytics/disaggregation?indicatorId=&fiscalYear=&period=&disaggregationId=&institutionId=
 *
 * Aggregates ActualDisaggregation values by dimension option.
 * If disaggregationId is omitted, returns all dimensions for that indicator.
 */
async function disaggregationAnalysis(req, res) {
  const {
    indicatorId,
    fiscalYear = getCurrentFiscalYear(),
    period,
    disaggregationId,
    institutionId,
  } = req.query;

  if (!indicatorId) return res.status(400).json({ error: 'indicatorId is required' });

  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    select: { id: true, name: true, code: true, unit: true },
  });
  if (!indicator) return res.status(404).json({ error: 'Indicator not found' });

  // Find approved actuals for this indicator
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      indicatorId,
      fiscalYear,
      status: 'approved',
      ...(period        ? { reportingPeriod: period } : {}),
      ...(institutionId ? { institutionId }           : {}),
    },
    select: { id: true },
  });
  const actualIds = actuals.map(a => a.id);

  if (actualIds.length === 0) {
    return res.json({
      indicatorName: indicator.name,
      indicatorCode: indicator.code,
      disaggregations: [],
    });
  }

  const disaggWhere = {
    actualId:    { in: actualIds },
    indicatorId,
    ...(disaggregationId ? { disaggregationId } : {}),
  };

  const entries = await prisma.actualDisaggregation.findMany({
    where: disaggWhere,
    select: {
      disaggregationId: true,
      disaggregation: { select: { id: true, name: true } },
      option:         { select: { id: true, label: true, code: true, orderNo: true } },
      value:          true,
    },
  });

  // Group by disaggregation dimension
  const dimMap = {};
  for (const e of entries) {
    const did   = e.disaggregationId;
    const dname = e.disaggregation.name;
    if (!dimMap[did]) dimMap[did] = { id: did, name: dname, options: {} };

    const oid   = e.option.id;
    if (!dimMap[did].options[oid]) {
      dimMap[did].options[oid] = {
        id: oid, label: e.option.label, code: e.option.code,
        orderNo: e.option.orderNo, total: 0, count: 0,
      };
    }
    dimMap[did].options[oid].total += e.value ?? 0;
    dimMap[did].options[oid].count++;
  }

  // Convert to array, compute percentages
  const disaggregations = Object.values(dimMap).map(dim => {
    const opts = Object.values(dim.options).sort((a, b) => a.orderNo - b.orderNo);
    const grandTotal = opts.reduce((s, o) => s + o.total, 0);
    return {
      id:   dim.id,
      name: dim.name,
      options: opts.map(o => ({
        id:    o.id,
        label: o.label,
        code:  o.code,
        total: Math.round(o.total * 100) / 100,
        count: o.count,
        pct:   grandTotal > 0 ? Math.round((o.total / grandTotal) * 10000) / 100 : 0,
      })),
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  });

  return res.json({
    indicatorName: indicator.name,
    indicatorCode: indicator.code,
    unit:          indicator.unit,
    disaggregations,
  });
}

// ── 9. Cost-Benefit Analysis ──────────────────────────────────────────────────
/**
 * GET /api/analytics/cost-benefit?fiscalYear=&institutionId=
 *
 * Per institution: total budget, total expenditure, total approved actuals,
 * avg achievement %, cost per unit of output, efficiency ratio.
 */
async function costBenefit(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    institutionId,
  } = req.query;

  // Budget plans for the fiscal year
  const budgetPlans = await prisma.budgetPlan.findMany({
    where: {
      fiscalYear,
      ...(institutionId ? { institutionId } : {}),
    },
    select: {
      institutionId: true,
      totalBudget: true,
      totalSpent: true,
      institution: { select: { id: true, name: true, code: true } },
    },
  });

  // Approved actuals for the fiscal year
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      fiscalYear,
      status: 'approved',
      ...(institutionId ? { institutionId } : {}),
    },
    select: { institutionId: true, actualValue: true, indicatorId: true, reportingPeriod: true },
  });

  // Targets for achievement calculation
  const targets = await prisma.indicatorTarget.findMany({
    where: {
      fiscalYear,
      ...(institutionId ? { institutionId } : {}),
    },
    select: { institutionId: true, indicatorId: true, annualTarget: true, q4Target: true },
  });

  const targetMap = {};
  for (const t of targets) {
    const key = `${t.institutionId}::${t.indicatorId}`;
    targetMap[key] = (t.annualTarget ?? t.q4Target) ?? 0;
  }

  // Group actuals and compute achievement per institution
  const instActuals = {};
  for (const a of actuals) {
    if (!instActuals[a.institutionId]) instActuals[a.institutionId] = [];
    instActuals[a.institutionId].push(a);
  }

  // Build per-institution result
  const budgetByInst = {};
  for (const bp of budgetPlans) {
    const iid = bp.institutionId;
    if (!budgetByInst[iid]) budgetByInst[iid] = { institution: bp.institution, budget: 0, spent: 0 };
    budgetByInst[iid].budget += bp.totalBudget ?? 0;
    budgetByInst[iid].spent  += bp.totalSpent  ?? 0;
  }

  const allInstIds = new Set([
    ...Object.keys(budgetByInst),
    ...Object.keys(instActuals),
  ]);

  // Fetch institutions not in budgetPlans
  const missingInsts = [...allInstIds].filter(id => !budgetByInst[id]);
  if (missingInsts.length > 0) {
    const insts = await prisma.institution.findMany({
      where: { id: { in: missingInsts } },
      select: { id: true, name: true, code: true },
    });
    for (const inst of insts) {
      budgetByInst[inst.id] = { institution: inst, budget: 0, spent: 0 };
    }
  }

  const rows = [...allInstIds].map(iid => {
    const budget  = budgetByInst[iid]?.budget ?? 0;
    const spent   = budgetByInst[iid]?.spent  ?? 0;
    const inst    = budgetByInst[iid]?.institution;
    const aRows   = instActuals[iid] ?? [];

    const totalOutput = aRows.reduce((s, a) => s + (a.actualValue ?? 0), 0);

    // Achievement = avg across indicators that have targets
    const achievementPcts = [];
    const seenIndicators = new Set();
    for (const a of aRows) {
      if (seenIndicators.has(a.indicatorId)) continue;
      seenIndicators.add(a.indicatorId);
      const tKey = `${iid}::${a.indicatorId}`;
      const t = targetMap[tKey];
      if (t && t > 0) {
        // Sum actuals across all periods for this indicator
        const indTotal = aRows.filter(x => x.indicatorId === a.indicatorId).reduce((s, x) => s + (x.actualValue ?? 0), 0);
        achievementPcts.push((indTotal / t) * 100);
      }
    }
    const avgAchievement = achievementPcts.length
      ? Math.round((achievementPcts.reduce((s, v) => s + v, 0) / achievementPcts.length) * 100) / 100
      : null;

    const absorptionRate = budget > 0 ? Math.round((spent / budget) * 10000) / 100 : null;
    // Efficiency: achievement per unit of absorption (100 = perfectly efficient)
    const efficiency = avgAchievement != null && absorptionRate != null && absorptionRate > 0
      ? Math.round((avgAchievement / absorptionRate) * 100) / 100
      : null;
    // Cost per unit of output (in currency units)
    const costPerOutput = totalOutput > 0 && spent > 0
      ? Math.round((spent / totalOutput) * 100) / 100
      : null;

    return {
      institutionId:  iid,
      institutionName: inst?.name ?? 'Unknown',
      institutionCode: inst?.code ?? '',
      budget:          Math.round(budget * 100) / 100,
      spent:           Math.round(spent  * 100) / 100,
      absorptionRate,
      totalOutput:     Math.round(totalOutput * 100) / 100,
      avgAchievement,
      efficiency,
      costPerOutput,
    };
  }).filter(r => r.budget > 0 || r.totalOutput > 0)
    .sort((a, b) => (b.efficiency ?? -1) - (a.efficiency ?? -1));

  return res.json({ fiscalYear, rows });
}

// ── 10. RBM Logframe ─────────────────────────────────────────────────────────
/**
 * GET /api/analytics/rbm-logframe?fiscalYear=&institutionId=
 *
 * Full Results-Based Management logframe:
 * Objective → Outcome → Output → Indicator → baseline / target / actual / achievement
 */
async function rbmLogframe(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    institutionId,
  } = req.query;

  // Load the full RF chain
  const objectives = await prisma.strategicObjective.findMany({
    where: { isActive: true },
    orderBy: { orderNo: 'asc' },
    include: {
      outcomes: {
        where: { isActive: true },
        orderBy: { orderNo: 'asc' },
        include: {
          outputs: {
            where: { isActive: true },
            orderBy: { orderNo: 'asc' },
            include: {
              indicators: {
                where: { isActive: true },
                orderBy: { code: 'asc' },
                select: {
                  id: true, name: true, code: true, unit: true,
                  baselineValue: true, baselineYear: true,
                  progressDirection: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (objectives.length === 0) return res.json({ fiscalYear, objectives: [] });

  // Collect all indicator IDs
  const indicatorIds = [];
  for (const obj of objectives)
    for (const out of obj.outcomes)
      for (const outp of out.outputs)
        for (const ind of outp.indicators)
          indicatorIds.push(ind.id);

  if (indicatorIds.length === 0) return res.json({ fiscalYear, objectives: [] });

  // Fetch targets (sum across institutions if no filter)
  const targets = await prisma.indicatorTarget.findMany({
    where: {
      indicatorId: { in: indicatorIds },
      fiscalYear,
      ...(institutionId ? { institutionId } : {}),
    },
    select: {
      indicatorId: true,
      q1Target: true, q2Target: true, q3Target: true,
      q4Target: true, annualTarget: true,
    },
  });

  // Fetch approved actuals
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      indicatorId:    { in: indicatorIds },
      fiscalYear,
      status:         'approved',
      ...(institutionId ? { institutionId } : {}),
    },
    select: { indicatorId: true, reportingPeriod: true, actualValue: true },
  });

  // Aggregate by indicator
  const targetByInd = {};
  for (const t of targets) {
    const iid = t.indicatorId;
    if (!targetByInd[iid]) targetByInd[iid] = { q1: 0, q2: 0, q3: 0, q4: 0, annual: 0 };
    targetByInd[iid].q1     += t.q1Target     ?? 0;
    targetByInd[iid].q2     += t.q2Target     ?? 0;
    targetByInd[iid].q3     += t.q3Target     ?? 0;
    targetByInd[iid].q4     += t.q4Target     ?? 0;
    targetByInd[iid].annual += t.annualTarget  ?? 0;
  }

  const actualByInd = {};
  for (const a of actuals) {
    const iid = a.indicatorId;
    if (!actualByInd[iid]) actualByInd[iid] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Annual: 0 };
    actualByInd[iid][a.reportingPeriod] = (actualByInd[iid][a.reportingPeriod] ?? 0) + (a.actualValue ?? 0);
  }

  // Build logframe
  const buildIndicator = (ind) => {
    const t = targetByInd[ind.id] ?? {};
    const a = actualByInd[ind.id] ?? {};
    const annualTarget  = t.annual  || t.q4 || null;
    const cumulativeActual = (a.Q1 ?? 0) + (a.Q2 ?? 0) + (a.Q3 ?? 0) + (a.Q4 ?? 0);
    const achievement   = annualTarget && annualTarget > 0
      ? Math.round((cumulativeActual / annualTarget) * 10000) / 100
      : null;
    const status =
      achievement === null  ? 'no_data'
      : achievement >= 90   ? 'on_track'
      : achievement >= 60   ? 'at_risk'
      : 'off_track';

    return {
      id:   ind.id,
      name: ind.name,
      code: ind.code,
      unit: ind.unit,
      progressDirection: ind.progressDirection,
      baseline:   { value: ind.baselineValue, year: ind.baselineYear },
      targets:    { Q1: t.q1||null, Q2: t.q2||null, Q3: t.q3||null, Q4: t.q4||null, Annual: annualTarget },
      actuals:    { Q1: a.Q1||null, Q2: a.Q2||null, Q3: a.Q3||null, Q4: a.Q4||null },
      cumulativeActual,
      achievement,
      status,
    };
  };

  const logframe = objectives.map(obj => ({
    id: obj.id, name: obj.name, code: obj.code,
    outcomes: obj.outcomes.map(out => ({
      id: out.id, name: out.name, code: out.code,
      outputs: out.outputs.map(outp => ({
        id: outp.id, name: outp.name, code: outp.code,
        indicators: outp.indicators.map(buildIndicator),
      })),
    })),
  }));

  return res.json({ fiscalYear, objectives: logframe });
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════

async function aiAnomalies(req, res) {
  const { fiscalYear, threshold } = req.query;
  const data = await aiService.detectAnomalies({
    fiscalYear: fiscalYear || getCurrentFiscalYear(),
    threshold: threshold ? parseFloat(threshold) : 2.0,
  });
  res.json({ anomalies: data, count: data.length });
}

async function aiRiskScores(req, res) {
  const { fiscalYear } = req.query;
  const data = await aiService.computeRiskScores({ fiscalYear: fiscalYear || getCurrentFiscalYear() });
  res.json({ risks: data, count: data.length });
}

async function aiForecasting(req, res) {
  const { indicatorId, fiscalYear, institutionId } = req.query;
  if (!indicatorId) return res.status(400).json({ error: 'indicatorId required' });
  const data = await aiService.forecastIndicator({ indicatorId, fiscalYear, institutionId });
  res.json(data);
}

async function aiRunAlerts(req, res) {
  const { fiscalYear } = req.body ?? {};
  const result = await aiService.generateAiAlerts(fiscalYear);
  res.json(result);
}

module.exports = {
  trends, rankings, forecasting, performanceMatrix, summary,
  descriptive, varianceAnalysis, disaggregationAnalysis, costBenefit, rbmLogframe,
  aiAnomalies, aiRiskScores, aiForecasting, aiRunAlerts,
};
