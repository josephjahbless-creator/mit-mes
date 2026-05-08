/**
 * Automated Insight Engine
 * Generates plain-language narrative insights after data approvals
 * and on a scheduled national-level sweep.
 */
const prisma = require('../config/db');

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function severity(achievementPct) {
  if (achievementPct == null) return 'info';
  if (achievementPct >= 100) return 'info';
  if (achievementPct >= 75)  return 'warning';
  return 'critical';
}

/**
 * Resolve the period label before a given one (Q1→null, Q2→Q1, etc.)
 */
function prevPeriod(period) {
  const order = ['Q1', 'Q2', 'Q3', 'Q4'];
  const i = order.indexOf(period);
  return i > 0 ? order[i - 1] : null;
}

// ── Per-submission insights (called after ME approval) ─────────────────────────

/**
 * generateSubmissionInsights(actualId)
 * Runs after a submission is approved by the M&E officer.
 * Writes 1-3 SystemInsight rows for the submission.
 */
async function generateSubmissionInsights(actualId) {
  try {
    const actual = await prisma.indicatorActual.findUnique({
      where: { id: actualId },
      include: {
        indicator: { select: { id: true, name: true, unit: true, progressDirection: true } },
        institution: { select: { id: true, name: true } },
      },
    });
    if (!actual) return;

    const { indicatorId, institutionId, fiscalYear, reportingPeriod, value } = actual;
    const { indicator, institution } = actual;

    // Clear stale insights for the same slot
    await prisma.systemInsight.deleteMany({
      where: { actualId },
    });

    const insights = [];

    // ── 1. Achievement vs target ─────────────────────────────────────────────
    const target = await prisma.indicatorTarget.findFirst({
      where: { indicatorId, institutionId, fiscalYear },
    });

    const periodTargetKey = {
      Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget',
    }[reportingPeriod];
    const periodTarget = target?.[periodTargetKey] ?? target?.annualTarget ?? null;

    if (value != null && periodTarget != null && periodTarget > 0) {
      const achPct = (value / periodTarget) * 100;
      const directionOk = indicator.progressDirection === 'decreasing'
        ? value <= periodTarget
        : value >= periodTarget;
      const statusWord = directionOk ? 'achieved' : (achPct >= 75 ? 'nearly met' : 'below');
      const headline = directionOk
        ? `Target achieved — ${fmt(achPct)}% of ${fmt(periodTarget)} ${indicator.unit || ''}`
        : `${fmt(Math.abs(100 - achPct).toFixed(0))}% below target`;

      let narrative = `${institution.name} reported ${fmt(value)} ${indicator.unit || ''} for ${indicator.name} in ${reportingPeriod} ${fiscalYear}. `;
      narrative += `The period target was ${fmt(periodTarget)} ${indicator.unit || ''}, `;
      narrative += directionOk
        ? `which has been ${statusWord} at ${fmt(achPct)}% performance.`
        : `leaving a gap of ${fmt(Math.abs(periodTarget - value))} ${indicator.unit || ''} (${fmt(achPct)}% achievement).`;

      insights.push({
        scope: 'submission',
        indicatorId,
        actualId,
        institutionId,
        fiscalYear,
        period: reportingPeriod,
        insightType: 'achievement',
        severity: severity(achPct),
        headline,
        narrative,
        value,
        target: periodTarget,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
    }

    // ── 2. Quarter-over-quarter trend ────────────────────────────────────────
    const prev = prevPeriod(reportingPeriod);
    if (prev && value != null) {
      const prevActual = await prisma.indicatorActual.findFirst({
        where: {
          indicatorId,
          institutionId,
          fiscalYear,
          reportingPeriod: prev,
          status: 'approved',
        },
        select: { value: true },
      });

      if (prevActual?.value != null) {
        const chg = pctChange(value, prevActual.value);
        const direction = indicator.progressDirection;
        const isImprovement =
          chg == null ? null :
          direction === 'decreasing' ? chg < 0 :
          direction === 'stable'     ? Math.abs(chg) < 5 :
          chg > 0;

        if (chg != null) {
          const changeWord = chg >= 0 ? `+${fmt(chg)}%` : `${fmt(chg)}%`;
          const headline = isImprovement
            ? `Improving — ${changeWord} vs ${prev}`
            : `Declining — ${changeWord} vs ${prev}`;
          const narrative = `Compared to ${prev} ${fiscalYear} (${fmt(prevActual.value)} ${indicator.unit || ''}), this ${reportingPeriod} value of ${fmt(value)} represents a ${changeWord} change. ${isImprovement ? 'The trend is positive.' : 'This warrants attention.'}`;

          insights.push({
            scope: 'submission',
            indicatorId,
            actualId,
            institutionId,
            fiscalYear,
            period: reportingPeriod,
            insightType: 'trend',
            severity: isImprovement ? 'info' : 'warning',
            headline,
            narrative,
            value,
            previousValue: prevActual.value,
            changePercent: chg,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    // ── 3. Annual projection (if not Q4) ────────────────────────────────────
    if (value != null && reportingPeriod !== 'Q4' && reportingPeriod !== 'Annual') {
      // Collect all approved actuals for this indicator/institution this year
      const yearActuals = await prisma.indicatorActual.findMany({
        where: { indicatorId, institutionId, fiscalYear, status: 'approved' },
        select: { value: true, reportingPeriod: true },
      });

      const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      const currentQNo = qOrder[reportingPeriod] || 0;
      const sum = yearActuals.reduce((s, a) => s + (a.value ?? 0), 0);
      const projected = currentQNo > 0 ? (sum / currentQNo) * 4 : null;

      const annualTarget = target?.annualTarget ?? null;
      if (projected != null && annualTarget != null) {
        const projPct = (projected / annualTarget) * 100;
        const headline = projPct >= 100
          ? `On track to meet annual target (${fmt(projPct)}% projected)`
          : `Annual projection: ${fmt(projPct)}% of target`;
        const narrative = `Based on ${currentQNo} quarter(s) of data, the projected annual total is approximately ${fmt(projected)} ${indicator.unit || ''}. The annual target is ${fmt(annualTarget)} ${indicator.unit || ''}, suggesting ${projPct >= 100 ? 'full achievement' : `a shortfall of ${fmt(Math.abs(annualTarget - projected))} ${indicator.unit || ''}`} by year end.`;

        insights.push({
          scope: 'submission',
          indicatorId,
          actualId,
          institutionId,
          fiscalYear,
          period: reportingPeriod,
          insightType: 'forecast',
          severity: projPct >= 100 ? 'info' : projPct >= 75 ? 'warning' : 'critical',
          headline,
          narrative,
          value: projected,
          target: annualTarget,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Persist all insights
    if (insights.length > 0) {
      await prisma.systemInsight.createMany({ data: insights });
    }
  } catch (err) {
    console.error('[InsightEngine] generateSubmissionInsights error:', err.message);
  }
}

// ── National-level insights (called daily by scheduler) ───────────────────────

/**
 * generateNationalInsights(fiscalYear, period)
 * Runs each morning. Generates system-wide insights visible on the dashboard.
 */
async function generateNationalInsights(fiscalYear, period) {
  try {
    // Remove stale national insights for this period (refresh daily)
    await prisma.systemInsight.deleteMany({
      where: { scope: { in: ['national', 'institution'] }, fiscalYear, period },
    });

    const insights = [];

    // ── 1. Overall performance ────────────────────────────────────────────────
    const actuals = await prisma.indicatorActual.findMany({
      where: { fiscalYear, reportingPeriod: period, status: 'approved' },
      include: {
        indicator: { select: { id: true, name: true, unit: true } },
        institution: { select: { id: true, name: true } },
      },
    });

    const targets = await prisma.indicatorTarget.findMany({
      where: { fiscalYear },
    });
    const targetMap = {};
    targets.forEach(t => {
      targetMap[`${t.indicatorId}__${t.institutionId}`] = t;
    });

    const periodKey = {
      Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget',
    }[period] || 'annualTarget';

    let achievedCount = 0, totalWithTarget = 0;
    const institutionScores = {};

    for (const a of actuals) {
      const t = targetMap[`${a.indicatorId}__${a.institutionId}`];
      const tval = t?.[periodKey];
      if (tval == null || tval === 0 || a.value == null) continue;
      totalWithTarget++;
      const achPct = (a.value / tval) * 100;
      if (achPct >= 100) achievedCount++;

      // Per-institution aggregation
      const iid = a.institutionId;
      if (!institutionScores[iid]) institutionScores[iid] = { name: a.institution.name, scores: [] };
      institutionScores[iid].scores.push(achPct);
    }

    if (totalWithTarget > 0) {
      const overallPct = (achievedCount / totalWithTarget) * 100;
      const headline = `${fmt(overallPct)}% of indicators on-target`;
      const narrative = `As of ${period} ${fiscalYear}, ${achievedCount} out of ${totalWithTarget} indicators with defined targets are meeting or exceeding their targets across all reporting institutions.`;

      insights.push({
        scope: 'national',
        fiscalYear,
        period,
        insightType: 'achievement',
        severity: severity(overallPct),
        headline,
        narrative,
        value: achievedCount,
        target: totalWithTarget,
        changePercent: overallPct,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    }

    // ── 2. Lagging institutions ───────────────────────────────────────────────
    const laggingThreshold = 60;
    const laggingInstitutions = Object.entries(institutionScores)
      .map(([iid, { name, scores }]) => ({
        iid,
        name,
        avg: scores.reduce((s, v) => s + v, 0) / scores.length,
      }))
      .filter(x => x.avg < laggingThreshold)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5);

    for (const inst of laggingInstitutions) {
      insights.push({
        scope: 'institution',
        institutionId: inst.iid,
        fiscalYear,
        period,
        insightType: 'lagging',
        severity: inst.avg < 40 ? 'critical' : 'warning',
        headline: `${inst.name} averaging ${fmt(inst.avg)}% achievement`,
        narrative: `${inst.name} is averaging ${fmt(inst.avg)}% across its indicators in ${period} ${fiscalYear}, which is below the ${laggingThreshold}% performance threshold and may require targeted support.`,
        value: inst.avg,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    }

    // ── 3. Missing submissions ────────────────────────────────────────────────
    const allInstitutions = await prisma.institution.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const reportingInstitutionIds = new Set(actuals.map(a => a.institutionId));
    const nonReporting = allInstitutions.filter(i => !reportingInstitutionIds.has(i.id));

    if (nonReporting.length > 0 && allInstitutions.length > 0) {
      const pct = (nonReporting.length / allInstitutions.length) * 100;
      const names = nonReporting.slice(0, 3).map(i => i.name).join(', ');
      const more = nonReporting.length > 3 ? ` and ${nonReporting.length - 3} more` : '';

      insights.push({
        scope: 'national',
        fiscalYear,
        period,
        insightType: 'risk',
        severity: pct > 50 ? 'critical' : 'warning',
        headline: `${nonReporting.length} institution(s) yet to submit for ${period}`,
        narrative: `${nonReporting.length} of ${allInstitutions.length} active institutions have no approved data for ${period} ${fiscalYear}: ${names}${more}. This affects the completeness of national aggregates.`,
        value: nonReporting.length,
        target: allInstitutions.length,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    }

    // ── 4. Budget utilisation ─────────────────────────────────────────────────
    const [totalBudget, totalExpended] = await Promise.all([
      prisma.budgetPlan.aggregate({ where: { fiscalYear }, _sum: { totalBudget: true } }),
      prisma.expenditure.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
    ]);

    const budgetTotal = totalBudget._sum.totalBudget ?? 0;
    const expTotal = totalExpended._sum.amount ?? 0;
    if (budgetTotal > 0) {
      const utilPct = (expTotal / budgetTotal) * 100;
      insights.push({
        scope: 'national',
        fiscalYear,
        period,
        insightType: 'achievement',
        severity: utilPct < 30 && period !== 'Q1' ? 'warning' : 'info',
        headline: `Budget utilisation: ${fmt(utilPct)}%`,
        narrative: `As of ${period} ${fiscalYear}, TZS ${fmt(expTotal)} has been expended out of TZS ${fmt(budgetTotal)} approved budget — a utilisation rate of ${fmt(utilPct)}%.`,
        value: expTotal,
        target: budgetTotal,
        changePercent: utilPct,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    }

    if (insights.length > 0) {
      await prisma.systemInsight.createMany({ data: insights });
    }

    console.log(`[InsightEngine] Generated ${insights.length} national insights for ${period} ${fiscalYear}`);
  } catch (err) {
    console.error('[InsightEngine] generateNationalInsights error:', err.message);
  }
}

// ── Per-indicator trend summary (for indicator detail page) ────────────────────

/**
 * getIndicatorTrendSummary(indicatorId, institutionId, fiscalYear)
 * Returns a ready-made narrative sentence for the indicator detail page.
 * Does NOT write to DB — computed on demand.
 */
async function getIndicatorTrendSummary(indicatorId, fiscalYear) {
  try {
    const actuals = await prisma.indicatorActual.findMany({
      where: { indicatorId, fiscalYear, status: 'approved' },
      orderBy: [{ reportingPeriod: 'asc' }],
      select: { value: true, reportingPeriod: true, institutionId: true },
    });

    if (actuals.length < 2) return null;

    // Aggregate by period (sum across institutions)
    const byPeriod = {};
    for (const a of actuals) {
      if (a.value == null) continue;
      byPeriod[a.reportingPeriod] = (byPeriod[a.reportingPeriod] ?? 0) + a.value;
    }

    const periods = ['Q1', 'Q2', 'Q3', 'Q4'].filter(p => byPeriod[p] != null);
    if (periods.length < 2) return null;

    const first = byPeriod[periods[0]];
    const last  = byPeriod[periods[periods.length - 1]];
    const chg   = pctChange(last, first);
    if (chg == null) return null;

    const dir = chg > 5 ? 'increasing' : chg < -5 ? 'decreasing' : 'stable';
    const dirWord = dir === 'increasing' ? 'increased' : dir === 'decreasing' ? 'decreased' : 'remained stable';
    return `Performance has ${dirWord} from ${fmt(first)} in ${periods[0]} to ${fmt(last)} in ${periods[periods.length - 1]} ${fiscalYear} (${chg >= 0 ? '+' : ''}${fmt(chg)}%).`;
  } catch {
    return null;
  }
}

module.exports = {
  generateSubmissionInsights,
  generateNationalInsights,
  getIndicatorTrendSummary,
};
