const prisma = require('../../config/db');
const { calculate } = require('../../utils/formulaEngine');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');

// Tanzania FY: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
const QUARTER_MONTHS = {
  Q1: ['Jul', 'Aug', 'Sep'],
  Q2: ['Oct', 'Nov', 'Dec'],
  Q3: ['Jan', 'Feb', 'Mar'],
  Q4: ['Apr', 'May', 'Jun'],
};
const ALL_MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];

async function nationalOverview(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period = 'Q1' } = req.query;

  const [institutions, indicators, actuals, budgetSummary, projectStats] = await Promise.all([
    prisma.institution.count({ where: { isActive: true } }),
    prisma.indicator.count({ where: { isActive: true } }),
    prisma.indicatorActual.findMany({
      where: { fiscalYear, reportingPeriod: period, status: 'approved' },
      include: {
        indicator: { select: { formulaType: true, formulaConfig: true, baselineValue: true } },
      },
    }),
    prisma.budgetPlan.findMany({
      where: { fiscalYear },
      include: { expenditures: { where: { status: 'approved' } } },
    }),
    prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
  ]);

  const totalBudget = budgetSummary.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = budgetSummary.reduce((s, p) => s + p.expenditures.reduce((e, ex) => e + ex.amount, 0), 0);

  const submissions = await prisma.indicatorActual.groupBy({
    by: ['status'],
    where: { fiscalYear, reportingPeriod: period },
    _count: { id: true },
  });

  const submissionSummary = submissions.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, { draft: 0, submitted: 0, approved: 0, rejected: 0 });

  const projectSummary = projectStats.reduce((acc, s) => { acc[s.status] = s._count.id; return acc; }, {});

  res.json({
    fiscalYear, period,
    stats: {
      institutions,
      indicators,
      submissions: submissionSummary,
      budget: {
        total: totalBudget,
        spent: totalSpent,
        absorptionRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
      },
      projects: {
        total:     Object.values(projectSummary).reduce((a, b) => a + b, 0),
        ongoing:   projectSummary.ongoing   || 0,
        completed: projectSummary.completed || 0,
        delayed:   projectSummary.delayed   || 0,
        planned:   projectSummary.planned   || 0,
      },
    },
  });
}

