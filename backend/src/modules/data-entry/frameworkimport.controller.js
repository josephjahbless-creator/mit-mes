'use strict';

/**
 * Result Framework Importer
 * ------------------------------------------------------------------------------
 * Imports the Ministry's departmental "Result Framework" Excel files (the
 * IDARA/VITENGO format) that contain the full hierarchy AND period actuals:
 *
 *   Objective | Target | Activity | Output Indicator | Baseline | Target <Qn> | <Qn> actual | Performance
 *
 * It CREATES the framework (Strategic Objective -> Outcome -> Output ->
 * Indicator + Activity), sets the period target, and records the period actual
 * value — all in one upload. Idempotent: re-importing matches existing records
 * by name instead of duplicating.
 *
 * Endpoints: POST /data-entry/import/framework            (commit)
 *            POST /data-entry/import/framework/preview     (dry-run, no writes)
 */

const prisma = require('../../config/db');
const XLSX   = require('xlsx');

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 %\/\-]/g, '').trim();
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

function normalizeFiscalYear(raw) {
  const s = String(raw || '');
  const m = s.match(/(20\d\d)\s*[\/\-]\s*(\d{2,4})/);
  if (m) {
    const start = m[1];
    let end = m[2];
    if (end.length === 2) end = start.slice(0, 2) + end;
    return `${start}-${end}`;
  }
  const single = s.match(/(20\d\d)/);
  if (single) return `${single[1]}-${Number(single[1]) + 1}`;
  return null;
}

function detectPeriod(text) {
  const m = String(text || '').match(/\bQ([1-4])\b/i);
  if (m) return `Q${m[1]}`;
  if (/annual/i.test(text || '')) return 'Annual';
  return null;
}

function inferUnit(name) {
  const n = String(name || '').toLowerCase();
  if (/percentage|proportion|\brate\b|%/.test(n)) return 'Percentage';
  if (/^number of|^no\.? of|\bnumber\b|count/.test(n)) return 'Number';
  return 'Number';
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, ]/g, '').replace(/%$/, ''));
  return isNaN(n) ? null : n;
}

/**
 * Parse a Result Framework workbook into structured rows + metadata.
 * Returns { meta, items[], warnings[] }.
 */
