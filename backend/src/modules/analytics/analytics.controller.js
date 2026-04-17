'use strict';

const prisma = require('../../config/db');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');

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

  const current  = buildPeriodRows(currentActuals,  currentTargets,  fiscalYear);
  const previous = previousFY
    ? buildPeriodRows(previousActuals, previousTargets, previousFY)
    : [];

  // Trend: compare average achievement of current vs previous
  const currentAvg  = avg(current.map(r => r.achievement));
  const previousAvg = avg(previous.map(r => r.achievement));

  let trend = 'stable';
  if (currentAvg != null && previousAvg != null) {
    if (currentAvg > previousAvg + 5) trend = 'improving';
    else if (currentAvg < previousAvg - 5) trend = 'declining';
  } else if (currentAvg != null && previousAvg == null) {
    trend = 'stable'; // no baseline for comparison
  }

  return res.json({ indicator, current, previous, trend });
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

  // Fetch approved actuals for the period
  const actuals = await prisma.indicatorActual.findMany({
    where: {
      fiscalYear,
      reportingPeriod: period,
      status: 'approved',
      NOT: { [entityIdField]: null },
    },
    select: {
      indicatorId: true,
      [entityIdField]: true,
      actualValue: true,
    },
  });

  if (actuals.length === 0) return res.json([]);

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
    entity:         entityNames[r.entityId] ?? { id: r.entityId, name: 'Unknown' },
    indicators:     r.indicators,
    avgAchievement: r.avgAchievement,
    totalActual:    r.totalActual,
    totalTarget:    r.totalTarget,
  }));

  return res.json(ranked);
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

  return res.json({
    indicator,
    fiscalYear,
    current: { q1, q2, q3, q4_actual: q4Actual },
    projected: {
      q4:     projectedQ4     != null ? Math.round(projectedQ4     * 100) / 100 : null,
      annual: projectedAnnual != null ? Math.round(projectedAnnual * 100) / 100 : null,
    },
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
    return res.json({ headers: [], rows: [] });
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

  // Build matrix rows
  const rows = institutions.map(inst => {
    const cells = indicators.map(ind => {
      const key    = `${inst.id}::${ind.id}`;
      const actual = actualMap[key];
      const target = targetMap[key];
      return safePct(actual, target);
    });
    return {
      entity: { id: inst.id, name: inst.name, code: inst.code },
      cells,
    };
  });

  return res.json({
    fiscalYear,
    period,
    headers: indicators.map(i => ({ id: i.id, name: i.name, code: i.code })),
    rows,
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
      return { entity: { id: inst.id, name: inst.name, code: inst.code }, avgAchievement: avgAch };
    })
    .filter(r => r.avgAchievement != null)
    .sort((a, b) => b.avgAchievement - a.avgAchievement);

  const top3    = instStats.slice(0, 3);
  const bottom3 = instStats.slice(-3).reverse();

  return res.json({
    fiscalYear,
    period: period || 'all',
    submissions: {
      byStatus: submissionsByStatus,
      total: totalSubmissions,
    },
    overallAchievement,
    indicators: {
      on_track:  onTrackCount,
      at_risk:   atRiskCount,
      off_track: offTrackCount,
      total:     onTrackCount + atRiskCount + offTrackCount,
    },
    complianceRate,
    topPerformers:    top3,
    bottomPerformers: bottom3,
  });
}

module.exports = { trends, rankings, forecasting, performanceMatrix, summary };