async function institutionOverview(req, res) {
  const { fiscalYear = getCurrentFiscalYear() } = req.query;
  const institutionId = req.params.id;

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, code: true, region: true },
  });
  if (!institution) return res.status(404).json({ error: 'Not found' });

  const [actuals, plans, projects] = await Promise.all([
    prisma.indicatorActual.findMany({
      where: { institutionId, fiscalYear },
      include: {
        indicator: { select: { id: true, name: true, code: true, unit: true, formulaType: true, formulaConfig: true, baselineValue: true } },
      },
      orderBy: [{ reportingPeriod: 'asc' }],
    }),
    prisma.budgetPlan.findMany({
      where: { institutionId, fiscalYear },
      include: {
        activity: { select: { id: true, name: true } },
        expenditures: { where: { status: 'approved' }, select: { amount: true, period: true } },
      },
    }),
    prisma.project.findMany({
      where: { institutionId },
      include: {
        expenditures: { select: { amount: true } },
        milestones:   { select: { id: true, status: true } },
        activities:   { select: { id: true, isCompleted: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalBudget = plans.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent  = plans.reduce((s, p) => s + p.expenditures.reduce((e, ex) => e + ex.amount, 0), 0);

  const projectSummary = projects.map(p => {
    const spent   = p.expenditures.reduce((s, e) => s + e.amount, 0);
    const msTotal = p.milestones.length;
    const msDone  = p.milestones.filter(m => m.status === 'completed').length;
    const actTotal = p.activities.length;
    const actDone  = p.activities.filter(a => a.isCompleted).length;
    const progressPct = Math.round(
      ((msTotal  > 0 ? msDone  / msTotal  : 0) * 0.4 +
       (actTotal > 0 ? actDone / actTotal : 0) * 0.35 +
       (p.totalBudget > 0 ? Math.min(spent / p.totalBudget, 1) : 0) * 0.25) * 100
    );
    return {
      id: p.id, name: p.name, code: p.code, status: p.status,
      totalBudget: p.totalBudget, spent, balance: p.totalBudget - spent,
      progressPct, startDate: p.startDate, endDate: p.endDate,
    };
  });

  res.json({
    institution,
    fiscalYear,
    actuals,
    budget: {
      plans: plans.length,
      totalBudget,
      totalSpent,
      variance: totalBudget - totalSpent,
      absorptionRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
    },
    projects: {
      total:     projects.length,
      ongoing:   projects.filter(p => p.status === 'ongoing').length,
      completed: projects.filter(p => p.status === 'completed').length,
      delayed:   projects.filter(p => p.status === 'delayed').length,
      totalBudget: projects.reduce((s, p) => s + p.totalBudget, 0),
      list: projectSummary,
    },
  });
}

async function performanceDashboard(req, res) {
  const { fiscalYear = getCurrentFiscalYear() } = req.query;

  // Fetch indicators with targets + actuals for the fiscal year
  const indicators = await prisma.indicator.findMany({
    where: { isActive: true },
    include: {
      targets: { where: { fiscalYear } },
      actuals: { where: { fiscalYear, status: 'approved' }, orderBy: { reportingPeriod: 'asc' } },
      output: { include: { outcome: { include: { objective: { select: { id: true, name: true } } } } } },
    },
  });

  // Fetch all activities with critical flag
  const allActivities = await prisma.activity.findMany({
    include: { output: { include: { outcome: { include: { objective: { select: { id: true, name: true } } } } } } },
  });
  const totalActivities = allActivities.length;

  // Fetch budget plans with per-period expenditures
  const budgetPlans = await prisma.budgetPlan.findMany({
    where: { fiscalYear },
    include: { expenditures: { where: { status: 'approved' }, select: { amount: true, period: true } } },
  });

  // ── Activity / Indicator performance ─────────────────────────────────────
  let onTrack = 0, delayed = 0, notStarted = 0, implemented = 0;
  const indicatorPerformance = [];

  for (const ind of indicators) {
    const target = ind.targets[0];
    const actualsMap = {};
    for (const a of ind.actuals) actualsMap[a.reportingPeriod] = a.actualValue;

    const hasAny = ind.actuals.length > 0;
    if (!hasAny) { notStarted++; }
    else { implemented++; }

    const periods = ['Q1','Q2','Q3','Q4'].filter(p => actualsMap[p] !== undefined);
    const latestPeriod = periods[periods.length - 1];

    if (target && latestPeriod) {
      const targetKey = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target' }[latestPeriod];
      const periodTarget = target[targetKey];
      const actual = actualsMap[latestPeriod];
      if (periodTarget !== null && periodTarget > 0) {
        if (actual >= periodTarget) onTrack++;
        else delayed++;
      } else if (periodTarget === 0) {
        onTrack++;
      }
    }

    const q1T = target?.q1Target ?? null;
    const q2T = target?.q2Target ?? null;
    const q1A = actualsMap['Q1'] ?? null;
    const q2A = actualsMap['Q2'] ?? null;
    const annualT = target?.annualTarget ?? null;

    const q1Pct = (q1T && q1A !== null) ? Math.round((q1A / q1T) * 100) : null;
    const q2Pct = (q2T && q2A !== null) ? Math.round((q2A / q2T) * 100) : null;

    indicatorPerformance.push({
      code: ind.code,
      name: ind.name,
      unit: ind.unit,
      objectiveId: ind.output?.outcome?.objective?.id ?? null,
      objectiveName: ind.output?.outcome?.objective?.name ?? '',
      q1Target: q1T,
      q1Actual: q1A,
      q1Achievement: q1Pct,
      q2Target: q2T,
      q2Actual: q2A,
      q2Achievement: q2Pct,
      annualTarget: annualT,
    });
  }

  // ── Budget breakdown ──────────────────────────────────────────────────────
  const quarterlyBudget = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const quarterlyExpend = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const plan of budgetPlans) {
    quarterlyBudget.Q1 += plan.q1Budget || 0;
    quarterlyBudget.Q2 += plan.q2Budget || 0;
    quarterlyBudget.Q3 += plan.q3Budget || 0;
    quarterlyBudget.Q4 += plan.q4Budget || 0;
    for (const exp of plan.expenditures) {
      if (quarterlyExpend[exp.period] !== undefined) quarterlyExpend[exp.period] += exp.amount;
    }
  }

  const quarterly = ['Q1','Q2','Q3','Q4'].map(q => ({
    period: q,
    planned: quarterlyBudget[q],
    actual: quarterlyExpend[q],
    balance: quarterlyBudget[q] - quarterlyExpend[q],
  }));

  const monthly = ALL_MONTHS.map((month, idx) => {
    const qIdx = Math.floor(idx / 3);
    const q = ['Q1','Q2','Q3','Q4'][qIdx];
    const planned = Math.round(quarterlyBudget[q] / 3);
    const actual = Math.round(quarterlyExpend[q] / 3);
    return { month, planned, actual, balance: planned - actual };
  });

  const weekly = ALL_MONTHS.map((month, idx) => {
    const qIdx = Math.floor(idx / 3);
    const q = ['Q1','Q2','Q3','Q4'][qIdx];
    const monthlyPlanned = Math.round(quarterlyBudget[q] / 3);
    const monthlyActual = Math.round(quarterlyExpend[q] / 3);
    return [1,2,3,4].map(w => ({
      week: `${month} W${w}`,
      planned: Math.round(monthlyPlanned / 4),
      actual: Math.round(monthlyActual / 4),
      balance: Math.round((monthlyPlanned - monthlyActual) / 4),
    }));
  }).flat();

  // ── Critical activities with percentage breakdown ─────────────────────────
  const indicatorsByOutput = {};
  for (const ind of indicators) {
    if (!indicatorsByOutput[ind.outputId]) indicatorsByOutput[ind.outputId] = [];
    indicatorsByOutput[ind.outputId].push(ind);
  }

  const criticalActivities = allActivities
    .filter(a => a.isCritical)
    .map(a => {
      const outputIndicators = indicatorsByOutput[a.outputId] || [];
      let status = 'not_started';
      for (const ind of outputIndicators) {
        const actualsMap = {};
        for (const ac of ind.actuals) actualsMap[ac.reportingPeriod] = ac.actualValue;
        const target = ind.targets[0];
        const periods = ['Q1','Q2','Q3','Q4'].filter(p => actualsMap[p] !== undefined);
        const latestPeriod = periods[periods.length - 1];
        if (!latestPeriod) continue;
        const targetKey = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target' }[latestPeriod];
        const periodTarget = target?.[targetKey];
        const actual = actualsMap[latestPeriod];
        if (actual !== undefined) {
          if (periodTarget !== null && periodTarget > 0) {
            status = actual >= periodTarget ? 'on_track' : 'delayed';
          } else {
            status = 'implemented';
          }
        }
      }
      return {
        id: a.id,
        name: a.name,
        objective: a.output?.outcome?.objective?.name?.substring(0, 60) ?? '',
        output: a.output?.name?.substring(0, 80) ?? '',
        status,
      };
    });

  // Critical activities percentage breakdown
  const totalCritical = criticalActivities.length;
  const criticalByStatus = criticalActivities.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const criticalPct = {};
  for (const [status, count] of Object.entries(criticalByStatus)) {
    criticalPct[status] = totalCritical > 0 ? Math.round((count / totalCritical) * 100) : 0;
  }
  const needAttentionCount = (criticalByStatus.delayed || 0) + (criticalByStatus.not_started || 0);
  const needAttentionPct = totalCritical > 0 ? Math.round((needAttentionCount / totalCritical) * 100) : 0;

  // ── Objective-level performance (activity contribution) ───────────────────
  const objectiveMap = {};
  for (const act of allActivities) {
    const objId = act.output?.outcome?.objective?.id;
    const objName = act.output?.outcome?.objective?.name;
    if (!objId) continue;
    if (!objectiveMap[objId]) {
      objectiveMap[objId] = {
        id: objId,
        name: objName,
        totalActivities: 0,
        implementedActivities: 0,
        onTrackActivities: 0,
        delayedActivities: 0,
        indicatorAchievements: [],
      };
    }
    objectiveMap[objId].totalActivities++;

    // Determine activity status from linked output indicators
    const outputInds = indicatorsByOutput[act.outputId] || [];
    let actStatus = 'not_started';
    for (const ind of outputInds) {
      const aMap = {};
      for (const ac of ind.actuals) aMap[ac.reportingPeriod] = ac.actualValue;
      const periods = ['Q1','Q2','Q3','Q4'].filter(p => aMap[p] !== undefined);
      if (periods.length === 0) continue;
      const latestPeriod = periods[periods.length - 1];
      const target = ind.targets[0];
      const targetKey = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target' }[latestPeriod];
      const periodTarget = target?.[targetKey];
      const actual = aMap[latestPeriod];
      if (actual !== undefined) {
        if (periodTarget !== null && periodTarget > 0) {
          actStatus = actual >= periodTarget ? 'on_track' : 'delayed';
        } else {
          actStatus = 'implemented';
        }
      }
    }
    if (actStatus !== 'not_started') objectiveMap[objId].implementedActivities++;
    if (actStatus === 'on_track') objectiveMap[objId].onTrackActivities++;
    if (actStatus === 'delayed') objectiveMap[objId].delayedActivities++;
  }

  // Add indicator achievement to each objective
  for (const ind of indicators) {
    const objId = ind.output?.outcome?.objective?.id;
    if (!objId || !objectiveMap[objId]) continue;
    const q2Pct = ind.actuals.length > 0 ? (() => {
      const aMap = {};
      for (const a of ind.actuals) aMap[a.reportingPeriod] = a.actualValue;
      const t = ind.targets[0];
      if (!t) return null;
      const q2A = aMap['Q2'] ?? aMap['Q1'] ?? null;
      const q2T = aMap['Q2'] !== undefined ? (t.q2Target ?? null) : (t.q1Target ?? null);
      return (q2T && q2A !== null) ? Math.round((q2A / q2T) * 100) : null;
    })() : null;
    if (q2Pct !== null) objectiveMap[objId].indicatorAchievements.push(q2Pct);
  }

  // Only show the 8 MIT national strategic objectives on the national dashboard
  const NATIONAL_OBJECTIVE_IDS = ['so-A','so-B','so-C','so-D','so-E','so-F','so-X','so-Y'];

  const objectivePerformance = Object.values(objectiveMap)
    .filter(obj => NATIONAL_OBJECTIVE_IDS.includes(obj.id))
    .sort((a, b) => NATIONAL_OBJECTIVE_IDS.indexOf(a.id) - NATIONAL_OBJECTIVE_IDS.indexOf(b.id))
    .map(obj => {
      const avgAchievement = obj.indicatorAchievements.length > 0
        ? Math.round(obj.indicatorAchievements.reduce((s, v) => s + v, 0) / obj.indicatorAchievements.length)
        : null;
      const activityContributionPct = obj.totalActivities > 0
        ? Math.round((obj.implementedActivities / obj.totalActivities) * 100)
        : 0;
      return {
        id: obj.id,
        name: obj.name,
        totalActivities: obj.totalActivities,
        implementedActivities: obj.implementedActivities,
        onTrackActivities: obj.onTrackActivities,
        delayedActivities: obj.delayedActivities,
        activityContributionPct,
        avgIndicatorAchievement: avgAchievement,
      };
    });

  res.json({
    fiscalYear,
    activities: {
      total: totalActivities,
      implemented,
      onTrack,
      delayed,
      notStarted,
      critical: criticalActivities,
      criticalPct,
      needAttentionCount,
      needAttentionPct,
    },
    indicatorPerformance,
    objectivePerformance,
    budget: { quarterly, monthly, weekly: weekly.slice(0, 24) },
  });
}

// ── All institutions performance ──────────────────────────────────────────────
async function allInstitutionsPerformance(req, res) {
  const { fiscalYear = getCurrentFiscalYear() } = req.query;

  const institutions = await prisma.institution.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, region: true },
    orderBy: { name: 'asc' },
  });

  const results = await Promise.all(institutions.map(async (inst) => {
    const [actuals, plans, projects] = await Promise.all([
      prisma.indicatorActual.findMany({
        where: { institutionId: inst.id, fiscalYear },
        include: { indicator: { select: { id: true } } },
      }),
      prisma.budgetPlan.findMany({
        where: { institutionId: inst.id, fiscalYear },
        include: { expenditures: { where: { status: 'approved' }, select: { amount: true } } },
      }),
      prisma.project.findMany({
        where: { institutionId: inst.id },
        include: { expenditures: { select: { amount: true } } },
      }),
    ]);

    const totalBudget = plans.reduce((s, p) => s + p.totalBudget, 0);
    const totalSpent = plans.reduce((s, p) => s + p.expenditures.reduce((e, ex) => e + ex.amount, 0), 0);

    const approved  = actuals.filter(a => a.status === 'approved').length;
    const submitted = actuals.filter(a => a.status === 'submitted').length;
    const total     = actuals.length;

    const projectBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
    const projectSpent  = projects.reduce((s, p) => s + p.expenditures.reduce((e, ex) => e + ex.amount, 0), 0);

    return {
      ...inst,
      actuals: { total, approved, submitted, pending: total - approved - submitted },
      budget: {
        totalBudget,
        totalSpent,
        absorptionRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0,
      },
      projects: {
        total:     projects.length,
        ongoing:   projects.filter(p => p.status === 'ongoing').length,
        completed: projects.filter(p => p.status === 'completed').length,
        delayed:   projects.filter(p => p.status === 'delayed').length,
        totalBudget: projectBudget,
        totalSpent:  projectSpent,
      },
    };
  }));

  res.json({ fiscalYear, institutions: results });
}

// ── Department / Unit performance ─────────────────────────────────────────────
async function departmentPerformance(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period = 'H1' } = req.query;

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: {
      units: { where: { isActive: true }, orderBy: { orderNo: 'asc' } },
    },
    orderBy: { orderNo: 'asc' },
  });

  const results = await Promise.all(departments.map(async (dept) => {
    // Get all budget items for this department (aggregated)
    const deptBudget = await prisma.itemizedBudget.aggregate({
      where: { departmentId: dept.id, fiscalYear, ...(period !== 'all' ? { period } : {}) },
      _sum: {
        budgetA: true,
        fundAllocationB: true,
        expenditureToDate: true,
        commitmentToDate: true,
        totalCommitExpendC: true,
        fundBalanceBC: true,
        budgetBalanceAB: true,
      },
    });

    // Other charges for this department
    const otherCharges = await prisma.itemizedBudget.aggregate({
      where: { departmentId: dept.id, fiscalYear, isOtherCharges: true, ...(period !== 'all' ? { period } : {}) },
      _sum: {
        budgetA: true,
        expenditureToDate: true,
        fundAllocationB: true,
      },
    });

    // Per-unit breakdown
    const unitResults = await Promise.all(dept.units.map(async (unit) => {
      const unitBudget = await prisma.itemizedBudget.aggregate({
        where: { unitId: unit.id, fiscalYear, ...(period !== 'all' ? { period } : {}) },
        _sum: {
          budgetA: true,
          fundAllocationB: true,
          expenditureToDate: true,
          totalCommitExpendC: true,
          fundBalanceBC: true,
          budgetBalanceAB: true,
        },
      });
      const unitOther = await prisma.itemizedBudget.aggregate({
        where: { unitId: unit.id, fiscalYear, isOtherCharges: true, ...(period !== 'all' ? { period } : {}) },
        _sum: { budgetA: true, expenditureToDate: true, fundAllocationB: true },
      });

      const ub = unitBudget._sum.budgetA || 0;
      const uSpent = unitBudget._sum.expenditureToDate || 0;
      const uAlloc = unitBudget._sum.fundAllocationB || 0;
      const uOtherBudget = unitOther._sum.budgetA || 0;
      const uOtherSpent = unitOther._sum.expenditureToDate || 0;

      return {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        budget: ub,
        allocated: uAlloc,
        spent: uSpent,
        balance: unitBudget._sum.fundBalanceBC || 0,
        absorptionRate: uAlloc > 0 ? Math.round((uSpent / uAlloc) * 10000) / 100 : 0,
        otherCharges: {
          budget: uOtherBudget,
          spent: uOtherSpent,
          balance: uOtherBudget - uOtherSpent,
          utilizationRate: uOtherBudget > 0 ? Math.round((uOtherSpent / uOtherBudget) * 10000) / 100 : 0,
        },
      };
    }));

    const db = deptBudget._sum.budgetA || 0;
    const dSpent = deptBudget._sum.expenditureToDate || 0;
    const dAlloc = deptBudget._sum.fundAllocationB || 0;
    const dOtherBudget = otherCharges._sum.budgetA || 0;
    const dOtherSpent = otherCharges._sum.expenditureToDate || 0;

    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      budget: db,
      allocated: dAlloc,
      spent: dSpent,
      balance: deptBudget._sum.fundBalanceBC || 0,
      absorptionRate: dAlloc > 0 ? Math.round((dSpent / dAlloc) * 10000) / 100 : 0,
      otherCharges: {
        budget: dOtherBudget,
        spent: dOtherSpent,
        balance: dOtherBudget - dOtherSpent,
        utilizationRate: dOtherBudget > 0 ? Math.round((dOtherSpent / dOtherBudget) * 10000) / 100 : 0,
      },
      units: unitResults,
    };
  }));

  res.json({ fiscalYear, period, departments: results });
}

