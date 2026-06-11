'use strict';

/**
 * Auto-Mapping Strategic Matrix Importer
 * ------------------------------------------------------------------------------
 * Drop in ANY result-framework / strategic-plan matrix (Excel) at any time and
 * the system AUTO-DETECTS its structure (no manual column configuration) and
 * maps it into the strategic framework:
 *
 *   Objective -> Outcome/Strategy -> Output -> Indicator (+ Activity)
 *   with baselines, multi-year targets, means of verification, frequency and
 *   the responsible Department/Unit/Institution.
 *
 * Auto-detection handles: the header row (wherever it is), flexible column
 * names, merged/forward-filled Objective & Strategy cells, and an arbitrary
 * number of YEAR target columns (e.g. 2026/27 … 2030/31, or "Year 1…5").
 *
 * Idempotent: matches existing records by code/name; safe to re-upload.
 */

const prisma = require('../../config/db');
const XLSX   = require('xlsx');

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const norm  = (s) => clean(s).toLowerCase();
function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, ]/g, '').replace(/%$/, ''));
  return isNaN(n) ? null : n;
}
function normFY(raw) {
  const s = String(raw || '');
  const m = s.match(/(20\d\d)\s*[\/\-]\s*(\d{2,4})/);
  if (m) { let e = m[2]; if (e.length === 2) e = m[1].slice(0, 2) + e; return `${m[1]}-${e}`; }
  const one = s.match(/\b(20\d\d)\b/);
  return one ? `${one[1]}-${Number(one[1]) + 1}` : null;
}
function inferUnit(name) {
  const n = norm(name);
  if (/percentage|proportion|\brate\b|%|share of/.test(n)) return 'Percentage';
  if (/\bratio\b/.test(n)) return 'Ratio';
  return 'Number';
}

// Column alias dictionary (regex). First match wins per logical field.
const ALIASES = {
  objectiveCode: [/objective\s*(code|no|ref|number)/i],
  objective:     [/^\s*objective\b/i, /strategic\s*objective/i],
  outcomeCode:   [/outcome\s*(code|no|ref)/i],
  outcome:       [/^\s*outcome\b(?!\s*indicator)/i, /^\s*strateg/i, /result\s*area/i, /^\s*target\s*$/i],
  outputCode:    [/output\s*(code|no|ref)/i],
  output:        [/^\s*output\b(?!\s*indicator)/i],
  indicatorCode: [/indicator\s*(code|no|ref|number)/i, /^\s*no\.?\s*indicator/i, /^\s*s\/?n\b/i],
  indicator:     [/output\s*indicator/i, /outcome\s*indicator/i, /performance\s*indicator/i, /\bindicator\b/i],
  activityCode:  [/activity\s*(code|no|ref)/i],
  activity:      [/\bactivit/i],
  baseline:      [/baseline/i, /\bbase\s*year\b/i],
  unit:          [/unit\s*of\s*measure/i, /^\s*unit\s*$/i, /\buom\b/i],
  annualTarget:  [/annual\s*target/i, /overall\s*target/i, /five\s*year\s*target/i, /^\s*target\s*value/i],
  actual:        [/\bactual\b/i, /achievement\s*reported/i],
  mov:           [/means\s*of\s*verif/i, /\bmov\b/i, /verification/i, /source\s*of\s*data/i],
  collection:    [/data\s*collection/i, /collection\s*method/i, /method/i],
  frequency:     [/frequenc/i],
  responsible:   [/responsib/i, /\bowner\b/i, /\blead\b/i, /implementing/i, /accountab/i],
};

function matchField(header) {
  for (const [field, res] of Object.entries(ALIASES)) {
    if (res.some((re) => re.test(header))) return field;
  }
  return null;
}
function isYearHeader(header) {
  return /20\d\d\s*[\/\-]\s*\d{2,4}/.test(header)        // 2026/27, 2026-2027
      || /\bFY\s*20\d\d/i.test(header)                    // FY2026
      || /\b(year|yr)\s*[1-5]\b/i.test(header)            // Year 1..5
      || /target.*20\d\d/i.test(header);
}