function parseFramework(buffer, overrides = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const warnings = [];

  // Header row = first row that mentions "output indicator" (or "indicator")
  let hi = grid.findIndex((r) => r.some((c) => /output\s*indicator/i.test(String(c))));
  if (hi < 0) hi = grid.findIndex((r) => r.some((c) => /\bindicator\b/i.test(String(c))));
  if (hi < 0) throw new Error('Could not find the header row (no "Output Indicator" column). Is this a Result Framework file?');

  const header = grid[hi].map((c) => String(c));
  const superRow = hi > 0 ? grid[hi - 1].map((c) => String(c)) : [];

  const findCol = (re, fromHeader = header) => fromHeader.findIndex((h) => re.test(h));
  const col = {
    objective: findCol(/objective/i),
    outcome:   header.findIndex((h) => /^\s*target\s*$/i.test(h)),          // the short "Target" (result statement)
    activity:  findCol(/activit/i),
    indicator: (findCol(/output\s*indicator/i) >= 0 ? findCol(/output\s*indicator/i) : findCol(/\bindicator\b/i)),
    baseline:  findCol(/baseline/i),
    periodTgt: findCol(/target\s*q[1-4]/i),
  };
  // Actual column: under the "Actual ..." super-header, else first Q-col after the period target
  let actualCol = superRow.findIndex((h) => /actual/i.test(h));
  if (actualCol < 0) {
    for (let c = (col.periodTgt >= 0 ? col.periodTgt + 1 : col.indicator + 1); c < header.length; c++) {
      if (/^\s*(q[1-4]|annual)\b/i.test(header[c]) || /actual/i.test(header[c])) { actualCol = c; break; }
    }
  }
  col.actual = actualCol;

  if (col.indicator < 0) throw new Error('No indicator column found.');

  // Department: a non-empty single-cell row above the header (e.g. "Department of ...")
  let deptName = overrides.departmentName || '';
  for (let r = 0; r < hi; r++) {
    const cells = grid[r].map((c) => clean(c)).filter(Boolean);
    if (cells.length === 1 && /department|unit|directorate|division|idara|kitengo/i.test(cells[0]) && !/result\s*frame/i.test(cells[0])) {
      deptName = cells[0]; break;
    }
  }

  // Period & fiscal year — from the period-target header, then super row, then overrides
  const headerText = [header[col.periodTgt], ...superRow, ...header].join(' ');
  const period = overrides.period || detectPeriod(headerText) || 'Q3';
  const fiscalYear = overrides.fiscalYear || normalizeFiscalYear(headerText) || null;

  // Data rows — forward-fill Objective and Outcome(target)
  let lastObjective = '', lastOutcome = '';
  const items = [];
  for (let i = hi + 1; i < grid.length; i++) {
    const row = grid[i];
    const objective = clean(row[col.objective]) || lastObjective;
    const outcome   = (col.outcome >= 0 ? clean(row[col.outcome]) : '') || lastOutcome;
    if (clean(row[col.objective])) lastObjective = clean(row[col.objective]);
    if (col.outcome >= 0 && clean(row[col.outcome])) lastOutcome = clean(row[col.outcome]);

    const indicator = clean(row[col.indicator]);
    if (!indicator) continue; // not a data row

    items.push({
      rowNum: i + 1,
      objective: objective || 'Unspecified Objective',
      outcome:   outcome || objective || 'Unspecified Result',
      activity:  col.activity >= 0 ? clean(row[col.activity]) : '',
      indicator,
      baseline:  col.baseline >= 0 ? toNum(row[col.baseline]) : null,
      target:    col.periodTgt >= 0 ? toNum(row[col.periodTgt]) : null,
      actual:    col.actual >= 0 ? toNum(row[col.actual]) : null,
    });
  }

  if (!fiscalYear) warnings.push('Could not detect fiscal year from the file — please specify one.');
  return { meta: { department: deptName, period, fiscalYear, headerRow: hi, columns: col, indicatorCount: items.length }, items, warnings };
}

// ── Code generator for new indicators ─────────────────────────────────────────
function makeCodeGen(existing) {
  const used = new Set(existing);
  let seq = 1;
  return () => {
    let code;
    do { code = `RF-${String(seq++).padStart(4, '0')}`; } while (used.has(code));
    used.add(code);
    return code;
  };
}

async function resolveDepartment(name) {
  if (!name) return null;
  const target = norm(name);
  const depts = await prisma.department.findMany({ select: { id: true, code: true, name: true } });
  // exact, then contains either direction
  return depts.find((d) => norm(d.name) === target)
      || depts.find((d) => target.includes(norm(d.name)) || norm(d.name).includes(target))
      || null;
}