// ── Industry statistics ───────────────────────────────────────────────────────
async function industryStatistics(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period } = req.query;

  const where = { fiscalYear, ...(period ? { period } : {}) };

  const stats = await prisma.industryStatistics.findMany({
    where,
    orderBy: { reportDate: 'desc' },
  });

  // Aggregate totals
  const totals = stats.reduce((acc, s) => {
    acc.totalRegistered += s.totalRegistered;
    acc.operating += s.operating;
    acc.closed += s.closed;
    acc.newRegistered += s.newRegistered;
    return acc;
  }, { totalRegistered: 0, operating: 0, closed: 0, newRegistered: 0 });

  // By sector
  const bySector = {};
  for (const s of stats) {
    if (!s.sector) continue;
    if (!bySector[s.sector]) bySector[s.sector] = { sector: s.sector, totalRegistered: 0, operating: 0, closed: 0, newRegistered: 0 };
    bySector[s.sector].totalRegistered += s.totalRegistered;
    bySector[s.sector].operating += s.operating;
    bySector[s.sector].closed += s.closed;
    bySector[s.sector].newRegistered += s.newRegistered;
  }

  // By region
  const byRegion = {};
  for (const s of stats) {
    if (!s.region) continue;
    if (!byRegion[s.region]) byRegion[s.region] = { region: s.region, totalRegistered: 0, operating: 0 };
    byRegion[s.region].totalRegistered += s.totalRegistered;
    byRegion[s.region].operating += s.operating;
  }

  res.json({
    fiscalYear,
    totals,
    bySector: Object.values(bySector),
    byRegion: Object.values(byRegion),
    latestReport: stats[0]?.reportDate ?? null,
  });
}

