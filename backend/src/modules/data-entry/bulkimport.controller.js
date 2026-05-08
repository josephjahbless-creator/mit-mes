'use strict';

const prisma = require('../../config/db');
const XLSX   = require('xlsx');

const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

// ── Shared: resolve indicator + owner chain ───────────────────────────────────
async function resolveIndicator(indicatorCode) {
  return prisma.indicator.findUnique({
    where: { code: String(indicatorCode).trim() },
    select: {
      id: true, name: true, code: true, unit: true,
      minValue: true, maxValue: true,
      ownerType: true,
      ownerInstitution: { select: { id: true, code: true, name: true } },
      ownerDepartment:  { select: { id: true, code: true, name: true } },
      ownerUnit:        { select: { id: true, code: true, name: true } },
      output: {
        select: {
          id: true, name: true,
          outcome: {
            select: {
              id: true, name: true,
              objective: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Resolve department and unit IDs from a row.
 *
 * Priority:
 *  1. Explicit departmentCode / unitCode in the row
 *  2. Auto-detect from the indicator's ownerDepartment / ownerUnit assignment
 *
 * Returns { departmentId, unitId, warnings[] }
 */
async function resolveDeptUnit(row, indicator) {
  const warnings    = [];
  let departmentId  = null;
  let unitId        = null;

  const deptCode = row.departmentCode ? String(row.departmentCode).trim() : null;
  const unitCode = row.unitCode       ? String(row.unitCode).trim()       : null;

  // 1. Explicit unit lookup
  if (unitCode) {
    const unit = await prisma.unit.findFirst({
      where: { code: unitCode, isActive: true },
      select: { id: true, departmentId: true },
    });
    if (!unit) {
      warnings.push(`Unit code "${unitCode}" not found — unitId left blank`);
    } else {
      unitId       = unit.id;
      departmentId = unit.departmentId; // units always belong to a department
    }
  }

  // 2. Explicit department lookup (overrides auto-detected dept from unit if provided separately)
  if (deptCode && !unitCode) {
    const dept = await prisma.department.findFirst({
      where: { code: deptCode, isActive: true },
      select: { id: true },
    });
    if (!dept) {
      warnings.push(`Department code "${deptCode}" not found — departmentId left blank`);
    } else {
      departmentId = dept.id;
    }
  }

  // 3. Auto-detect from indicator owner when no explicit code provided
  if (!deptCode && !unitCode) {
    if (indicator.ownerDepartment) {
      departmentId = indicator.ownerDepartment.id;
    } else if (indicator.ownerUnit) {
      unitId       = indicator.ownerUnit.id;
      // Also set the parent department of the owning unit
      const ownerUnit = await prisma.unit.findUnique({
        where: { id: indicator.ownerUnit.id },
        select: { departmentId: true },
      });
      if (ownerUnit?.departmentId) departmentId = ownerUnit.departmentId;
    }
  }

  return { departmentId, unitId, warnings };
}

// ── Preview: parse file, validate, enrich — does NOT save ────────────────────
async function previewImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch {
    return res.status(400).json({ error: 'Could not parse file. Please use the provided Excel template.' });
  }

  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  if (rows.length === 0)  return res.status(400).json({ error: 'File is empty' });
  if (rows.length > 500)  return res.status(400).json({ error: 'Maximum 500 rows per import' });

  const previewRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;
    const {
      indicatorCode, institutionCode,
      departmentCode, unitCode,
      fiscalYear, period, value, remarks,
    } = row;

    const previewRow = {
      rowNum,
      indicatorCode:   indicatorCode   ? String(indicatorCode).trim()   : null,
      institutionCode: institutionCode ? String(institutionCode).trim() : null,
      departmentCode:  departmentCode  ? String(departmentCode).trim()  : null,
      unitCode:        unitCode        ? String(unitCode).trim()        : null,
      fiscalYear:      fiscalYear      ? String(fiscalYear)             : null,
      period:          period          ? String(period).trim()          : null,
      value,
      remarks:  remarks ? String(remarks) : null,
      status:   'ready',
      errors:   [],
      warnings: [],
      indicator:   null,
      institution: null,
      department:  null,
      unit:        null,
      chain:       null,
      owner:       null,
    };

    // Required fields
    if (!indicatorCode) previewRow.errors.push('indicatorCode is required');
    if (!fiscalYear)    previewRow.errors.push('fiscalYear is required');
    if (!period || !VALID_PERIODS.includes(String(period).trim()))
      previewRow.errors.push('period must be one of: Q1, Q2, Q3, Q4, Annual');
    if (value === null || value === undefined || isNaN(Number(value)))
      previewRow.errors.push('value must be a number');

    // Indicator lookup
    if (indicatorCode) {
      const indicator = await resolveIndicator(indicatorCode);
      if (!indicator) {
        previewRow.errors.push(`Indicator code "${indicatorCode}" not found`);
      } else {
        previewRow.indicator = {
          id: indicator.id, name: indicator.name,
          code: indicator.code, unit: indicator.unit,
          minValue: indicator.minValue, maxValue: indicator.maxValue,
        };
        previewRow.chain = {
          output:    indicator.output?.name                       || null,
          outcome:   indicator.output?.outcome?.name              || null,
          objective: indicator.output?.outcome?.objective?.name   || null,
        };
        previewRow.owner =
          indicator.ownerInstitution ? { type: 'Institution', ...indicator.ownerInstitution }
          : indicator.ownerDepartment ? { type: 'Department',  ...indicator.ownerDepartment  }
          : indicator.ownerUnit       ? { type: 'Unit',        ...indicator.ownerUnit        }
          : null;

        // Value range check
        if (value !== null && value !== undefined && !isNaN(Number(value))) {
          const numVal = Number(value);
          if (indicator.minValue != null && numVal < indicator.minValue)
            previewRow.errors.push(`Value ${numVal} is below minimum (${indicator.minValue})`);
          if (indicator.maxValue != null && numVal > indicator.maxValue)
            previewRow.errors.push(`Value ${numVal} exceeds maximum (${indicator.maxValue})`);
        }

        // Dept/unit resolution (preview only — just for display)
        const { departmentId, unitId, warnings } = await resolveDeptUnit(row, indicator);
        previewRow.warnings.push(...warnings);

        if (departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: departmentId }, select: { id: true, code: true, name: true },
          });
          if (dept) previewRow.department = dept;
        }
        if (unitId) {
          const unit = await prisma.unit.findUnique({
            where: { id: unitId }, select: { id: true, code: true, name: true },
          });
          if (unit) previewRow.unit = unit;
        }
      }
    }

    // Institution lookup
    if (institutionCode) {
      const inst = await prisma.institution.findUnique({
        where: { code: String(institutionCode).trim() },
        select: { id: true, code: true, name: true },
      });
      if (inst) {
        previewRow.institution = inst;
      } else {
        previewRow.errors.push(`Institution code "${institutionCode}" not found`);
      }
    }

    previewRow.status = previewRow.errors.length > 0 ? 'error' : 'ready';
    previewRows.push(previewRow);
  }

  const readyCount = previewRows.filter(r => r.status === 'ready').length;
  const errorCount = previewRows.filter(r => r.status === 'error').length;

  res.json({ total: previewRows.length, ready: readyCount, errors: errorCount, rows: previewRows });
}

// ── Bulk import: commit to DB ─────────────────────────────────────────────────
async function bulkImport(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch {
    return res.status(400).json({ error: 'Could not parse file. Please use the provided Excel template.' });
  }

  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  if (rows.length === 0)  return res.status(400).json({ error: 'File is empty' });
  if (rows.length > 500)  return res.status(400).json({ error: 'Maximum 500 rows per import' });

  const results = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;

    try {
      const {
        indicatorCode, institutionCode,
        fiscalYear, period, value, remarks,
      } = row;

      if (!indicatorCode) { results.errors.push({ row: rowNum, error: 'indicatorCode is required' }); results.skipped++; continue; }
      if (!fiscalYear)    { results.errors.push({ row: rowNum, error: 'fiscalYear is required' }); results.skipped++; continue; }
      if (!VALID_PERIODS.includes(String(period).trim())) {
        results.errors.push({ row: rowNum, error: `period must be one of: ${VALID_PERIODS.join(', ')}` }); results.skipped++; continue;
      }
      if (value === null || value === undefined || isNaN(Number(value))) {
        results.errors.push({ row: rowNum, error: 'value must be a number' }); results.skipped++; continue;
      }

      // Resolve indicator (with owner info for dept/unit auto-detection)
      const indicator = await resolveIndicator(indicatorCode);
      if (!indicator) {
        results.errors.push({ row: rowNum, error: `Indicator code "${indicatorCode}" not found` }); results.skipped++; continue;
      }

      // Resolve institution
      let institutionId = req.user.institutionId;
      if (institutionCode && ['super_admin', 'me_officer'].includes(req.user.role)) {
        const inst = await prisma.institution.findUnique({
          where: { code: String(institutionCode).trim() }, select: { id: true },
        });
        if (!inst) {
          results.errors.push({ row: rowNum, error: `Institution code "${institutionCode}" not found` }); results.skipped++; continue;
        }
        institutionId = inst.id;
      }
      if (!institutionId) {
        results.errors.push({ row: rowNum, error: 'institutionId could not be resolved' }); results.skipped++; continue;
      }

      // Resolve department and unit
      const { departmentId, unitId } = await resolveDeptUnit(row, indicator);

      // Value range validation
      const numVal = Number(value);
      if (indicator.minValue != null && numVal < indicator.minValue) {
        results.errors.push({ row: rowNum, error: `Value ${numVal} is below minimum (${indicator.minValue})` }); results.skipped++; continue;
      }
      if (indicator.maxValue != null && numVal > indicator.maxValue) {
        results.errors.push({ row: rowNum, error: `Value ${numVal} exceeds maximum (${indicator.maxValue})` }); results.skipped++; continue;
      }

      await prisma.indicatorActual.upsert({
        where: {
          indicatorId_institutionId_fiscalYear_reportingPeriod: {
            indicatorId:     indicator.id,
            institutionId,
            fiscalYear:      String(fiscalYear),
            reportingPeriod: String(period).trim(),
          },
        },
        update: {
          actualValue:  numVal,
          remarks:      remarks ? String(remarks) : null,
          departmentId,
          unitId,
          status:       'submitted',
          submittedById: req.user.id,
        },
        create: {
          indicatorId:   indicator.id,
          institutionId,
          departmentId,
          unitId,
          fiscalYear:      String(fiscalYear),
          reportingPeriod: String(period).trim(),
          actualValue:   numVal,
          remarks:       remarks ? String(remarks) : null,
          status:        'submitted',
          submittedById: req.user.id,
        },
      });

      results.imported++;
    } catch (err) {
      results.errors.push({ row: rowNum, error: err.message || 'Unknown error' });
      results.skipped++;
    }
  }

  res.json({
    message:  `Import complete: ${results.imported} records imported, ${results.skipped} skipped`,
    imported: results.imported,
    skipped:  results.skipped,
    errors:   results.errors,
  });
}

// ── Download Excel template ───────────────────────────────────────────────────
async function downloadTemplate(req, res) {
  const wb = XLSX.utils.book_new();

  // Sample data
  const templateData = [
    {
      indicatorCode: 'IND-001', institutionCode: 'BRELA',
      departmentCode: '',  unitCode: '',
      fiscalYear: '2025-2026', period: 'Q1', value: 100, remarks: 'Optional',
    },
    {
      indicatorCode: 'IND-002', institutionCode: 'MIT',
      departmentCode: 'DEPT-001', unitCode: '',
      fiscalYear: '2025-2026', period: 'Q1', value: 75,  remarks: 'Dept-level data',
    },
    {
      indicatorCode: 'IND-003', institutionCode: 'MIT',
      departmentCode: 'DEPT-001', unitCode: 'UNIT-001',
      fiscalYear: '2025-2026', period: 'Q1', value: 50,  remarks: 'Unit-level data',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Data Import');

  // Instructions sheet
  const instructions = [
    { Column: 'indicatorCode',   Required: 'YES', Description: 'Indicator code (find on Indicators Registry page)' },
    { Column: 'institutionCode', Required: 'YES', Description: 'Parent institution code (e.g. BRELA, MIT). Always required.' },
    { Column: 'departmentCode',  Required: 'NO',  Description: 'Department code if data is from a specific department. Leave blank for institution-level data. Auto-detected from indicator owner when blank.' },
    { Column: 'unitCode',        Required: 'NO',  Description: 'Unit code if data is from a specific unit. Leave blank for institution or department-level. Auto-detects parent department.' },
    { Column: 'fiscalYear',      Required: 'YES', Description: 'Fiscal year in format YYYY-YYYY (e.g. 2025-2026)' },
    { Column: 'period',          Required: 'YES', Description: 'Reporting period: Q1, Q2, Q3, Q4, or Annual' },
    { Column: 'value',           Required: 'YES', Description: 'Numeric actual value achieved' },
    { Column: 'remarks',         Required: 'NO',  Description: 'Optional comments or notes' },
  ];

  const notes = [
    { Note: '' },
    { Note: 'AUTO-ALLOCATION RULES:' },
    { Note: '1. If departmentCode and unitCode are both blank, the system auto-detects the department/unit from the indicator owner assignment.' },
    { Note: '2. If you provide unitCode, the parent department is also set automatically.' },
    { Note: '3. If you provide departmentCode only, the data is attributed to that department (no unit).' },
    { Note: '4. institutionCode is always required as the parent institution.' },
    { Note: '' },
    { Note: 'ANALYTICS IMPACT:' },
    { Note: 'Data with departmentCode/unitCode filled will appear in Department and Unit rankings.' },
    { Note: 'Data with only institutionCode will appear in Institution-level rankings only.' },
  ];

  const ws2 = XLSX.utils.json_to_sheet(instructions);
  ws2['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  const ws3 = XLSX.utils.json_to_sheet(notes);
  ws3['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Notes');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="MIT_MES_Import_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

module.exports = { previewImport, bulkImport, downloadTemplate };