function detectStructure(grid) {
  // Header row = the row (in first 15) maximizing recognised framework columns
  let best = { idx: -1, score: 0, map: {}, years: [] };
  const limit = Math.min(grid.length, 15);
  for (let r = 0; r < limit; r++) {
    const cells = grid[r].map((c) => clean(c));
    const map = {}; const years = [];
    let baseYear = null;
    cells.forEach((h, c) => {
      if (!h) return;
      const fy = normFY(h);
      if (isYearHeader(h)) { years.push({ col: c, label: h, fy }); if (fy && !baseYear) baseYear = parseInt(fy.split('-')[0], 10); return; }
      const f = matchField(h);
      if (f && map[f] === undefined) map[f] = c;
    });
    // Resolve "Year N" labels to fiscal years using the detected base year (or other detected fy)
    if (years.length && years.some((y) => !y.fy)) {
      const anchor = baseYear || (years.find((y) => y.fy) ? parseInt(years.find((y) => y.fy).fy.split('-')[0], 10) : null);
      if (anchor) {
        let yi = 0;
        years.forEach((y) => { if (!y.fy) { const ym = y.label.match(/[1-5]/); const n = ym ? parseInt(ym[0], 10) - 1 : yi; y.fy = `${anchor + n}-${anchor + n + 1}`; } yi++; });
      }
    }
    const hasIndicator = map.indicator !== undefined || map.indicatorCode !== undefined;
    const score = Object.keys(map).length + years.length + (hasIndicator ? 3 : 0);
    if (hasIndicator && score > best.score) best = { idx: r, score, map, years };
  }
  if (best.idx < 0) throw new Error('Could not auto-detect a framework matrix (no indicator column found). Please ensure the sheet has an Indicator column.');
  return best;
}

async function resolveResponsible(text, refs) {
  if (!text) return {};
  const t = norm(text);
  // institution by code/name
  const inst = refs.institutions.find((i) => norm(i.code) === t || t.includes(norm(i.code))) || refs.institutions.find((i) => norm(i.name) === t || t.includes(norm(i.name)) || norm(i.name).includes(t));
  if (inst) return { institutionId: inst.id, kind: 'Institution' };
  const dept = refs.departments.find((d) => norm(d.code) === t || t.includes(norm(d.code))) || refs.departments.find((d) => norm(d.name) === t || t.includes(norm(d.name)) || norm(d.name).includes(t));
  if (dept) return { departmentId: dept.id, kind: 'Department' };
  const unit = refs.units.find((u) => norm(u.code) === t || t.includes(norm(u.code))) || refs.units.find((u) => norm(u.name) === t || norm(u.name).includes(t) || t.includes(norm(u.name)));
  if (unit) return { unitId: unit.id, departmentId: unit.departmentId, kind: 'Unit' };
  return {};
}

function parseMatrix(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const out = [];
  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    if (!grid.length) continue;
    let struct;
    try { struct = detectStructure(grid); } catch { continue; }
    const { idx: hi, map, years } = struct;
    const get = (row, key) => (map[key] !== undefined ? clean(row[map[key]]) : '');
    let lastObj = '', lastOutcome = '', lastOutput = '';
    const rows = [];
    for (let i = hi + 1; i < grid.length; i++) {
      const row = grid[i];
      const objective = get(row, 'objective') || lastObj;
      const outcome = get(row, 'outcome') || lastOutcome;
      const output = get(row, 'output') || lastOutput;
      if (get(row, 'objective')) lastObj = get(row, 'objective');
      if (get(row, 'outcome')) lastOutcome = get(row, 'outcome');
      if (get(row, 'output')) lastOutput = get(row, 'output');
      const indicator = get(row, 'indicator');
      const indicatorCode = get(row, 'indicatorCode');
      if (!indicator && !indicatorCode) continue;
      const yearTargets = years.map((y) => ({ fy: y.fy, label: y.label, value: toNum(row[y.col]) })).filter((y) => y.value != null && y.fy);
      rows.push({
        rowNum: i + 1, sheet: sheetName,
        objectiveCode: get(row, 'objectiveCode'), objective,
        outcomeCode: get(row, 'outcomeCode'), outcome,
        outputCode: get(row, 'outputCode'), output,
        indicatorCode, indicator,
        activityCode: get(row, 'activityCode'), activity: get(row, 'activity'),
        baseline: toNum(map.baseline !== undefined ? row[map.baseline] : null),
        unit: get(row, 'unit'),
        annualTarget: toNum(map.annualTarget !== undefined ? row[map.annualTarget] : null),
        actual: toNum(map.actual !== undefined ? row[map.actual] : null),
        mov: get(row, 'mov'), collection: get(row, 'collection'), frequency: get(row, 'frequency'),
        responsible: get(row, 'responsible'),
        yearTargets,
      });
    }
    out.push({ sheet: sheetName, headerRow: hi, columnMap: map, years, rows });
  }
  if (out.length === 0) throw new Error('No framework matrix detected in any sheet. Ensure the file has an Indicator column.');
  return out;
}