// ── Itemized budget report ────────────────────────────────────────────────────
async function itemizedBudgetReport(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period, departmentId, unitId, institutionId } = req.query;

  const where = {
    fiscalYear,
    ...(period ? { period } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(unitId ? { unitId } : {}),
    ...(institutionId ? { institutionId } : {}),
  };

  const items = await prisma.itemizedBudget.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true } },
      unit: { select: { id: true, name: true, code: true } },
      institution: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ departmentId: 'asc' }, { unitId: 'asc' }, { accountCode: 'asc' }],
  });

  // Aggregate totals
  const totals = items.reduce((acc, item) => {
    acc.budgetA += item.budgetA;
    acc.fundAllocationB += item.fundAllocationB;
    acc.expenditurePrevMonth += item.expenditurePrevMonth;
    acc.expenditureThisMonth += item.expenditureThisMonth;
    acc.expenditureToDate += item.expenditureToDate;
    acc.commitmentToDate += item.commitmentToDate;
    acc.totalCommitExpendC += item.totalCommitExpendC;
    acc.fundBalanceBC += item.fundBalanceBC;
    acc.budgetBalanceAB += item.budgetBalanceAB;
    return acc;
  }, {
    budgetA: 0, fundAllocationB: 0, expenditurePrevMonth: 0,
    expenditureThisMonth: 0, expenditureToDate: 0, commitmentToDate: 0,
    totalCommitExpendC: 0, fundBalanceBC: 0, budgetBalanceAB: 0,
  });

  // Group by department > unit for summary
  const deptSummary = {};
  for (const item of items) {
    const dKey = item.departmentId || 'unassigned';
    const dName = item.department?.name ?? 'Unassigned';
    if (!deptSummary[dKey]) deptSummary[dKey] = { id: dKey, name: dName, code: item.department?.code ?? '', items: [], units: {}, totals: { budgetA: 0, expenditureToDate: 0, fundBalanceBC: 0, totalCommitExpendC: 0 } };
    deptSummary[dKey].totals.budgetA += item.budgetA;
    deptSummary[dKey].totals.expenditureToDate += item.expenditureToDate;
    deptSummary[dKey].totals.fundBalanceBC += item.fundBalanceBC;
    deptSummary[dKey].totals.totalCommitExpendC += item.totalCommitExpendC;

    const uKey = item.unitId || 'none';
    if (!deptSummary[dKey].units[uKey]) deptSummary[dKey].units[uKey] = { id: uKey, name: item.unit?.name ?? 'General', items: [] };
    deptSummary[dKey].units[uKey].items.push(item);
  }

  res.json({
    fiscalYear,
    period: period || 'all',
    items,
    totals,
    summary: Object.values(deptSummary).map(d => ({
      ...d,
      units: Object.values(d.units),
    })),
  });
}

