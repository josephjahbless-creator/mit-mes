const prisma = require('../../config/db');
const { calculate } = require('../../utils/formulaEngine');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');

// ── Shared owner include ───────────────────────────────────────────────────────
const OWNER_INCLUDE = {
  ownerInstitution: { select: { id: true, name: true, code: true } },
  ownerDepartment:  { select: { id: true, name: true, code: true } },
  ownerUnit:        { select: { id: true, name: true, code: true } },
};

const OUTPUT_INCLUDE = {
  output: {
    select: {
      id: true, name: true,
      outcome: {
        select: {
          id: true, name: true,
          objective: {
            select: {
              id: true, name: true, institutionId: true,
              responsibles: {
                select: {
                  id: true,
                  departmentId: true, unitId: true, institutionId: true,
                  department: { select: { id: true, name: true, code: true } },
                  unit:       { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  },
};

async function list(req, res) {
  const { outputId, search, ownerType, ownerInstitutionId, ownerDepartmentId, ownerUnitId } = req.query;
  const where = { isActive: true };

  if (outputId)           where.outputId = outputId;
  if (search)             where.name = { contains: search, mode: 'insensitive' };
  if (ownerType)          where.ownerType = ownerType;
  if (ownerInstitutionId) where.ownerInstitutionId = ownerInstitutionId;
  if (ownerDepartmentId)  where.ownerDepartmentId  = ownerDepartmentId;
  if (ownerUnitId)        where.ownerUnitId        = ownerUnitId;

  // All authenticated users can view the indicator registry (it's the framework, not sensitive data).
  // Institution-level restrictions apply to actuals/targets, not indicator definitions.
  const role = req.user?.role;

  const indicators = await prisma.indicator.findMany({
    where,
    include: {
      ...OUTPUT_INCLUDE,
      ...OWNER_INCLUDE,
    },
    orderBy: { code: 'asc' },
  });

  // Enrich each indicator with ALL effective owners derived from the framework chain
  // when no explicit ownerType is set. An indicator may belong to multiple departments
  // (when an objective has multiple objectiveResponsibles) — allEffectiveOwners captures
  // every responsible entity so grouping on the frontend is always complete and accurate.
  const enriched = indicators.map(ind => {
    if (ind.ownerType) return ind; // explicit owner wins

    const responsibles = ind.output?.outcome?.objective?.responsibles || [];
    const objInstId    = ind.output?.outcome?.objective?.institutionId;

    const allEffectiveOwners = [];

    // Collect every dept / unit responsible assigned to this objective
    for (const r of responsibles) {
      if (r.unitId) {
        allEffectiveOwners.push({ type: 'Unit', unitId: r.unitId, unit: r.unit || null });
      } else if (r.departmentId) {
        allEffectiveOwners.push({ type: 'Department', departmentId: r.departmentId, department: r.department || null });
      } else if (r.institutionId) {
        allEffectiveOwners.push({ type: 'Institution', institutionId: r.institutionId });
      }
    }

    // Only fall back to objective.institutionId when there are no dept/unit assignments —
    // this keeps MIT-HQ department indicators out of the MIT-HQ institution bucket.
    if (allEffectiveOwners.length === 0 && objInstId) {
      allEffectiveOwners.push({ type: 'Institution', institutionId: objInstId });
    }

    if (allEffectiveOwners.length === 0) return ind;

    // For backward compatibility also expose a single primary effectiveOwnerType
    // (Unit > Department > Institution — most specific first)
    const primary =
      allEffectiveOwners.find(o => o.type === 'Unit') ||
      allEffectiveOwners.find(o => o.type === 'Department') ||
      allEffectiveOwners.find(o => o.type === 'Institution');

    return {
      ...ind,
      effectiveOwnerType:         primary.type,
      effectiveOwnerInstitutionId: primary.institutionId || null,
      effectiveOwnerDepartmentId:  primary.departmentId  || null,
      effectiveOwnerUnitId:        primary.unitId        || null,
      effectiveOwnerUnit:          primary.unit          || null,
      effectiveOwnerDepartment:    primary.department    || null,
      allEffectiveOwners,
    };
  });

  res.json(enriched);
}

async function getOne(req, res) {
  const indicator = await prisma.indicator.findUnique({
    where: { id: req.params.id },
    include: {
      output: {
        include: {
          outcome: { include: { objective: true } }
        }
      },
      ...OWNER_INCLUDE,
    },
  });
  if (!indicator) return res.status(404).json({ error: 'Not found' });
  res.json(indicator);
}

async function getTargets(req, res) {
  const { fiscalYear, institutionId } = req.query;
  const where = { indicatorId: req.params.id };
  if (fiscalYear) where.fiscalYear = fiscalYear;
  if (institutionId) where.institutionId = institutionId;
  else if (req.institutionId) where.institutionId = req.institutionId;

  const targets = await prisma.indicatorTarget.findMany({
    where,
    include: { institution: { select: { id: true, name: true, code: true } } },
  });
  res.json(targets);
}

async function getActuals(req, res) {
  const { fiscalYear } = req.query;
  const where = {
    indicatorId: req.params.id,
    institutionId: req.params.institutionId,
  };
  if (fiscalYear) where.fiscalYear = fiscalYear;

  const actuals = await prisma.indicatorActual.findMany({
    where,
    include: {
      submittedBy: { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
    },
    orderBy: [{ fiscalYear: 'desc' }, { reportingPeriod: 'asc' }],
  });
  res.json(actuals);
}

async function create(req, res) {
  const {
    outputId, name, code, unit, dataSource, formulaType, formulaConfig,
    responsiblePerson, reportingFrequency, baselineValue, baselineYear,
    ownerType, ownerInstitutionId, ownerDepartmentId, ownerUnitId,
    indicatorType, progressDirection, indicatorStatus,
    description, collectionMethod, verificationSource,
    minValue, maxValue,
  } = req.body;

  // Validate: exactly one owner must be set when ownerType is provided
  if (!name || !name.trim()) return res.status(400).json({ error: 'Indicator name is required' });
  if (!code || !code.trim()) return res.status(400).json({ error: 'Indicator code is required' });
  if (!outputId)             return res.status(400).json({ error: 'outputId is required' });

  if (ownerType === 'Institution' && !ownerInstitutionId)
    return res.status(400).json({ error: 'ownerInstitutionId required for Institution owner type' });
  if (ownerType === 'Department' && !ownerDepartmentId)
    return res.status(400).json({ error: 'ownerDepartmentId required for Department owner type' });
  if (ownerType === 'Unit' && !ownerUnitId)
    return res.status(400).json({ error: 'ownerUnitId required for Unit owner type' });

  try {
    const indicator = await prisma.indicator.create({
      data: {
        outputId, name, code, unit: unit || 'Number',
        dataSource, formulaType, formulaConfig,
        responsiblePerson, reportingFrequency, baselineValue, baselineYear,
        ownerType: ownerType || null,
        ownerInstitutionId: ownerType === 'Institution' ? ownerInstitutionId : null,
        ownerDepartmentId:  ownerType === 'Department'  ? ownerDepartmentId  : null,
        ownerUnitId:        ownerType === 'Unit'        ? ownerUnitId        : null,
        indicatorType:      indicatorType    || null,
        progressDirection:  progressDirection || 'increasing',
        indicatorStatus:    indicatorStatus   || 'active',
        description:        description       || null,
        collectionMethod:   collectionMethod  || null,
        verificationSource: verificationSource || null,
        minValue:           minValue != null ? Number(minValue) : null,
        maxValue:           maxValue != null ? Number(maxValue) : null,
        createdById: req.user.id,
      },
      include: OWNER_INCLUDE,
    });
    res.status(201).json(indicator);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Indicator code already exists' });
    throw e;
  }
}

async function update(req, res) {
  const {
    name, unit, dataSource, formulaType, formulaConfig,
    responsiblePerson, reportingFrequency, baselineValue, baselineYear, isActive,
    ownerType, ownerInstitutionId, ownerDepartmentId, ownerUnitId,
    indicatorType, progressDirection, indicatorStatus,
    description, collectionMethod, verificationSource,
    minValue, maxValue,
  } = req.body;

  const data = {
    name, unit, dataSource, formulaType, formulaConfig,
    responsiblePerson, reportingFrequency, baselineValue, baselineYear, isActive,
  };

  // Only update owner fields if ownerType is explicitly passed
  if (ownerType !== undefined) {
    data.ownerType          = ownerType || null;
    data.ownerInstitutionId = ownerType === 'Institution' ? ownerInstitutionId : null;
    data.ownerDepartmentId  = ownerType === 'Department'  ? ownerDepartmentId  : null;
    data.ownerUnitId        = ownerType === 'Unit'        ? ownerUnitId        : null;
  }

  if (indicatorType    !== undefined) data.indicatorType    = indicatorType;
  if (progressDirection !== undefined) data.progressDirection = progressDirection;
  if (indicatorStatus   !== undefined) data.indicatorStatus   = indicatorStatus;
  if (description       !== undefined) data.description       = description;
  if (collectionMethod  !== undefined) data.collectionMethod  = collectionMethod;
  if (verificationSource !== undefined) data.verificationSource = verificationSource;
  if (minValue !== undefined) data.minValue = minValue != null ? Number(minValue) : null;
  if (maxValue !== undefined) data.maxValue = maxValue != null ? Number(maxValue) : null;

  const indicator = await prisma.indicator.update({
    where: { id: req.params.id },
    data,
    include: OWNER_INCLUDE,
  });
  res.json(indicator);
}

async function setTargets(req, res) {
  const { institutionId, fiscalYear, q1Target, q2Target, q3Target, q4Target, annualTarget } = req.body;
  const targetInstitutionId = req.user.role === 'admin' ? req.user.institutionId : institutionId;

  const target = await prisma.indicatorTarget.upsert({
    where: {
      indicatorId_institutionId_fiscalYear: {
        indicatorId: req.params.id,
        institutionId: targetInstitutionId,
        fiscalYear,
      },
    },
    update: { q1Target, q2Target, q3Target, q4Target, annualTarget },
    create: {
      indicatorId: req.params.id,
      institutionId: targetInstitutionId,
      fiscalYear, q1Target, q2Target, q3Target, q4Target, annualTarget,
    },
  });
  res.json(target);
}

async function getAllTargets(req, res) {
  const { fiscalYear } = req.query;
  const targets = await prisma.indicatorTarget.findMany({
    where: { fiscalYear: fiscalYear || getCurrentFiscalYear() },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      indicator:   { select: { id: true, name: true, code: true, unit: true } },
    },
    orderBy: [{ institutionId: 'asc' }, { indicatorId: 'asc' }],
  });
  res.json(targets);
}

async function getStats(req, res) {
  const [byType, byStatus, byDirection, total] = await Promise.all([
    prisma.indicator.groupBy({ by: ['indicatorType'], _count: { id: true }, where: { isActive: true } }),
    prisma.indicator.groupBy({ by: ['indicatorStatus'], _count: { id: true }, where: { isActive: true } }),
    prisma.indicator.groupBy({ by: ['progressDirection'], _count: { id: true }, where: { isActive: true } }),
    prisma.indicator.count({ where: { isActive: true } }),
  ]);
  res.json({ total, byType, byStatus, byDirection });
}

module.exports = { list, getOne, getTargets, getAllTargets, getActuals, create, update, setTargets, getStats };
