const ExcelJS = require('exceljs');
const prisma = require('../../config/db');
const { calculate } = require('../../utils/formulaEngine');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');

// ── Period → target field map ──────────────────────────────────────────────────
const PERIOD_TARGET_KEY = {
  Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget',
};

// ── Performance helpers ────────────────────────────────────────────────────────
function calcPct(actual, target) {
  if (target == null || target === 0) return null;
  return Math.round(((actual || 0) / target) * 1000) / 10; // 1 decimal place
}

function avgPerf(values) {
  const valid = values.filter(v => v != null);
  if (!valid.length) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

// ── Individual indicator report ────────────────────────────────────────────────
async function indicatorReport(req, res) {
  const { fiscalYear = getCurrentFiscalYear() } = req.query;
  const indicator = await prisma.indicator.findUnique({
    where: { id: req.params.id },
    include: { output: { include: { outcome: { include: { objective: true } } } } },
  });
  if (!indicator) return res.status(404).json({ error: 'Not found' });

  const [actuals, targets] = await Promise.all([
    prisma.indicatorActual.findMany({
      where: { indicatorId: req.params.id, fiscalYear },
      include: { institution: { select: { id: true, name: true, code: true } } },
      orderBy: [{ reportingPeriod: 'asc' }],
    }),
    prisma.indicatorTarget.findMany({
      where: { indicatorId: req.params.id, fiscalYear },
      include: { institution: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  const targetMap = {};
  targets.forEach(t => { targetMap[t.institutionId] = t; });

  const enriched = actuals.map(a => {
    const t      = targetMap[a.institutionId];
    const target = t?.[PERIOD_TARGET_KEY[a.reportingPeriod]];
    const calculated = calculate(indicator.formulaType, indicator.formulaConfig, {
      actualValue: a.actualValue, baselineValue: indicator.baselineValue, target, extraFields: a.extraFields,
    });
    return { ...a, target, calculated };
  });

  res.json({ indicator, fiscalYear, actuals: enriched, targets });
}

// ── Institution report ─────────────────────────────────────────────────────────
async function institutionReport(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period } = req.query;
  const requestedId = req.params.id;

  // data_collector, admin, and viewer are scoped to their own institution;
  // super_admin and me_officer can view any institution's report
  const canViewAny = ['super_admin', 'me_officer'].includes(req.user.role);
  const institutionId = canViewAny ? requestedId : req.user.institutionId;

  // If a non-privileged user requests a different institution, silently scope to their own
  // (avoids information leakage about whether the other institution ID exists)
  if (!canViewAny && requestedId !== req.user.institutionId) {
    return res.status(403).json({ error: 'You can only view your own institution\'s report' });
  }

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) return res.status(404).json({ error: 'Not found' });

  const where = { institutionId, fiscalYear };
  if (period) where.reportingPeriod = period;

  const actuals = await prisma.indicatorActual.findMany({
    where,
    include: {
      indicator: { include: { output: { include: { outcome: { include: { objective: true } } } } } },
    },
    orderBy: [{ reportingPeriod: 'asc' }],
  });

  res.json({ institution, fiscalYear, period, actuals });
}

// ── Consolidated hierarchical report ──────────────────────────────────────────
async function consolidatedReport(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period     = 'Annual',
    ownerType,
    ownerInstitutionId,
    ownerDepartmentId,
    ownerUnitId,
  } = req.query;

  const targetKey      = PERIOD_TARGET_KEY[period] || 'annualTarget';
  const hasEntityFilter = !!(ownerInstitutionId || ownerDepartmentId || ownerUnitId);

  // ── Shared indicator include (hierarchy + owner labels) ───────────────────
  const INDICATOR_INCLUDE = {
    output: {
      include: {
        activities: {
          orderBy: { orderNo: 'asc' },
          include: {
            responsibleInstitution: { select: { id: true, name: true, code: true } },
            responsibleDepartment:  { select: { id: true, name: true, code: true } },
            responsibleUnit:        { select: { id: true, name: true, code: true } },
          },
        },
        outcome: {
          include: {
            objective: { select: { id: true, name: true, orderNo: true } },
          },
        },
      },
    },
    ownerInstitution: { select: { id: true, name: true, code: true } },
    ownerDepartment:  { select: { id: true, name: true, code: true } },
    ownerUnit:        { select: { id: true, name: true, code: true } },
  };

  // ── Step 1: Discover indicator IDs via TWO parallel paths ─────────────────
  //   Path A — indicators whose "owner" field matches the selected entity
  //   Path B — indicators that have actuals submitted by the selected entity
  // Union of A ∪ B ensures nothing is missed whether or not ownerDept is set.

  const actualEntityWhere = {
    fiscalYear,
    reportingPeriod: period,
    status: { in: ['submitted', 'approved'] },
  };
  if (ownerInstitutionId) actualEntityWhere.institutionId = ownerInstitutionId;
  if (ownerDepartmentId)  actualEntityWhere.departmentId  = ownerDepartmentId;
  if (ownerUnitId)        actualEntityWhere.unitId        = ownerUnitId;

  const ownerIndicatorWhere = { isActive: true };
  if (ownerType)           ownerIndicatorWhere.ownerType           = ownerType;
  if (ownerInstitutionId)  ownerIndicatorWhere.ownerInstitutionId  = ownerInstitutionId;
  if (ownerDepartmentId)   ownerIndicatorWhere.ownerDepartmentId   = ownerDepartmentId;
  if (ownerUnitId)         ownerIndicatorWhere.ownerUnitId         = ownerUnitId;

  const [submittedActualIds, ownerIndIds] = await Promise.all([
    hasEntityFilter
      ? prisma.indicatorActual.findMany({
          where:  actualEntityWhere,
          select: { indicatorId: true, institutionId: true },
        })
      : Promise.resolve([]),
    prisma.indicator.findMany({
      where:  ownerIndicatorWhere,
      select: { id: true },
    }),
  ]);

  // Collect institution IDs from submissions (needed for dept/unit target lookup)
  const submittedInstIds = [...new Set(submittedActualIds.map(a => a.institutionId).filter(Boolean))];

  const indicatorIdSet = new Set([
    ...ownerIndIds.map(i => i.id),
    ...submittedActualIds.map(a => a.indicatorId),
  ]);

  if (indicatorIdSet.size === 0 && hasEntityFilter) {
    return res.json({
      fiscalYear, period, performance: null, objectives: [],
      summary: { total: 0, onTrack: 0, moderate: 0, offTrack: 0, noData: 0 },
    });
  }

  // ── Step 2: Fetch full indicator data ──────────────────────────────────────
  const indicatorWhere = { isActive: true };
  if (indicatorIdSet.size > 0) indicatorWhere.id = { in: [...indicatorIdSet] };

  const indicators = await prisma.indicator.findMany({
    where:   indicatorWhere,
    include: INDICATOR_INCLUDE,
    orderBy: { code: 'asc' },
  });

  if (!indicators.length) {
    return res.json({
      fiscalYear, period, performance: null, objectives: [],
      summary: { total: 0, onTrack: 0, moderate: 0, offTrack: 0, noData: 0 },
    });
  }

  const indicatorIds = indicators.map(i => i.id);

  // ── Step 3: Fetch targets scoped to the entity ─────────────────────────────
  // For institution filter → only that institution's targets
  // For dept/unit filter   → institutions derived from the submitted actuals
  // For no filter          → sum all institutions (national aggregate)
  const targetWhere = { indicatorId: { in: indicatorIds }, fiscalYear };
  if (ownerInstitutionId) {
    targetWhere.institutionId = ownerInstitutionId;
  } else if ((ownerDepartmentId || ownerUnitId) && submittedInstIds.length > 0) {
    targetWhere.institutionId = { in: submittedInstIds };
  }

  // ── Step 4: Fetch actuals scoped to the entity ────────────────────────────
  const actualsWhere = {
    indicatorId:     { in: indicatorIds },
    fiscalYear,
    reportingPeriod: period,
    status:          { in: ['submitted', 'approved'] },
  };
  if (ownerInstitutionId) actualsWhere.institutionId = ownerInstitutionId;
  if (ownerDepartmentId)  actualsWhere.departmentId  = ownerDepartmentId;
  if (ownerUnitId)        actualsWhere.unitId        = ownerUnitId;

  const [targets, actuals] = await Promise.all([
    prisma.indicatorTarget.findMany({ where: targetWhere }),
    prisma.indicatorActual.findMany({ where: actualsWhere }),
  ]);

  // ── Step 5: Aggregate maps ─────────────────────────────────────────────────
  const targetMap = {};
  targets.forEach(t => {
    const v = t[targetKey];
    if (v != null) targetMap[t.indicatorId] = (targetMap[t.indicatorId] || 0) + v;
  });

  const actualMap = {};
  actuals.forEach(a => {
    if (a.actualValue != null)
      actualMap[a.indicatorId] = (actualMap[a.indicatorId] || 0) + a.actualValue;
  });

  // ── Step 6: Build bottom-up hierarchy maps ────────────────────────────────
  const outputMap    = new Map();
  const outcomeMap   = new Map();
  const objectiveMap = new Map();

  indicators.forEach(ind => {
    const op  = ind.output;
    const oc  = op?.outcome;
    const obj = oc?.objective;
    if (!op || !oc || !obj) return;

    const performance = calcPct(actualMap[ind.id] ?? 0, targetMap[ind.id]);

    const indEntry = {
      id:          ind.id,
      code:        ind.code,
      name:        ind.name,
      unit:        ind.unit,
      ownerType:   ind.ownerType,
      ownerName:   ind.ownerInstitution?.name || ind.ownerDepartment?.name || ind.ownerUnit?.name || null,
      ownerCode:   ind.ownerInstitution?.code || ind.ownerDepartment?.code || ind.ownerUnit?.code || null,
      baseline:    ind.baselineValue,
      target:      targetMap[ind.id]  ?? null,
      actual:      actualMap[ind.id]  ?? null,
      performance,
    };

    if (!outputMap.has(op.id)) {
      outputMap.set(op.id, {
        id:        op.id,
        name:      op.name,
        orderNo:   op.orderNo,
        outcomeId: oc.id,
        activities: op.activities.map(a => ({
          id:          a.id,
          name:        a.name,
          orderNo:     a.orderNo,
          weight:      a.weight,
          isCritical:  a.isCritical,
          responsible: a.responsibleUnit?.name || a.responsibleDepartment?.name || a.responsibleInstitution?.name || null,
        })),
        indicators: [],
      });
    }
    outputMap.get(op.id).indicators.push(indEntry);

    if (!outcomeMap.has(oc.id)) {
      outcomeMap.set(oc.id, { id: oc.id, name: oc.name, orderNo: oc.orderNo, objectiveId: obj.id, outputIds: new Set() });
    }
    outcomeMap.get(oc.id).outputIds.add(op.id);

    if (!objectiveMap.has(obj.id)) {
      objectiveMap.set(obj.id, { id: obj.id, name: obj.name, orderNo: obj.orderNo, outcomeIds: new Set() });
    }
    objectiveMap.get(obj.id).outcomeIds.add(oc.id);
  });

  // ── Step 7: Bottom-up performance aggregation ─────────────────────────────
  outputMap.forEach(op  => { op.performance  = avgPerf(op.indicators.map(i => i.performance)); });
  outcomeMap.forEach(oc => { oc.performance  = avgPerf([...oc.outputIds].map(id => outputMap.get(id)?.performance ?? null)); });
  objectiveMap.forEach(obj => { obj.performance = avgPerf([...obj.outcomeIds].map(id => outcomeMap.get(id)?.performance ?? null)); });

  // ── Step 8: Assemble nested structure ─────────────────────────────────────
  const objectives = [...objectiveMap.values()]
    .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
    .map(({ outcomeIds, ...obj }) => ({
      ...obj,
      outcomes: [...outcomeIds]
        .map(ocId => {
          const { outputIds, ...oc } = outcomeMap.get(ocId);
          return {
            ...oc,
            outputs: [...outputIds]
              .map(opId => outputMap.get(opId))
              .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0)),
          };
        })
        .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0)),
    }));

  // ── Step 9: Summary statistics ─────────────────────────────────────────────
  const allPerfs   = indicators.map(i => calcPct(actualMap[i.id] ?? 0, targetMap[i.id]));
  const withTarget = allPerfs.filter(p => p != null);
  const summary = {
    total:    indicators.length,
    onTrack:  withTarget.filter(p => p >= 90).length,
    moderate: withTarget.filter(p => p >= 60 && p < 90).length,
    offTrack: withTarget.filter(p => p < 60).length,
    noData:   allPerfs.filter(p => p == null).length,
  };

  res.json({ fiscalYear, period, performance: avgPerf(allPerfs), objectives, summary });
}