async function listIndustryStatistics(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period } = req.query;
  const where = { fiscalYear, ...(period ? { period } : {}) };
  const records = await prisma.industryStatistics.findMany({
    where,
    orderBy: [{ period: 'asc' }, { sector: 'asc' }],
  });
  res.json(records);
}

async function createIndustryStatistics(req, res) {
  const { fiscalYear, period, sector, region, totalRegistered, operating, closed, newRegistered, reportDate } = req.body;
  if (!fiscalYear || !period) return res.status(400).json({ error: 'fiscalYear and period are required' });
  const record = await prisma.industryStatistics.create({
    data: {
      fiscalYear, period,
      sector: sector || null,
      region: region || null,
      totalRegistered: parseInt(totalRegistered) || 0,
      operating: parseInt(operating) || 0,
      closed: parseInt(closed) || 0,
      newRegistered: parseInt(newRegistered) || 0,
      reportDate: reportDate ? new Date(reportDate) : new Date(),
    },
  });
  res.status(201).json(record);
}

async function updateIndustryStatistics(req, res) {
  const { id } = req.params;
  const { sector, region, totalRegistered, operating, closed, newRegistered, reportDate } = req.body;
  const record = await prisma.industryStatistics.update({
    where: { id },
    data: {
      sector: sector ?? undefined,
      region: region ?? undefined,
      totalRegistered: totalRegistered != null ? parseInt(totalRegistered) : undefined,
      operating: operating != null ? parseInt(operating) : undefined,
      closed: closed != null ? parseInt(closed) : undefined,
      newRegistered: newRegistered != null ? parseInt(newRegistered) : undefined,
      reportDate: reportDate ? new Date(reportDate) : undefined,
    },
  });
  res.json(record);
}

async function deleteIndustryStatistics(req, res) {
  await prisma.industryStatistics.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = {
  nationalOverview,
  institutionOverview,
  performanceDashboard,
  allInstitutionsPerformance,
  departmentPerformance,
  industryStatistics,
  listIndustryStatistics,
  createIndustryStatistics,
  updateIndustryStatistics,
  deleteIndustryStatistics,
  itemizedBudgetReport,
};
