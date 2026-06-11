'use strict';

/**
 * Standardized Performance M&E Importer
 * ------------------------------------------------------------------------------
 * ONE template, all quarters (Q1–Q4), all Departments/Units/Institutions.
 *
 * Columns (exact):
 *   Financial Year | Quarter | Objective Code | Objective Description |
 *   Outcome Code | Indicator Code | Indicator Description | Activity Code |
 *   Activity Description | Department/Unit Code | Department/Unit Name |
 *   Institution Code | Institution Name | Annual Target | Quarterly Target |
 *   Actual Achievement | Budget Allocation | Budget Utilized |
 *   Achievement Percentage (auto) | Performance Status (auto)
 *
 * On upload the system auto-maps each record by CODE to the Objective, Outcome,
 * Indicator, Activity, Department/Unit and Institution (creating any that are
 * missing), sets the annual + quarterly target, records the quarter's actual,
 * captures budget allocation/utilization, and lets the existing analytics
 * compute achievement %, weighted/unweighted scores, traffic-light status and
 * trends. Idempotent: re-uploading matches by code instead of duplicating.
 */

const prisma = require('../../config/db');
const XLSX   = require('xlsx');

const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const Q_TARGET = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };
const Q_BUDGET = { Q1: 'q1Budget', Q2: 'q2Budget', Q3: 'q3Budget', Q4: 'q4Budget', Annual: 'q4Budget' };

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const norm  = (s) => clean(s).toLowerCase();

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, ]/g, '').replace(/%$/, ''));
  return isNaN(n) ? null : n;
}
function normalizeFY(raw) {
  const s = String(raw || '');
  const m = s.match(/(20\d\d)\s*[\/\-]\s*(\d{2,4})/);
  if (m) { let e = m[2]; if (e.length === 2) e = m[1].slice(0, 2) + e; return `${m[1]}-${e}`; }
  const one = s.match(/(20\d\d)/); return one ? `${one[1]}-${Number(one[1]) + 1}` : null;
}
function normalizeQuarter(raw) {
  const m = String(raw || '').match(/q?\s*([1-4])/i); if (m) return `Q${m[1]}`;
  if (/annual/i.test(raw || '')) return 'Annual'; return null;
}
function inferUnit(name, code) {
  const n = norm(name) + ' ' + norm(code);
  if (/percentage|proportion|\brate\b|%/.test(n)) return 'Percentage';
  if (/\bratio\b/.test(n)) return 'Ratio';
  return 'Number';
}
function statusFor(pct) {
  if (pct == null) return 'No Target';
  if (pct >= 90) return 'Green';
  if (pct >= 60) return 'Amber';
  return 'Red';
}

// Map flexible header names -> canonical keys
const FIELD_ALIASES = {
  financialYear: [/financial\s*year/i, /fiscal\s*year/i, /\bfy\b/i],
  quarter:       [/quarter/i, /^q$/i, /period/i],
  objectiveCode: [/objective\s*code/i],
  objectiveDesc: [/objective\s*desc/i, /objective\s*(title|name)/i, /^objective$/i],
  outcomeCode:   [/outcome\s*code/i],
  outcomeDesc:   [/outcome\s*desc/i, /^outcome$/i],
  indicatorCode: [/indicator\s*code/i],
  indicatorDesc: [/indicator\s*desc/i, /output\s*indicator/i, /^indicator$/i],
  activityCode:  [/activity\s*code/i],
  activityDesc:  [/activity\s*desc/i, /^activity$/i],
  deptCode:      [/dep.*unit\s*code/i, /department\s*code/i, /unit\s*code/i],
  deptName:      [/dep.*unit\s*name/i, /department\s*name/i, /unit\s*name/i],
  institutionCode: [/institution\s*code/i],
  institutionName: [/institution\s*name/i],
  annualTarget:  [/annual\s*target/i],
  quarterlyTarget: [/quarter.*target/i, /target.*quarter/i, /\bquarterly\b/i],
  actual:        [/actual/i, /achievement\s*reported/i],
  budgetAllocation: [/budget\s*alloc/i, /allocation/i, /planned\s*budget/i],
  budgetUtilized: [/budget\s*util/i, /expenditure/i, /utilized/i, /actual\s*expend/i],
};