async function runMatrixImport(buffer, user, commit) {
  const sheets = parseMatrix(buffer);
  const allRows = sheets.flatMap((s) => s.rows);
  if (allRows.length === 0) throw new Error('No data rows found.');

  const [institutions, departments, units] = await Promise.all([
    prisma.institution.findMany({ select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ select: { id: true, code: true, name: true } }),
    prisma.unit.findMany({ select: { id: true, code: true, name: true, departmentId: true } }),
  ]);
  const refs = { institutions, departments, units };
  const mitHQ = institutions.find((i) => i.code === 'MIT-HQ') || institutions[0];

  const detected = sheets.map((s) => ({ sheet: s.sheet, mappedColumns: Object.keys(s.columnMap), years: s.years.map((y) => y.fy || y.label) }));

  if (!commit) {
    const u = (a) => new Set(a.filter(Boolean)).size;
    const allYears = [...new Set(sheets.flatMap((s) => s.years.map((y) => y.fy).filter(Boolean)))].sort();
    return {
      preview: true, sheets: detected, totalRows: allRows.length, years: allYears,
      willCreateApprox: {
        objectives: u(allRows.map((r) => r.objectiveCode || r.objective)),
        outcomes: u(allRows.map((r) => (r.objectiveCode || r.objective) + '|' + (r.outcomeCode || r.outcome))),
        indicators: u(allRows.map((r) => r.indicatorCode || r.indicator)),
        activities: u(allRows.filter((r) => r.activity || r.activityCode).map((r) => r.activityCode || r.activity)),
        targetRows: allRows.reduce((s, r) => s + (r.yearTargets.length || (r.annualTarget != null ? 1 : 0)), 0),
      },
      sample: allRows.slice(0, 8).map((r) => ({ row: r.rowNum, objective: (r.objectiveCode || r.objective || '').slice(0, 24), indicator: (r.indicator || r.indicatorCode || '').slice(0, 50), baseline: r.baseline, years: r.yearTargets.map((y) => `${y.fy}:${y.value}`).join('  '), responsible: r.responsible })),
      warnings: allRows.every((r) => r.yearTargets.length === 0 && r.annualTarget == null) ? ['No target values detected — check the year/target columns.'] : [],
    };
  }

  const stats = { objectives:{created:0,matched:0}, outcomes:{created:0,matched:0}, outputs:{created:0,matched:0},
    indicators:{created:0,matched:0}, activities:{created:0,matched:0}, targets:0, actuals:0, skipped:0 };
  const skips = [];
  const objC = new Map(), ocC = new Map(), outC = new Map(), indC = new Map(), actC = new Map();
  const existingCodes = new Set((await prisma.indicator.findMany({ select: { code: true } })).map((c) => c.code));
  let seq = 1; const genCode = () => { let c; do { c = `SP-${String(seq++).padStart(4, '0')}`; } while (existingCodes.has(c)); existingCodes.add(c); return c; };

  for (const r of allRows) {
    try {
      const resp = await resolveResponsible(r.responsible, refs);
      const inst = resp.institutionId ? institutions.find((i) => i.id === resp.institutionId) : mitHQ;
      const departmentId = resp.departmentId || null;
      const unitId = resp.unitId || null;

      // Objective
      const objKey = norm(r.objectiveCode || r.objective || 'general');
      let objId = objC.get(objKey);
      if (!objId) {
        let o = r.objectiveCode
          ? await prisma.strategicObjective.findFirst({ where: { code: r.objectiveCode, institutionId: inst.id }, select: { id: true } })
          : await prisma.strategicObjective.findFirst({ where: { name: (r.objective || 'General Objective'), institutionId: inst.id }, select: { id: true } });
        if (o) stats.objectives.matched++;
        else { o = await prisma.strategicObjective.create({ data: { code: r.objectiveCode || null, name: (r.objective || r.objectiveCode || 'General Objective').slice(0, 255), institutionId: inst.id } }); stats.objectives.created++; }
        objId = o.id; objC.set(objKey, objId);
      }
      // Outcome / Strategy
      const ocKey = objKey + '|' + norm(r.outcomeCode || r.outcome || r.objective || 'general');
      let outcomeId = ocC.get(ocKey);
      if (!outcomeId) {
        let oc = r.outcomeCode
          ? await prisma.outcome.findFirst({ where: { objectiveId: objId, code: r.outcomeCode }, select: { id: true } })
          : await prisma.outcome.findFirst({ where: { objectiveId: objId, name: (r.outcome || r.objective || 'General Outcome') }, select: { id: true } });
        if (oc) stats.outcomes.matched++;
        else { oc = await prisma.outcome.create({ data: { objectiveId: objId, code: r.outcomeCode || null, name: (r.outcome || r.objective || 'General Outcome').slice(0, 255) } }); stats.outcomes.created++; }
        outcomeId = oc.id; ocC.set(ocKey, outcomeId);
      }
      // Output
      const outKey = ocKey + '|' + norm(r.output || r.outcome || 'output');
      let outputId = outC.get(outKey);
      if (!outputId) {
        const oname = (r.output || r.outcome || 'Output').slice(0, 255);
        let op = await prisma.output.findFirst({ where: { outcomeId, name: oname }, select: { id: true } });
        if (op) stats.outputs.matched++;
        else { op = await prisma.output.create({ data: { outcomeId, name: oname } }); stats.outputs.created++; }
        outputId = op.id; outC.set(outKey, outputId);
      }
      // Indicator
      const indKey = r.indicatorCode ? 'c:' + norm(r.indicatorCode) : 'n:' + outputId + '|' + norm(r.indicator);
      let indId = indC.get(indKey);
      if (!indId) {
        let found = r.indicatorCode
          ? await prisma.indicator.findUnique({ where: { code: r.indicatorCode }, select: { id: true } })
          : await prisma.indicator.findFirst({ where: { outputId, name: r.indicator }, select: { id: true } });
        if (found) { indId = found.id; stats.indicators.matched++; }
        else {
          const created = await prisma.indicator.create({ data: {
            outputId, code: r.indicatorCode || genCode(), name: (r.indicator || r.indicatorCode).slice(0, 255),
            unit: r.unit || inferUnit(r.indicator), baselineValue: r.baseline, baselineYear: r.baseline != null ? 2024 : null,
            collectionMethod: r.collection || null, verificationSource: r.mov || null,
            createdById: user.id, reportingFrequency: /annual/i.test(r.frequency) ? 'annual' : 'quarterly',
            ownerType: resp.kind || (departmentId ? 'Department' : unitId ? 'Unit' : 'Institution'),
            ownerDepartmentId: departmentId, ownerUnitId: unitId,
            ownerInstitutionId: departmentId || unitId ? null : inst.id,
          } });
          indId = created.id; stats.indicators.created++;
        }
        indC.set(indKey, indId);
      }
      // Activity (optional)
      if (r.activity || r.activityCode) {
        const aKey = r.activityCode ? 'c:' + outputId + '|' + norm(r.activityCode) : 'n:' + outputId + '|' + norm(r.activity);
        if (!actC.get(aKey)) {
          let act = r.activityCode
            ? await prisma.activity.findFirst({ where: { outputId, code: r.activityCode }, select: { id: true } })
            : await prisma.activity.findFirst({ where: { outputId, name: r.activity }, select: { id: true } });
          if (act) stats.activities.matched++;
          else { act = await prisma.activity.create({ data: { outputId, code: r.activityCode || null, name: (r.activity || r.activityCode).slice(0, 255), responsibleInstitutionId: inst.id, responsibleDepartmentId: departmentId, responsibleUnitId: unitId } }); stats.activities.created++; }
          actC.set(aKey, act.id);
        }
      }
      // Targets: one IndicatorTarget per detected fiscal year (annual target)
      const targetList = r.yearTargets.length ? r.yearTargets : (r.annualTarget != null ? [{ fy: null, value: r.annualTarget }] : []);
      for (const yt of targetList) {
        const fy = yt.fy || '2026-2027';
        await prisma.indicatorTarget.upsert({
          where: { indicatorId_institutionId_fiscalYear: { indicatorId: indId, institutionId: inst.id, fiscalYear: fy } },
          update: { annualTarget: yt.value },
          create: { indicatorId: indId, institutionId: inst.id, fiscalYear: fy, annualTarget: yt.value },
        });
        stats.targets++;
      }
      // Optional actual
      if (r.actual != null) {
        const fy = (r.yearTargets[0] && r.yearTargets[0].fy) || '2026-2027';
        await prisma.indicatorActual.upsert({
          where: { indicatorId_institutionId_fiscalYear_reportingPeriod: { indicatorId: indId, institutionId: inst.id, fiscalYear: fy, reportingPeriod: 'Annual' } },
          update: { actualValue: r.actual, departmentId, unitId, status: 'submitted', submittedById: user.id },
          create: { indicatorId: indId, institutionId: inst.id, departmentId, unitId, fiscalYear: fy, reportingPeriod: 'Annual', actualValue: r.actual, status: 'submitted', submittedById: user.id },
        });
        stats.actuals++;
      }
    } catch (err) {
      stats.skipped++;
      skips.push({ row: r.rowNum, indicator: (r.indicator || r.indicatorCode || '').slice(0, 60), error: err.message });
    }
  }

  return { preview: false, sheets: detected, totalRows: allRows.length, stats, skips: skips.slice(0, 50),
    message: `Strategic matrix mapped — ${stats.objectives.created} objectives, ${stats.indicators.created} indicators, ${stats.activities.created} activities created; ${stats.targets} multi-year targets set (${stats.indicators.matched} indicators matched existing).` };
}

async function matrixPreview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try { res.json(await runMatrixImport(req.file.buffer, req.user, false)); }
  catch (e) { res.status(400).json({ error: e.message }); }
}
async function matrixImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try { res.json(await runMatrixImport(req.file.buffer, req.user, true)); }
  catch (e) { res.status(400).json({ error: e.message }); }
}

module.exports = { matrixPreview, matrixImport };