// ── Core importer ─────────────────────────────────────────────────────────────
async function runFrameworkImport(buffer, user, overrides, commit) {
  const { meta, items, warnings } = parseFramework(buffer, overrides);

  const mit = await prisma.institution.findUnique({ where: { code: 'MIT-HQ' }, select: { id: true } });
  if (!mit) throw new Error('Institution MIT-HQ not found.');
  const dept = await resolveDepartment(meta.department);
  if (meta.department && !dept) warnings.push(`Department "${meta.department}" not matched — data attributed to the Ministry (HQ) without a department.`);
  if (!meta.fiscalYear) throw new Error('Fiscal year could not be determined. Please specify the fiscal year.');
  if (!VALID_PERIODS.includes(meta.period)) throw new Error(`Invalid period "${meta.period}".`);

  const stats = {
    objectives: { created: 0, matched: 0 }, outcomes: { created: 0, matched: 0 },
    outputs: { created: 0, matched: 0 }, indicators: { created: 0, matched: 0 },
    activities: { created: 0, matched: 0 }, targets: 0, actuals: 0, skipped: 0,
  };
  const skips = [];

  if (!commit) {
    // Dry-run: estimate uniques without writing
    const uniq = (arr) => new Set(arr).size;
    return {
      preview: true, meta: { ...meta, department: dept ? dept.name : meta.department, departmentMatched: !!dept },
      willCreateApprox: {
        objectives: uniq(items.map((i) => norm(i.objective))),
        outcomes:   uniq(items.map((i) => norm(i.objective) + '|' + norm(i.outcome))),
        indicators: items.length,
        activities: uniq(items.filter((i) => i.activity).map((i) => norm(i.activity))),
        actuals:    items.filter((i) => i.actual != null).length,
      },
      sample: items.slice(0, 8),
      warnings,
    };
  }

  // Caches
  const objCache = new Map(), outcomeCache = new Map(), outputCache = new Map();
  const existingCodes = (await prisma.indicator.findMany({ select: { code: true } })).map((c) => c.code);
  const genCode = makeCodeGen(existingCodes);
  const pq = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' }[meta.period];

  let objOrder = 0;
  for (const it of items) {
    try {
      // Strategic Objective
      const objKey = norm(it.objective);
      let objId = objCache.get(objKey);
      if (!objId) {
        let obj = await prisma.strategicObjective.findFirst({ where: { name: it.objective, institutionId: mit.id }, select: { id: true } });
        if (obj) { stats.objectives.matched++; }
        else { obj = await prisma.strategicObjective.create({ data: { name: it.objective.slice(0, 255), institutionId: mit.id, orderNo: ++objOrder } }); stats.objectives.created++; }
        objId = obj.id; objCache.set(objKey, objId);
      }

      // Outcome (from the "Target"/result statement)
      const ocKey = objKey + '|' + norm(it.outcome);
      let outcomeId = outcomeCache.get(ocKey);
      if (!outcomeId) {
        let oc = await prisma.outcome.findFirst({ where: { objectiveId: objId, name: it.outcome }, select: { id: true } });
        if (oc) { stats.outcomes.matched++; }
        else { oc = await prisma.outcome.create({ data: { objectiveId: objId, name: it.outcome.slice(0, 255) } }); stats.outcomes.created++; }
        outcomeId = oc.id; outcomeCache.set(ocKey, outcomeId);
      }

      // Output (one per outcome — file has no explicit output level)
      let outputId = outputCache.get(ocKey);
      if (!outputId) {
        const outName = it.outcome.slice(0, 255);
        let op = await prisma.output.findFirst({ where: { outcomeId, name: outName }, select: { id: true } });
        if (op) { stats.outputs.matched++; }
        else { op = await prisma.output.create({ data: { outcomeId, name: outName } }); stats.outputs.created++; }
        outputId = op.id; outputCache.set(ocKey, outputId);
      }

      // Indicator
      let ind = await prisma.indicator.findFirst({ where: { outputId, name: it.indicator }, select: { id: true } });
      if (ind) { stats.indicators.matched++; }
      else {
        ind = await prisma.indicator.create({ data: {
          outputId, name: it.indicator.slice(0, 255), code: genCode(),
          unit: inferUnit(it.indicator), baselineValue: it.baseline, baselineYear: null,
          createdById: user.id, reportingFrequency: 'quarterly',
          ownerType: dept ? 'Department' : 'Institution',
          ownerDepartmentId: dept ? dept.id : null,
          ownerInstitutionId: dept ? null : mit.id,
        } });
        stats.indicators.created++;
      }

      // Activity (optional)
      if (it.activity) {
        const act = await prisma.activity.findFirst({ where: { outputId, name: it.activity }, select: { id: true } });
        if (act) { stats.activities.matched++; }
        else { await prisma.activity.create({ data: { outputId, name: it.activity.slice(0, 255), responsibleInstitutionId: mit.id, responsibleDepartmentId: dept ? dept.id : null } }); stats.activities.created++; }
      }

      // Period target
      if (it.target != null) {
        await prisma.indicatorTarget.upsert({
          where: { indicatorId_institutionId_fiscalYear: { indicatorId: ind.id, institutionId: mit.id, fiscalYear: meta.fiscalYear } },
          update: { [pq]: it.target },
          create: { indicatorId: ind.id, institutionId: mit.id, fiscalYear: meta.fiscalYear, [pq]: it.target },
        });
        stats.targets++;
      }

      // Period actual
      if (it.actual != null) {
        await prisma.indicatorActual.upsert({
          where: { indicatorId_institutionId_fiscalYear_reportingPeriod: { indicatorId: ind.id, institutionId: mit.id, fiscalYear: meta.fiscalYear, reportingPeriod: meta.period } },
          update: { actualValue: it.actual, departmentId: dept ? dept.id : null, status: 'submitted', submittedById: user.id },
          create: { indicatorId: ind.id, institutionId: mit.id, departmentId: dept ? dept.id : null, fiscalYear: meta.fiscalYear, reportingPeriod: meta.period, actualValue: it.actual, status: 'submitted', submittedById: user.id },
        });
        stats.actuals++;
      }
    } catch (err) {
      stats.skipped++;
      skips.push({ row: it.rowNum, indicator: it.indicator.slice(0, 60), error: err.message });
    }
  }

  return {
    preview: false,
    meta: { ...meta, department: dept ? dept.name : meta.department, departmentMatched: !!dept, institution: 'MIT-HQ' },
    stats, warnings, skips: skips.slice(0, 50),
    message: `Framework import complete for ${meta.department || 'MIT'} — ${meta.period} ${meta.fiscalYear}: `
      + `${stats.indicators.created} indicators created (${stats.indicators.matched} existing), `
      + `${stats.activities.created} activities, ${stats.actuals} actuals recorded.`,
  };
}