function buildColumnMap(headers) {
  const map = {};
  headers.forEach((h, idx) => {
    const hs = String(h);
    for (const [key, res] of Object.entries(FIELD_ALIASES)) {
      if (map[key] === undefined && res.some((re) => re.test(hs))) map[key] = idx;
    }
  });
  return map;
}

function parsePerformance(buffer, overrides = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // header row = first row containing an "Indicator" column AND a "Quarter"/"Objective"
  let hi = grid.findIndex((r) => r.some((c) => /indicator/i.test(String(c))) && r.some((c) => /objective|quarter|financial/i.test(String(c))));
  if (hi < 0) hi = grid.findIndex((r) => r.some((c) => /indicator/i.test(String(c))));
  if (hi < 0) throw new Error('Could not find a header row with the standard columns. Please use the Performance template.');
  const headers = grid[hi].map(String);
  const col = buildColumnMap(headers);
  if (col.indicatorCode === undefined && col.indicatorDesc === undefined)
    throw new Error('No Indicator Code / Indicator Description column found.');

  const rows = [];
  for (let i = hi + 1; i < grid.length; i++) {
    const r = grid[i];
    const get = (k) => (col[k] !== undefined ? clean(r[col[k]]) : '');
    const indicatorDesc = get('indicatorDesc');
    const indicatorCode = get('indicatorCode');
    if (!indicatorDesc && !indicatorCode) continue;
    rows.push({
      rowNum: i + 1,
      financialYear: overrides.fiscalYear || normalizeFY(get('financialYear')),
      quarter: overrides.period || normalizeQuarter(get('quarter')),
      objectiveCode: get('objectiveCode'), objectiveDesc: get('objectiveDesc'),
      outcomeCode: get('outcomeCode'), outcomeDesc: get('outcomeDesc'),
      indicatorCode, indicatorDesc,
      activityCode: get('activityCode'), activityDesc: get('activityDesc'),
      deptCode: get('deptCode'), deptName: get('deptName'),
      institutionCode: get('institutionCode'), institutionName: get('institutionName'),
      annualTarget: toNum(col.annualTarget !== undefined ? r[col.annualTarget] : null),
      quarterlyTarget: toNum(col.quarterlyTarget !== undefined ? r[col.quarterlyTarget] : null),
      actual: toNum(col.actual !== undefined ? r[col.actual] : null),
      budgetAllocation: toNum(col.budgetAllocation !== undefined ? r[col.budgetAllocation] : null),
      budgetUtilized: toNum(col.budgetUtilized !== undefined ? r[col.budgetUtilized] : null),
    });
  }
  return { headerRow: hi, columns: col, rows };
}