// ── Export Excel ───────────────────────────────────────────────────────────────
async function exportExcel(req, res) {
  const { type, id, fiscalYear = getCurrentFiscalYear(), period } = req.body;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MIT M&E System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Performance Report');

  sheet.addRow(['MINISTRY OF INDUSTRY AND TRADE']);
  sheet.addRow([`M&E Performance Report — FY ${fiscalYear}${period ? ` (${period})` : ''}`]);
  sheet.addRow([]);
  sheet.addRow([
    'Indicator Code', 'Indicator Name', 'Unit', 'Owner', 'Baseline',
    'Target', 'Actual', 'Performance %', 'Status',
  ]);

  const headerRow = sheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A6B' } };

  // Discover indicators from both owner assignment AND actual submissions
  const ownerWhere = { isActive: true };
  if (type === 'institution' && id)  ownerWhere.ownerInstitutionId = id;
  if (type === 'department'  && id)  ownerWhere.ownerDepartmentId  = id;
  if (type === 'unit'        && id)  ownerWhere.ownerUnitId        = id;

  const actualEntityFilter = {};
  if (type === 'institution' && id) actualEntityFilter.institutionId = id;
  if (type === 'department'  && id) actualEntityFilter.departmentId  = id;
  if (type === 'unit'        && id) actualEntityFilter.unitId        = id;

  const [ownerInds, submittedInds] = await Promise.all([
    prisma.indicator.findMany({ where: ownerWhere, select: { id: true } }),
    Object.keys(actualEntityFilter).length > 0
      ? prisma.indicatorActual.findMany({
          where: { ...actualEntityFilter, fiscalYear, status: { in: ['submitted', 'approved'] } },
          select: { indicatorId: true, institutionId: true },
        })
      : Promise.resolve([]),
  ]);

  const submittedInstIds = [...new Set(submittedInds.map(a => a.institutionId).filter(Boolean))];
  const allIndIds = [...new Set([...ownerInds.map(i => i.id), ...submittedInds.map(a => a.indicatorId)])];

  const indicators = await prisma.indicator.findMany({
    where: allIndIds.length > 0 ? { id: { in: allIndIds }, isActive: true } : ownerWhere,
    include: {
      ownerInstitution: { select: { name: true } },
      ownerDepartment:  { select: { name: true } },
      ownerUnit:        { select: { name: true } },
    },
    orderBy: { code: 'asc' },
  });

  if (indicators.length) {
    const ids        = indicators.map(i => i.id);
    const targetKey  = PERIOD_TARGET_KEY[period] || 'annualTarget';

    // Scope targets to the entity
    const targetFilter = { indicatorId: { in: ids }, fiscalYear };
    if (type === 'institution' && id) targetFilter.institutionId = id;
    else if ((type === 'department' || type === 'unit') && submittedInstIds.length > 0)
      targetFilter.institutionId = { in: submittedInstIds };

    // Scope actuals to the entity
    const actualsFilter = {
      indicatorId: { in: ids },
      fiscalYear,
      ...(period ? { reportingPeriod: period } : {}),
      status: { in: ['submitted', 'approved'] },
      ...actualEntityFilter,
    };

    const [targets, actuals] = await Promise.all([
      prisma.indicatorTarget.findMany({ where: targetFilter }),
      prisma.indicatorActual.findMany({ where: actualsFilter }),
    ]);

    const tMap = {};
    targets.forEach(t => {
      const v = t[targetKey];
      if (v != null) tMap[t.indicatorId] = (tMap[t.indicatorId] || 0) + v;
    });
    const aMap = {};
    actuals.forEach(a => {
      if (a.actualValue != null) aMap[a.indicatorId] = (aMap[a.indicatorId] || 0) + a.actualValue;
    });

    for (const ind of indicators) {
      const target = tMap[ind.id] ?? null;
      const actual = aMap[ind.id] ?? null;
      const perf   = calcPct(actual ?? 0, target);
      const status = perf == null ? 'No Data' : perf >= 90 ? 'On Track' : perf >= 60 ? 'Moderate' : 'Off Track';
      const owner  = ind.ownerInstitution?.name || ind.ownerDepartment?.name || ind.ownerUnit?.name || '—';

      const row = sheet.addRow([
        ind.code, ind.name, ind.unit, owner,
        ind.baselineValue ?? '', target ?? '', actual ?? '',
        perf != null ? perf / 100 : '',
        status,
      ]);

      // Color-code performance cell
      if (perf != null) {
        const perfCell = row.getCell(8);
        perfCell.numFmt = '0.0%';
        const color = perf >= 90 ? 'FF16a34a' : perf >= 60 ? 'FFd97706' : 'FFdc2626';
        perfCell.font = { bold: true, color: { argb: color } };
      }
    }
  }

  sheet.columns.forEach(col => { col.width = 22; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=MIT-MES-Report-${fiscalYear}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

// ── PDF Report (HTML rendered in browser, printable to PDF) ────────────────────
async function exportPdf(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period     = 'Annual',
    ownerInstitutionId,
    ownerDepartmentId,
    ownerUnitId,
    title      = 'Performance Report',
  } = req.body;

  const targetKey = PERIOD_TARGET_KEY[period] || 'annualTarget';

  // ── Fetch all active indicators with full hierarchy ────────────────────────
  const indicatorWhere = { isActive: true };
  if (ownerInstitutionId) indicatorWhere.ownerInstitutionId = ownerInstitutionId;
  if (ownerDepartmentId)  indicatorWhere.ownerDepartmentId  = ownerDepartmentId;
  if (ownerUnitId)        indicatorWhere.ownerUnitId        = ownerUnitId;

  const indicators = await prisma.indicator.findMany({
    where:   indicatorWhere,
    orderBy: { code: 'asc' },
    include: {
      output: {
        include: {
          outcome: { include: { objective: { select: { id: true, name: true, orderNo: true } } } },
        },
      },
      ownerInstitution: { select: { name: true, code: true } },
      ownerDepartment:  { select: { name: true, code: true } },
      ownerUnit:        { select: { name: true, code: true } },
    },
  });

  if (!indicators.length) return res.status(404).json({ error: 'No indicators found for this filter' });

  const ids = indicators.map(i => i.id);

  // Scope targets and actuals
  const targetFilter  = { indicatorId: { in: ids }, fiscalYear };
  const actualsFilter = { indicatorId: { in: ids }, fiscalYear, reportingPeriod: period, status: { in: ['submitted', 'approved'] } };
  if (ownerInstitutionId) { targetFilter.institutionId = ownerInstitutionId; actualsFilter.institutionId = ownerInstitutionId; }
  if (ownerDepartmentId)  actualsFilter.departmentId = ownerDepartmentId;
  if (ownerUnitId)        actualsFilter.unitId        = ownerUnitId;

  const [targets, actuals] = await Promise.all([
    prisma.indicatorTarget.findMany({ where: targetFilter }),
    prisma.indicatorActual.findMany({ where: actualsFilter, include: { submittedBy: { select: { name: true } } } }),
  ]);

  // Build aggregate maps
  const tMap = {};
  targets.forEach(t => { const v = t[targetKey]; if (v != null) tMap[t.indicatorId] = (tMap[t.indicatorId] || 0) + v; });
  const aMap = {};
  actuals.forEach(a => { if (a.actualValue != null) aMap[a.indicatorId] = (aMap[a.indicatorId] || 0) + a.actualValue; });

  // Group indicators by objective
  const objMap = new Map();
  for (const ind of indicators) {
    const obj = ind.output?.outcome?.objective;
    if (!obj) continue;
    if (!objMap.has(obj.id)) objMap.set(obj.id, { ...obj, indicators: [] });
    const tVal = tMap[ind.id] ?? null;
    const aVal = aMap[ind.id] ?? null;
    const pct  = tVal != null && tVal > 0 && aVal != null ? Math.round((aVal / tVal) * 100) : null;
    const owner = ind.ownerUnit?.name || ind.ownerDepartment?.name || ind.ownerInstitution?.name || null;
    objMap.get(obj.id).indicators.push({ ...ind, tVal, aVal, pct, owner });
  }

  const objectives  = [...objMap.values()].sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
  const total       = indicators.length;
  const onTrack     = indicators.filter(i => { const p = calcPct(aMap[i.id] ?? 0, tMap[i.id]); return p != null && p >= 75; }).length;
  const offTrack    = indicators.filter(i => { const p = calcPct(aMap[i.id] ?? 0, tMap[i.id]); return p != null && p < 75; }).length;
  const noData      = total - onTrack - offTrack;
  const overallPct  = total > 0 ? Math.round((onTrack / total) * 100) : 0;
  const now         = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const clr = p => p == null ? '#94a3b8' : p >= 75 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626';
  const bg  = p => p == null ? '#f8fafc'  : p >= 75 ? '#f0fdf4' : p >= 50 ? '#fffbeb' : '#fef2f2';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — FY ${fiscalYear} ${period}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e293b;background:#fff}
  @media print{
    .no-print{display:none!important}
    body{font-size:9.5px}
    .obj-section{page-break-inside:avoid}
  }
  .header{background:#1d4ed8;color:#fff;padding:22px 32px;display:flex;align-items:center;justify-content:space-between}
  .header h1{font-size:17px;font-weight:700;line-height:1.3}
  .header p{font-size:11px;color:#bfdbfe;margin-top:5px}
  .summary{display:flex;gap:12px;padding:16px 32px;background:#f8fafc;border-bottom:2px solid #e2e8f0}
  .sbox{flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
  .snum{font-size:26px;font-weight:900;line-height:1}
  .slabel{font-size:9.5px;color:#64748b;margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
  .content{padding:20px 32px}
  .obj-section{margin-bottom:20px}
  .obj-header{background:#1e3a5f;color:#fff;padding:9px 14px;border-radius:5px 5px 0 0;font-weight:700;font-size:11.5px}
  table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none}
  th{background:#f1f5f9;text-align:left;padding:7px 10px;font-size:9.5px;color:#475569;border-bottom:2px solid #e2e8f0;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;line-height:1.35}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:700;font-size:10px}
  .footer{padding:14px 32px;background:#f8fafc;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;color:#94a3b8;font-size:10px;margin-top:8px}
  .print-btn{position:fixed;top:14px;right:14px;background:#1d4ed8;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;z-index:100;box-shadow:0 4px 12px rgba(29,78,216,.35)}
  .print-btn:hover{background:#1e40af}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save as PDF</button>

<div class="header">
  <div>
    <h1>Ministry of Industry &amp; Trade — M&amp;E Performance Report</h1>
    <p>${title} &nbsp;·&nbsp; Fiscal Year ${fiscalYear} &nbsp;·&nbsp; Period: <strong>${period}</strong></p>
  </div>
  <div style="text-align:right;opacity:.8">
    <p style="font-size:10px;color:#93c5fd">Generated</p>
    <p style="font-size:11px;font-weight:700">${now}</p>
  </div>
</div>

<div class="summary">
  <div class="sbox"><div class="snum" style="color:#1d4ed8">${total}</div><div class="slabel">Total Indicators</div></div>
  <div class="sbox"><div class="snum" style="color:#16a34a">${onTrack}</div><div class="slabel">On Track ≥75%</div></div>
  <div class="sbox"><div class="snum" style="color:#dc2626">${offTrack}</div><div class="slabel">Below Target</div></div>
  <div class="sbox"><div class="snum" style="color:#94a3b8">${noData}</div><div class="slabel">No Data</div></div>
  <div class="sbox"><div class="snum" style="color:${clr(overallPct)}">${overallPct}%</div><div class="slabel">Overall Performance</div></div>
</div>

<div class="content">
${objectives.map(obj => `
  <div class="obj-section">
    <div class="obj-header">${obj.name}</div>
    <table>
      <thead>
        <tr>
          <th style="width:6%">#</th>
          <th style="width:9%">Code</th>
          <th style="width:30%">Indicator</th>
          <th style="width:10%">Unit</th>
          <th style="width:11%">Owner</th>
          <th style="width:10%">Target (${period})</th>
          <th style="width:10%">Actual</th>
          <th style="width:14%">Performance</th>
        </tr>
      </thead>
      <tbody>
        ${obj.indicators.map((ind, i) => `
        <tr style="background:${bg(ind.pct)}">
          <td style="color:#94a3b8">${i + 1}</td>
          <td><code style="font-size:9.5px;background:#f1f5f9;padding:1px 5px;border-radius:3px">${ind.code}</code></td>
          <td style="font-size:10.5px">${ind.name}</td>
          <td style="color:#64748b">${ind.unit || '—'}</td>
          <td style="font-size:9.5px;color:#64748b">${ind.owner || '—'}</td>
          <td style="text-align:right;font-weight:600">${ind.tVal != null ? ind.tVal.toLocaleString() : '—'}</td>
          <td style="text-align:right;font-weight:700;color:${ind.aVal != null ? '#1e293b' : '#94a3b8'}">${ind.aVal != null ? ind.aVal.toLocaleString() : '—'}</td>
          <td style="text-align:center">
            ${ind.pct != null
              ? `<span class="badge" style="background:${bg(ind.pct)};color:${clr(ind.pct)};border:1px solid ${clr(ind.pct)}33">${ind.pct}%</span>`
              : '<span style="color:#94a3b8;font-size:10px">No data</span>'
            }
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
`).join('')}
</div>

<div class="footer">
  <span>MIT M&amp;E System &nbsp;·&nbsp; CONFIDENTIAL</span>
  <span>FY ${fiscalYear} &nbsp;·&nbsp; ${period} Performance Report</span>
  <span>Ministry of Industry and Trade, United Republic of Tanzania</span>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// ── Server-side PDF via Puppeteer ─────────────────────────────────────────────
async function exportPdfServer(req, res) {
  // Re-use the HTML from exportPdf, then render to actual PDF bytes via Puppeteer
  let htmlContent = '';
  const mockRes = {
    setHeader: () => {},
    send: (body) => { htmlContent = body; },
  };

  // Call the existing exportPdf logic to generate HTML
  await exportPdf(req, mockRes);

  if (!htmlContent) {
    return res.status(500).json({ error: 'Failed to generate HTML for PDF' });
  }

  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const { fiscalYear = 'FY', period = 'Annual' } = req.body;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=MIT-MES-Report-${fiscalYear}-${period}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── Word (.docx) export ────────────────────────────────────────────────────────
async function exportDocx(req, res) {
  const {
    fiscalYear = getCurrentFiscalYear(),
    period     = 'Annual',
    ownerInstitutionId,
    ownerDepartmentId,
    ownerUnitId,
    title      = 'Performance Report',
  } = req.body;

  const targetKey = PERIOD_TARGET_KEY[period] || 'annualTarget';

  const indicatorWhere = { isActive: true };
  if (ownerInstitutionId) indicatorWhere.ownerInstitutionId = ownerInstitutionId;
  if (ownerDepartmentId)  indicatorWhere.ownerDepartmentId  = ownerDepartmentId;
  if (ownerUnitId)        indicatorWhere.ownerUnitId        = ownerUnitId;

  const indicators = await prisma.indicator.findMany({
    where: indicatorWhere,
    orderBy: { code: 'asc' },
    include: {
      output: { include: { outcome: { include: { objective: { select: { id: true, name: true, orderNo: true } } } } } },
      ownerInstitution: { select: { name: true } },
      ownerDepartment:  { select: { name: true } },
      ownerUnit:        { select: { name: true } },
    },
  });

  const ids = indicators.map(i => i.id);
  const targetFilter  = { indicatorId: { in: ids }, fiscalYear };
  const actualsFilter = { indicatorId: { in: ids }, fiscalYear, reportingPeriod: period, status: { in: ['submitted', 'approved'] } };
  if (ownerInstitutionId) { targetFilter.institutionId = ownerInstitutionId; actualsFilter.institutionId = ownerInstitutionId; }

  const [targets, actuals] = await Promise.all([
    ids.length ? prisma.indicatorTarget.findMany({ where: targetFilter }) : [],
    ids.length ? prisma.indicatorActual.findMany({ where: actualsFilter }) : [],
  ]);

  const tMap = {};
  targets.forEach(t => { const v = t[targetKey]; if (v != null) tMap[t.indicatorId] = (tMap[t.indicatorId] || 0) + v; });
  const aMap = {};
  actuals.forEach(a => { if (a.actualValue != null) aMap[a.indicatorId] = (aMap[a.indicatorId] || 0) + a.actualValue; });

  // Group by objective
  const objMap = new Map();
  for (const ind of indicators) {
    const obj = ind.output?.outcome?.objective;
    if (!obj) continue;
    if (!objMap.has(obj.id)) objMap.set(obj.id, { ...obj, rows: [] });
    const tVal = tMap[ind.id] ?? null;
    const aVal = aMap[ind.id] ?? null;
    const pct  = tVal && tVal > 0 && aVal != null ? `${Math.round((aVal / tVal) * 100)}%` : 'N/A';
    const owner = ind.ownerUnit?.name || ind.ownerDepartment?.name || ind.ownerInstitution?.name || '—';
    objMap.get(obj.id).rows.push({ code: ind.code, name: ind.name, unit: ind.unit || '—', owner, target: tVal ?? '—', actual: aVal ?? '—', pct });
  }

  // Build plain-text Word-compatible content using a simple XML approach
  // We use docx-style XML embedded in an HTML that Word can open
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const objectives = [...objMap.values()].sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));

  let tableRows = '';
  for (const obj of objectives) {
    tableRows += `
      <tr>
        <td colspan="7" style="background:#1e3a5f;color:white;font-weight:bold;padding:6px 8px;font-size:12pt">
          ${obj.name}
        </td>
      </tr>
      <tr style="background:#f1f5f9;font-weight:bold;font-size:10pt">
        <td style="padding:5px 8px">Code</td>
        <td style="padding:5px 8px">Indicator</td>
        <td style="padding:5px 8px">Unit</td>
        <td style="padding:5px 8px">Owner</td>
        <td style="padding:5px 8px;text-align:right">Target</td>
        <td style="padding:5px 8px;text-align:right">Actual</td>
        <td style="padding:5px 8px;text-align:center">Achievement</td>
      </tr>
      ${obj.rows.map(r => `
      <tr style="font-size:10pt">
        <td style="padding:4px 8px;font-family:monospace">${r.code}</td>
        <td style="padding:4px 8px">${r.name}</td>
        <td style="padding:4px 8px">${r.unit}</td>
        <td style="padding:4px 8px">${r.owner}</td>
        <td style="padding:4px 8px;text-align:right">${typeof r.target === 'number' ? r.target.toLocaleString() : r.target}</td>
        <td style="padding:4px 8px;text-align:right;font-weight:bold">${typeof r.actual === 'number' ? r.actual.toLocaleString() : r.actual}</td>
        <td style="padding:4px 8px;text-align:center;font-weight:bold;color:${r.pct === 'N/A' ? '#94a3b8' : parseInt(r.pct) >= 75 ? '#16a34a' : parseInt(r.pct) >= 50 ? '#d97706' : '#dc2626'}">${r.pct}</td>
      </tr>`).join('')}
    `;
  }

  // Word-compatible HTML (mhtml)
  const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; }
    h1   { font-size: 18pt; color: #1d4ed8; }
    h2   { font-size: 13pt; color: #1e3a5f; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td, th { border: 1px solid #e2e8f0; }
    p.meta { color: #64748b; font-size: 10pt; margin: 4px 0; }
  </style>
</head>
<body>
  <h1>Ministry of Industry &amp; Trade — M&amp;E Performance Report</h1>
  <p class="meta">${title} &nbsp;|&nbsp; Fiscal Year ${fiscalYear} &nbsp;|&nbsp; Period: ${period}</p>
  <p class="meta">Generated: ${now} &nbsp;|&nbsp; CONFIDENTIAL</p>
  <br/>
  <table>
    ${tableRows}
  </table>
  <p style="font-size:9pt;color:#94a3b8;margin-top:30px">Ministry of Industry and Trade, United Republic of Tanzania &nbsp;·&nbsp; MIT M&amp;E System</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'application/msword');
  res.setHeader('Content-Disposition', `attachment; filename=MIT-MES-Report-${fiscalYear}-${period}.doc`);
  res.send(wordHtml);
}

module.exports = { indicatorReport, institutionReport, consolidatedReport, exportExcel, exportPdf, exportPdfServer, exportDocx };