async function frameworkPreview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const out = await runFrameworkImport(req.file.buffer, req.user, req.body || {}, false);
    res.json(out);
  } catch (e) { res.status(400).json({ error: e.message }); }
}

async function frameworkImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const out = await runFrameworkImport(req.file.buffer, req.user, req.body || {}, true);
    res.json(out);
  } catch (e) { res.status(400).json({ error: e.message }); }
}

// ── Downloadable Result-Framework template (matches the Ministry's format) ─────
async function downloadFrameworkTemplate(req, res) {
  const wb = XLSX.utils.book_new();
  const aoa = [
    ['MINISTERIAL MONITORING AND EVALUATION RESULT FRAMEWORK'],
    ['Department of Small and Medium Enterprises'],
    ['', '', '', '', '', '', 'Actual Implementation', 'Performance'],
    ['Objective', 'Target', 'Activity', 'Output Indicator', 'Baseline (2024/25)', 'Target Q3 2025/26', 'Q3', 'Q3'],
    ['Objective D: Business Environment improved', 'SME Development Policy reviewed by June 2026', 'Finalize review of SME Development Policy (2003)', 'Percentage achieved in SME Development Policy Reviewed', 60, 25, 12, 0.48],
    ['', 'Mechanism for SME finance access developed', 'Create awareness of SME loan schemes', 'Number of regions visited for loan-scheme awareness', 12, 4, 4, 1],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 34 }, { wch: 34 }, { wch: 36 }, { wch: 40 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 12 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, ws, 'Result Framework');

  const guide = [
    { Field: 'Row 1', Notes: 'Title (kept as-is).' },
    { Field: 'Row 2', Notes: 'Department / Unit name — must match a system department (e.g. Department of Small and Medium Enterprises).' },
    { Field: 'Objective', Notes: 'Strategic objective statement. Leave blank to repeat the one above.' },
    { Field: 'Target', Notes: 'Result/outcome statement. Leave blank to repeat the one above.' },
    { Field: 'Activity', Notes: 'Activity carried out (optional).' },
    { Field: 'Output Indicator', Notes: 'The indicator name. Created automatically if it does not exist.' },
    { Field: 'Baseline', Notes: 'Baseline value (number).' },
    { Field: 'Target <Qn>', Notes: 'Period target value. Header must include the quarter & fiscal year, e.g. "Target Q3 2025/26".' },
    { Field: '<Qn> actual', Notes: 'Actual achieved for the period (the column under "Actual Implementation").' },
    { Field: 'Performance', Notes: 'Ignored on import (the system computes achievement).' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(guide);
  ws2['!cols'] = [{ wch: 18 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'How to fill');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="MIT_Result_Framework_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

module.exports = { frameworkPreview, frameworkImport, downloadFrameworkTemplate };