async function runPerformanceImport(buffer, user, overrides, commit) {
  const { rows } = parsePerformance(buffer, overrides);
  if (rows.length === 0) throw new Error('No data rows found.');
  if (rows.length > 2000) throw new Error('Maximum 2000 rows per import.');

  // Reference tables
  const [institutions, departments, units] = await Promise.all([
    prisma.institution.findMany({ select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ select: { id: true, code: true, name: true } }),
    prisma.unit.findMany({ select: { id: true, code: true, name: true, departmentId: true } }),
  ]);
  const instByCode = new Map(institutions.map((i) => [norm(i.code), i]));
  const instByName = new Map(institutions.map((i) => [norm(i.name), i]));
  const deptByCode = new Map(departments.map((d) => [norm(d.code), d]));
  const deptByName = new Map(departments.map((d) => [norm(d.name), d]));
  const unitByCode = new Map(units.map((u) => [norm(u.code), u]));
  const mitHQ = institutions.find((i) => i.code === 'MIT-HQ');

  const stats = { objectives:{created:0,matched:0}, outcomes:{created:0,matched:0}, outputs:{created:0,matched:0},
    indicators:{created:0,matched:0}, activities:{created:0,matched:0}, targets:0, actuals:0, budgets:0, skipped:0 };
  const skips = [];
  const resultRows = [];

  if (!commit) {
    // dry-run summary
    const u = (a) => new Set(a.filter(Boolean)).size;
    const previewRows = rows.slice(0, 10).map((r) => {
      const pct = (r.quarterlyTarget && r.actual != null) ? Math.round((r.actual / r.quarterlyTarget) * 1000) / 10 : null;
      return { row: r.rowNum, indicator: r.indicatorDesc || r.indicatorCode, quarter: r.quarter, fy: r.financialYear,
        target: r.quarterlyTarget, actual: r.actual, achievement: pct, status: statusFor(pct),
        institution: r.institutionCode || r.institutionName, dept: r.deptCode || r.deptName };
    });
    const warnings = [];
    if (rows.some((r) => !r.financialYear)) warnings.push('Some rows are missing Financial Year.');
    if (rows.some((r) => !r.quarter)) warnings.push('Some rows are missing/invalid Quarter.');
    return { preview: true, totalRows: rows.length,
      willCreateApprox: { objectives: u(rows.map((r)=>r.objectiveCode||r.objectiveDesc)), outcomes: u(rows.map((r)=>r.outcomeCode||r.outcomeDesc)),
        indicators: u(rows.map((r)=>r.indicatorCode||r.indicatorDesc)), activities: u(rows.map((r)=>r.activityCode||r.activityDesc)),
        actuals: rows.filter((r)=>r.actual!=null).length, budgets: rows.filter((r)=>r.budgetAllocation!=null||r.budgetUtilized!=null).length },
      sample: previewRows, warnings };
  }

  // Caches
  const objCache = new Map(), ocCache = new Map(), outCache = new Map(), indCache = new Map(), actCache = new Map();
  const existingCodes = new Set((await prisma.indicator.findMany({ select: { code: true } })).map((c) => c.code));
  let autoSeq = 1;
  const genIndCode = () => { let c; do { c = `PERF-${String(autoSeq++).padStart(4,'0')}`; } while (existingCodes.has(c)); existingCodes.add(c); return c; };

  for (const r of rows) {
    try {
      if (!r.financialYear) throw new Error('Financial Year missing/invalid');
      if (!VALID_PERIODS.includes(r.quarter)) throw new Error('Quarter missing/invalid (use Q1–Q4)');

      // Institution
      let inst = (r.institutionCode && instByCode.get(norm(r.institutionCode)))
              || (r.institutionName && instByName.get(norm(r.institutionName))) || mitHQ;
      if (!inst) throw new Error('Institution not resolved and MIT-HQ missing');

      // Department / Unit
      let dept = r.deptCode ? deptByCode.get(norm(r.deptCode)) : null;
      let unit = r.deptCode ? unitByCode.get(norm(r.deptCode)) : null;
      if (!dept && !unit && r.deptName) dept = deptByName.get(norm(r.deptName));
      if (unit && !dept) dept = departments.find((d) => d.id === unit.departmentId) || null;

      // Objective (by code, else by description)
      const objKey = norm(r.objectiveCode || r.objectiveDesc || 'general');
      let objId = objCache.get(objKey);
      if (!objId) {
        let obj = r.objectiveCode
          ? await prisma.strategicObjective.findFirst({ where: { code: r.objectiveCode, institutionId: inst.id }, select: { id: true } })
          : await prisma.strategicObjective.findFirst({ where: { name: r.objectiveDesc || 'General', institutionId: inst.id }, select: { id: true } });
        if (obj) stats.objectives.matched++;
        else { obj = await prisma.strategicObjective.create({ data: { code: r.objectiveCode || null, name: (r.objectiveDesc || r.objectiveCode || 'General Objective').slice(0,255), institutionId: inst.id } }); stats.objectives.created++; }
        objId = obj.id; objCache.set(objKey, objId);
      }

      // Outcome
      const ocKey = objKey + '|' + norm(r.outcomeCode || r.outcomeDesc || r.objectiveDesc || 'general');
      let outcomeId = ocCache.get(ocKey);
      if (!outcomeId) {
        let oc = r.outcomeCode
          ? await prisma.outcome.findFirst({ where: { objectiveId: objId, code: r.outcomeCode }, select: { id: true } })
          : await prisma.outcome.findFirst({ where: { objectiveId: objId, name: (r.outcomeDesc || r.objectiveDesc || 'General Outcome') }, select: { id: true } });
        if (oc) stats.outcomes.matched++;
        else { oc = await prisma.outcome.create({ data: { objectiveId: objId, code: r.outcomeCode || null, name: (r.outcomeDesc || r.objectiveDesc || 'General Outcome').slice(0,255) } }); stats.outcomes.created++; }
        outcomeId = oc.id; ocCache.set(ocKey, outcomeId);
      }

      // Output (one per outcome)
      let outputId = outCache.get(ocKey);
      if (!outputId) {
        const oname = (r.outcomeDesc || r.outcomeCode || 'Output').slice(0,255);
        let op = await prisma.output.findFirst({ where: { outcomeId, name: oname }, select: { id: true } });
        if (op) stats.outputs.matched++;
        else { op = await prisma.output.create({ data: { outcomeId, name: oname } }); stats.outputs.created++; }
        outputId = op.id; outCache.set(ocKey, outputId);
      }

      // Indicator (by code globally; else by name within output)
      const indKey = r.indicatorCode ? 'c:' + norm(r.indicatorCode) : 'n:' + outputId + '|' + norm(r.indicatorDesc);
      let ind = indCache.get(indKey);
      if (!ind) {
        let found = r.indicatorCode
          ? await prisma.indicator.findUnique({ where: { code: r.indicatorCode }, select: { id: true } })
          : await prisma.indicator.findFirst({ where: { outputId, name: r.indicatorDesc }, select: { id: true } });
        if (found) { ind = found.id; stats.indicators.matched++; }
        else {
          const created = await prisma.indicator.create({ data: {
            outputId, code: r.indicatorCode || genIndCode(), name: (r.indicatorDesc || r.indicatorCode).slice(0,255),
            unit: inferUnit(r.indicatorDesc, r.indicatorCode), createdById: user.id, reportingFrequency: 'quarterly',
            ownerType: dept ? 'Department' : 'Institution', ownerDepartmentId: dept ? dept.id : null, ownerUnitId: unit ? unit.id : null,
            ownerInstitutionId: dept || unit ? null : inst.id,
          } });
          ind = created.id; stats.indicators.created++;
        }
        indCache.set(indKey, ind);
      }

      // Activity (by code within output, else by name)
      let activityId = null;
      if (r.activityCode || r.activityDesc) {
        const aKey = r.activityCode ? 'c:' + outputId + '|' + norm(r.activityCode) : 'n:' + outputId + '|' + norm(r.activityDesc);
        activityId = actCache.get(aKey);
        if (!activityId) {
          let act = r.activityCode
            ? await prisma.activity.findFirst({ where: { outputId, code: r.activityCode }, select: { id: true } })
            : await prisma.activity.findFirst({ where: { outputId, name: r.activityDesc }, select: { id: true } });
          if (act) stats.activities.matched++;
          else { act = await prisma.activity.create({ data: { outputId, code: r.activityCode || null, name: (r.activityDesc || r.activityCode).slice(0,255), responsibleInstitutionId: inst.id, responsibleDepartmentId: dept ? dept.id : null, responsibleUnitId: unit ? unit.id : null } }); stats.activities.created++; }
          activityId = act.id; actCache.set(aKey, activityId);
        }
      }

      // Targets (annual + quarterly)
      if (r.annualTarget != null || r.quarterlyTarget != null) {
        const data = {};
        if (r.annualTarget != null) data.annualTarget = r.annualTarget;
        if (r.quarterlyTarget != null) data[Q_TARGET[r.quarter]] = r.quarterlyTarget;
        await prisma.indicatorTarget.upsert({
          where: { indicatorId_institutionId_fiscalYear: { indicatorId: ind, institutionId: inst.id, fiscalYear: r.financialYear } },
          update: data, create: { indicatorId: ind, institutionId: inst.id, fiscalYear: r.financialYear, ...data },
        });
        stats.targets++;
      }

      // Actual
      let achievement = null;
      if (r.actual != null) {
        await prisma.indicatorActual.upsert({
          where: { indicatorId_institutionId_fiscalYear_reportingPeriod: { indicatorId: ind, institutionId: inst.id, fiscalYear: r.financialYear, reportingPeriod: r.quarter } },
          update: { actualValue: r.actual, departmentId: dept ? dept.id : null, unitId: unit ? unit.id : null, status: 'submitted', submittedById: user.id },
          create: { indicatorId: ind, institutionId: inst.id, departmentId: dept ? dept.id : null, unitId: unit ? unit.id : null, fiscalYear: r.financialYear, reportingPeriod: r.quarter, actualValue: r.actual, status: 'submitted', submittedById: user.id },
        });
        stats.actuals++;
        if (r.quarterlyTarget) achievement = Math.round((r.actual / r.quarterlyTarget) * 1000) / 10;
      }

      // Budget (allocation -> BudgetPlan quarter; utilized -> Expenditure)
      if (activityId && (r.budgetAllocation != null || r.budgetUtilized != null)) {
        const bp = await prisma.budgetPlan.upsert({
          where: { activityId_institutionId_fiscalYear: { activityId, institutionId: inst.id, fiscalYear: r.financialYear } },
          update: r.budgetAllocation != null ? { [Q_BUDGET[r.quarter]]: r.budgetAllocation } : {},
          create: { activityId, institutionId: inst.id, fiscalYear: r.financialYear, ...(r.budgetAllocation != null ? { [Q_BUDGET[r.quarter]]: r.budgetAllocation } : {}) },
          select: { id: true },
        });
        if (r.budgetUtilized != null && r.quarter !== 'Annual') {
          const existingExp = await prisma.expenditure.findFirst({ where: { budgetPlanId: bp.id, period: r.quarter }, select: { id: true } });
          if (existingExp) await prisma.expenditure.update({ where: { id: existingExp.id }, data: { amount: r.budgetUtilized } });
          else await prisma.expenditure.create({ data: { budgetPlanId: bp.id, institutionId: inst.id, period: r.quarter, amount: r.budgetUtilized, status: 'submitted', submittedById: user.id } });
        }
        stats.budgets++;
      }

      resultRows.push({ row: r.rowNum, indicator: r.indicatorDesc || r.indicatorCode, achievement, status: statusFor(achievement) });
    } catch (err) {
      stats.skipped++;
      skips.push({ row: r.rowNum, indicator: (r.indicatorDesc || r.indicatorCode || '').slice(0,60), error: err.message });
    }
  }

  return {
    preview: false, totalRows: rows.length, stats, skips: skips.slice(0, 50),
    message: `Performance import complete — ${stats.actuals} actuals recorded across ${rows.length} rows `
      + `(${stats.indicators.created} new indicators, ${stats.activities.created} new activities, ${stats.targets} targets, ${stats.budgets} budgets).`,
  };
}

