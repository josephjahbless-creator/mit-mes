'use strict';

/**
 * AI / Predictive Analytics Service
 * - Anomaly detection via z-score
 * - Risk scoring per indicator / institution
 * - Linear regression forecast with confidence interval
 * - Auto-alert generation into Notification table
 */

const prisma = require('../../config/db');

// ── Math helpers ──────────────────────────────────────────────────────────────

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr, mu) {
  if (arr.length < 2) return 0;
  const m = mu ?? mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1));
}

function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + Math.pow(x - mx, 2), 0);
  if (!den) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

function predictNext(xs, ys) {
  const reg = linearRegression(xs, ys);
  if (!reg) return null;
  const nextX = Math.max(...xs) + 1;
  return { predicted: reg.slope * nextX + reg.intercept, slope: reg.slope };
}

// ── Anomaly Detection ─────────────────────────────────────────────────────────

async function detectAnomalies({ fiscalYear, threshold = 2.0 } = {}) {
  const fy = fiscalYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Load all approved actuals for the fiscal year
  const actuals = await prisma.indicatorActual.findMany({
    where: { fiscalYear: fy, status: 'approved' },
    include: {
      indicator: { select: { id: true, name: true, code: true } },
      institution: { select: { id: true, name: true } },
    },
  });

  // Group by indicator to compute z-scores across institutions
  const byIndicator = {};
  for (const a of actuals) {
    const id = a.indicatorId;
    if (!byIndicator[id]) byIndicator[id] = { indicator: a.indicator, points: [] };
    byIndicator[id].points.push({ actual: a, value: a.actualValue });
  }

  const anomalies = [];
  for (const { indicator, points } of Object.values(byIndicator)) {
    if (points.length < 3) continue; // need enough data for meaningful z-score
    const values = points.map(p => p.value);
    const mu = mean(values);
    const sd = stdDev(values, mu);
    if (!sd) continue;

    for (const { actual, value } of points) {
      const z = Math.abs((value - mu) / sd);
      if (z >= threshold) {
        anomalies.push({
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          indicatorCode: indicator.code,
          institutionId: actual.institutionId,
          institutionName: actual.institution?.name,
          fiscalYear: fy,
          period: actual.reportingPeriod,
          value,
          mean: mu,
          stdDev: sd,
          zScore: z,
          direction: value > mu ? 'above' : 'below',
          severity: z >= 3 ? 'high' : z >= 2.5 ? 'medium' : 'low',
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

// ── Risk Scoring ──────────────────────────────────────────────────────────────

async function computeRiskScores({ fiscalYear } = {}) {
  const fy = fiscalYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];
  const periodIdx = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

  const targets = await prisma.indicatorTarget.findMany({
    where: { fiscalYear: fy },
    include: { indicator: { select: { id: true, name: true, code: true } } },
  });

  const actuals = await prisma.indicatorActual.findMany({
    where: { fiscalYear: fy, status: 'approved' },
    select: { indicatorId: true, institutionId: true, reportingPeriod: true, actualValue: true },
  });

  // Build maps
  const actualMap = {};
  for (const a of actuals) {
    const k = `${a.indicatorId}:${a.institutionId}`;
    if (!actualMap[k]) actualMap[k] = {};
    actualMap[k][a.reportingPeriod] = a.actualValue;
  }

  const scores = [];
  for (const t of targets) {
    const annualTarget = t.annualTarget;
    if (!annualTarget) continue;

    // Find all institutions reporting on this indicator
    const indicatorActuals = actuals.filter(a => a.indicatorId === t.indicatorId);
    if (!indicatorActuals.length) continue;

    const institutionIds = [...new Set(indicatorActuals.map(a => a.institutionId))];

    for (const institutionId of institutionIds) {
      const k = `${t.indicatorId}:${institutionId}`;
      const reported = actualMap[k] ?? {};

      const values = PERIODS.map(p => reported[p]).filter(v => v !== undefined);
      const latestPeriodIdx = Math.max(...PERIODS.filter(p => reported[p] !== undefined).map(p => periodIdx[p] ?? 0));

      // Achievement rate
      const cumulative = values.reduce((s, v) => s + v, 0);
      const achievement = annualTarget ? (cumulative / annualTarget) * 100 : null;

      // Trend (improving or declining)
      const orderedVals = PERIODS.map(p => reported[p]).filter(v => v !== undefined);
      let trendScore = 0;
      if (orderedVals.length >= 2) {
        const pred = predictNext(orderedVals.map((_, i) => i), orderedVals);
        trendScore = pred?.slope ?? 0;
      }

      // Periods with no data
      const missingPeriods = PERIODS.slice(0, latestPeriodIdx).filter(p => reported[p] === undefined).length;

      // Risk score: 0 (no risk) → 100 (critical)
      let risk = 0;
      if (achievement !== null) {
        if (achievement < 25) risk += 50;
        else if (achievement < 50) risk += 35;
        else if (achievement < 75) risk += 20;
        else if (achievement >= 100) risk -= 10;
      }
      if (trendScore < 0) risk += 20;
      risk += missingPeriods * 10;
      risk = Math.min(100, Math.max(0, risk));

      const status = risk >= 70 ? 'critical' : risk >= 40 ? 'at_risk' : risk >= 20 ? 'watch' : 'on_track';

      scores.push({
        indicatorId: t.indicatorId,
        indicatorName: t.indicator.name,
        indicatorCode: t.indicator.code,
        institutionId,
        fiscalYear: fy,
        annualTarget,
        cumulativeActual: cumulative,
        achievement,
        trendSlope: trendScore,
        missingPeriods,
        riskScore: Math.round(risk),
        status,
      });
    }
  }

  return scores.sort((a, b) => b.riskScore - a.riskScore);
}

// ── Forecast ──────────────────────────────────────────────────────────────────

async function forecastIndicator({ indicatorId, fiscalYear, institutionId } = {}) {
  if (!indicatorId) throw new Error('indicatorId required');
  const fy = fiscalYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const where = { indicatorId, fiscalYear: fy, status: 'approved' };
  if (institutionId) where.institutionId = institutionId;

  const actuals = await prisma.indicatorActual.findMany({
    where,
    select: { reportingPeriod: true, actualValue: true },
    orderBy: { reportingPeriod: 'asc' },
  });

  const periodOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, Annual: 5 };
  const quarterly = actuals
    .filter(a => ['Q1','Q2','Q3','Q4'].includes(a.reportingPeriod))
    .sort((a, b) => (periodOrder[a.reportingPeriod] ?? 0) - (periodOrder[b.reportingPeriod] ?? 0));

  const xs = quarterly.map((_, i) => i + 1);
  const ys = quarterly.map(a => a.actualValue);

  const target = await prisma.indicatorTarget.findFirst({
    where: { indicatorId, fiscalYear: fy },
    select: { annualTarget: true, q1Target: true, q2Target: true, q3Target: true, q4Target: true },
  });

  const reg = linearRegression(xs, ys);
  const mu = mean(ys);
  const sd = stdDev(ys, mu);
  const currentTotal = ys.reduce((s, v) => s + v, 0);

  // Project remaining quarters
  const projections = [];
  for (let q = xs.length + 1; q <= 4; q++) {
    const predicted = reg ? reg.slope * q + reg.intercept : mu ?? 0;
    const ci95 = sd * 1.96;
    projections.push({
      period: `Q${q}`,
      predicted: Math.max(0, predicted),
      low: Math.max(0, predicted - ci95),
      high: predicted + ci95,
    });
  }

  const projectedAnnual = currentTotal + projections.reduce((s, p) => s + p.predicted, 0);
  const annualTarget = target?.annualTarget ?? null;
  const likelihood = annualTarget
    ? projectedAnnual >= annualTarget ? 'on_track'
      : projectedAnnual >= annualTarget * 0.75 ? 'at_risk'
      : 'off_track'
    : null;

  return {
    indicatorId,
    fiscalYear: fy,
    actuals: quarterly.map(a => ({ period: a.reportingPeriod, value: a.actualValue })),
    projections,
    currentTotal,
    projectedAnnual: Math.round(projectedAnnual * 100) / 100,
    annualTarget,
    likelihood,
    regressionSlope: reg?.slope ?? null,
    trend: reg?.slope > 0.5 ? 'improving' : reg?.slope < -0.5 ? 'declining' : 'stable',
  };
}

// ── Auto-alert generation ─────────────────────────────────────────────────────

async function generateAiAlerts(fiscalYear) {
  const fy = fiscalYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const [anomalies, risks] = await Promise.all([
    detectAnomalies({ fiscalYear: fy, threshold: 2.5 }),
    computeRiskScores({ fiscalYear: fy }),
  ]);

  // Get all M&E officers and admins to notify
  const officers = await prisma.user.findMany({
    where: { role: { in: ['super_admin', 'admin', 'me_officer'] }, isActive: true },
    select: { id: true },
  });
  const officerIds = officers.map(u => u.id);

  let created = 0;

  // Notify for critical risk items
  for (const r of risks.filter(r => r.status === 'critical').slice(0, 10)) {
    for (const userId of officerIds) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          relatedType: 'ai_risk',
          relatedId: `${r.indicatorId}:${r.institutionId}:${fy}`,
          createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) }, // dedupe within 24h
        },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: {
          userId,
          type: 'ai_alert',
          title: `Critical Risk: ${r.indicatorName}`,
          message: `Achievement at ${r.achievement?.toFixed(1) ?? '—'}% with risk score ${r.riskScore}/100. Immediate attention required.`,
          relatedType: 'ai_risk',
          relatedId: `${r.indicatorId}:${r.institutionId}:${fy}`,
        },
      });
      created++;
    }
  }

  // Notify for high-severity anomalies
  for (const a of anomalies.filter(a => a.severity === 'high').slice(0, 5)) {
    for (const userId of officerIds) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          relatedType: 'ai_anomaly',
          relatedId: `${a.indicatorId}:${a.institutionId}:${a.period}:${fy}`,
          createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: {
          userId,
          type: 'ai_alert',
          title: `Data Anomaly Detected: ${a.indicatorName}`,
          message: `${a.institutionName} reported ${a.value} in ${a.period}, which is ${a.direction} the expected range by ${a.zScore.toFixed(1)} standard deviations.`,
          relatedType: 'ai_anomaly',
          relatedId: `${a.indicatorId}:${a.institutionId}:${a.period}:${fy}`,
        },
      });
      created++;
    }
  }

  return { anomaliesFound: anomalies.length, risksFound: risks.filter(r => r.status === 'critical').length, alertsCreated: created };
}

module.exports = { detectAnomalies, computeRiskScores, forecastIndicator, generateAiAlerts };