async function performancePreview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try { res.json(await runPerformanceImport(req.file.buffer, req.user, req.body || {}, false)); }
  catch (e) { res.status(400).json({ error: e.message }); }
}
async function performanceImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try { res.json(await runPerformanceImport(req.file.buffer, req.user, req.body || {}, true)); }
  catch (e) { res.status(400).json({ error: e.message }); }
}

// ── Downloadable standardized template ─────────────────────────────────────────
async function downloadPerformanceTemplate(req, res) {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Financial Year', 'Quarter', 'Objective Code', 'Objective Description', 'Outcome Code',
    'Indicator Code', 'Indicator Description', 'Activity Code', 'Activity Description',
    'Department/Unit Code', 'Department/Unit Name', 'Institution Code', 'Institution Name',
    'Annual Target', 'Quarterly Target', 'Actual Achievement', 'Budget Allocation', 'Budget Utilized',
    'Achievement Percentage (auto)', 'Performance Status (auto)',
  ];
  const sample = [
    ['2025/26','Q1','OBJ-A','Business Environment improved','OC-A1','IND-A1-01','% achieved in SME Development Policy reviewed','ACT-A1-01','Finalize review of SME Development Policy (2003)','DSME','Department of Small and Medium Enterprises','MIT-HQ','Ministry of Industry and Trade (HQ)',100,25,12,5000000,1200000,'',''],
    ['2025/26','Q1','OBJ-A','Business Environment improved','OC-A1','IND-A1-02','Number of regions visited for loan-scheme awareness','ACT-A1-02','Create awareness of SME loan schemes','DSME','Department of Small and Medium Enterprises','MIT-HQ','Ministry of Industry and Trade (HQ)',12,4,4,3000000,800000,'',''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.min(Math.max(h.length + 2, 12), 40) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Performance Data');

  // Instructions
  const guide = [
    { Column: 'Financial Year', Required: 'YES', Notes: 'e.g. 2025/26 (any quarter file uses the same column).' },
    { Column: 'Quarter', Required: 'YES', Notes: 'Q1, Q2, Q3 or Q4 — this drives which period the actuals/targets apply to.' },
    { Column: 'Objective Code / Description', Required: 'Code or Desc', Notes: 'Strategic objective. Created if new; matched by code on re-upload.' },
    { Column: 'Outcome Code / Description', Required: 'optional', Notes: 'Result/outcome under the objective.' },
    { Column: 'Indicator Code', Required: 'recommended', Notes: 'Unique indicator id. If blank, the system generates one from the description.' },
    { Column: 'Indicator Description', Required: 'YES', Notes: 'Indicator title. Unit (Number/Percentage) inferred from the wording.' },
    { Column: 'Activity Code / Description', Required: 'optional', Notes: 'Activity contributing to the indicator.' },
    { Column: 'Department/Unit Code', Required: 'recommended', Notes: 'Responsible Department or Unit code (see Reference sheet).' },
    { Column: 'Institution Code', Required: 'recommended', Notes: 'Responsible institution code (see Reference sheet). Defaults to MIT-HQ.' },
    { Column: 'Annual Target', Required: 'optional', Notes: 'Approved annual target.' },
    { Column: 'Quarterly Target', Required: 'YES (for %)', Notes: 'Target for THIS quarter — used to compute achievement %.' },
    { Column: 'Actual Achievement', Required: 'YES', Notes: 'Reported achievement for this quarter.' },
    { Column: 'Budget Allocation / Utilized', Required: 'optional', Notes: 'Planned vs spent budget for the activity this quarter.' },
    { Column: 'Achievement % / Status', Required: 'AUTO', Notes: 'Leave blank — the system computes these (Green ≥90%, Amber 60–89%, Red <60%).' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(guide);
  ws2['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  // Reference codes (live from the system)
  const [insts, depts, units] = await Promise.all([
    prisma.institution.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.department.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.unit.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } }),
  ]);
  const ref = [
    { Type: 'INSTITUTIONS', Code: '', Name: '' },
    ...insts.map((i) => ({ Type: 'Institution', Code: i.code, Name: i.name })),
    { Type: '', Code: '', Name: '' },
    { Type: 'DEPARTMENTS', Code: '', Name: '' },
    ...depts.map((d) => ({ Type: 'Department', Code: d.code, Name: d.name })),
    { Type: '', Code: '', Name: '' },
    { Type: 'UNITS', Code: '', Name: '' },
    ...units.map((u) => ({ Type: 'Unit', Code: u.code, Name: u.name })),
  ];
  const ws3 = XLSX.utils.json_to_sheet(ref);
  ws3['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Reference Codes');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="MIT_Performance_ME_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

module.exports = { performancePreview, performanceImport, downloadPerformanceTemplate };
