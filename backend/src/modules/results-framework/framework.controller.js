const prisma = require('../../config/db');

const NATIONAL_IDS = ['so-A','so-B','so-C','so-D','so-E','so-F','so-X','so-Y'];

// ── Shared includes ────────────────────────────────────────────────────────────
const RESPONSIBLE_SELECT = { id: true, name: true, code: true };

const RESPONSIBLES_INCLUDE = {
  responsibles: {
    include: {
      institution: { select: RESPONSIBLE_SELECT },
      department:  { select: RESPONSIBLE_SELECT },
      unit:        { select: RESPONSIBLE_SELECT },
    },
    orderBy: { createdAt: 'asc' },
  },
};

const OBJECTIVE_INCLUDE = {
  institution:  { select: RESPONSIBLE_SELECT },
  ...RESPONSIBLES_INCLUDE,
  outcomes: {
    orderBy: { orderNo: 'asc' },
    include: {
      outputs: {
        orderBy: { orderNo: 'asc' },
        include: {
          activities: {
            orderBy: { orderNo: 'asc' },
            include: {
              responsibleInstitution: { select: RESPONSIBLE_SELECT },
              responsibleDepartment:  { select: RESPONSIBLE_SELECT },
              responsibleUnit:        { select: RESPONSIBLE_SELECT },
            },
          },
          indicators: { select: { id: true, name: true, code: true, unit: true } },
        },
      },
    },
  },
};

// ── Objectives ─────────────────────────────────────────────────────────────────
async function listObjectives(req, res) {
  const { scope, institutionId, departmentId, unitId } = req.query;

  let where = {};
  if (scope === 'ministerial') {
    where = { id: { in: NATIONAL_IDS } };
  } else if (unitId) {
    where = { responsibles: { some: { unitId } } };
  } else if (departmentId) {
    where = { responsibles: { some: { departmentId } } };
  } else if (institutionId) {
    // Match objectives owned by this institution OR where institution is a responsible
    where = {
      OR: [
        { institutionId },
        { responsibles: { some: { institutionId } } },
      ],
    };
  }

  const objectives = await prisma.strategicObjective.findMany({
    where,
    include: OBJECTIVE_INCLUDE,
    orderBy: { orderNo: 'asc' },
  });
  res.json(objectives);
}

async function getObjectiveTree(req, res) {
  const objective = await prisma.strategicObjective.findUnique({
    where: { id: req.params.id },
    include: OBJECTIVE_INCLUDE,
  });
  if (!objective) return res.status(404).json({ error: 'Not found' });
  res.json(objective);
}

async function createObjective(req, res) {
  const { name, description, orderNo, institutionId, responsibles } = req.body;
  // responsibles: [{departmentId, unitId, institutionId}]

  const obj = await prisma.strategicObjective.create({
    data: {
      name, description, orderNo,
      institutionId: institutionId || null,
      ...(responsibles?.length && {
        responsibles: {
          create: responsibles.map(r => ({
            departmentId:  r.departmentId  || null,
            unitId:        r.unitId        || null,
            institutionId: r.institutionId || null,
          })),
        },
      }),
    },
    include: OBJECTIVE_INCLUDE,
  });
  res.status(201).json(obj);
}

async function updateObjective(req, res) {
  const { name, description, orderNo, responsibles } = req.body;

  const obj = await prisma.$transaction(async (tx) => {
    // Replace responsibles if provided
    if (responsibles !== undefined) {
      await tx.objectiveResponsible.deleteMany({ where: { objectiveId: req.params.id } });
      if (responsibles.length > 0) {
        await tx.objectiveResponsible.createMany({
          data: responsibles.map(r => ({
            objectiveId:   req.params.id,
            departmentId:  r.departmentId  || null,
            unitId:        r.unitId        || null,
            institutionId: r.institutionId || null,
          })),
        });
      }
    }
    return tx.strategicObjective.update({
      where: { id: req.params.id },
      data: { name, description, orderNo },
      include: OBJECTIVE_INCLUDE,
    });
  });
  res.json(obj);
}

async function deleteObjective(req, res) {
  await prisma.strategicObjective.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── Outcomes ───────────────────────────────────────────────────────────────────
async function createOutcome(req, res) {
  const { objectiveId, name, description, orderNo } = req.body;
  const outcome = await prisma.outcome.create({ data: { objectiveId, name, description, orderNo } });
  res.status(201).json(outcome);
}
async function updateOutcome(req, res) {
  const { name, description, orderNo } = req.body;
  const outcome = await prisma.outcome.update({ where: { id: req.params.id }, data: { name, description, orderNo } });
  res.json(outcome);
}
async function deleteOutcome(req, res) {
  await prisma.outcome.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── Outputs ────────────────────────────────────────────────────────────────────
async function createOutput(req, res) {
  const { outcomeId, name, description, orderNo } = req.body;
  const output = await prisma.output.create({ data: { outcomeId, name, description, orderNo } });
  res.status(201).json(output);
}
async function updateOutput(req, res) {
  const { name, description, orderNo } = req.body;
  const output = await prisma.output.update({ where: { id: req.params.id }, data: { name, description, orderNo } });
  res.json(output);
}
async function deleteOutput(req, res) {
  await prisma.output.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── Activities ─────────────────────────────────────────────────────────────────
async function createActivity(req, res) {
  const { outputId, name, description, orderNo } = req.body;
  const activity = await prisma.activity.create({ data: { outputId, name, description, orderNo } });
  res.status(201).json(activity);
}
async function updateActivity(req, res) {
  const { name, description, orderNo } = req.body;
  const activity = await prisma.activity.update({
    where: { id: req.params.id },
    data: { name, description, orderNo },
  });
  res.json(activity);
}
async function deleteActivity(req, res) {
  await prisma.activity.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ── Chain (for submission form dropdowns) ──────────────────────────────────────
// Optional query params:
//   ?institutionId=xxx  — filter to objectives/indicators relevant to this institution
//   ?departmentId=xxx   — filter to outputs/indicators owned by this department
//   ?unitId=xxx         — filter to outputs/indicators owned by this unit
async function getChain(req, res) {
  const { institutionId, departmentId, unitId } = req.query;

  // Shared indicator condition — indicators with NO owner are visible to everyone
  const sharedIndicator = { AND: [{ ownerInstitutionId: null }, { ownerDepartmentId: null }, { ownerUnitId: null }] };

  // Build indicator where clause — filter by entity when scoping is requested
  const indicatorWhere = { isActive: true };
  if (unitId) {
    // Unit-level user: see unit-owned indicators + shared
    indicatorWhere.OR = [
      { ownerUnitId: unitId },
      sharedIndicator,
    ];
  } else if (departmentId) {
    // Department-level user (e.g. MEU, DTD): see dept-owned indicators + shared
    // Do NOT use institution-level target filter here — all MIT depts share MIT-HQ
    // as institutionId for targets, which would cause bleed-through.
    indicatorWhere.OR = [
      { ownerDepartmentId: departmentId },
      sharedIndicator,
    ];
  } else if (institutionId) {
    // Pure institution-level user (e.g. CAMARTEC, BRELA):
    // Include indicators that have targets for this institution, are explicitly owned
    // by this institution, or have no owner (shared/national).
    indicatorWhere.OR = [
      { targets: { some: { institutionId } } },
      { ownerInstitutionId: institutionId },
      sharedIndicator,
    ];
  }

  const objectives = await prisma.strategicObjective.findMany({
    orderBy: { orderNo: 'asc' },
    include: {
      institution: { select: RESPONSIBLE_SELECT },
      responsibles: {
        include: {
          institution: { select: RESPONSIBLE_SELECT },
          department:  { select: RESPONSIBLE_SELECT },
          unit:        { select: RESPONSIBLE_SELECT },
        },
        orderBy: { createdAt: 'asc' },
      },
      outcomes: {
        orderBy: { orderNo: 'asc' },
        include: {
          outputs: {
            orderBy: { orderNo: 'asc' },
            include: {
              activities: {
                orderBy: { orderNo: 'asc' },
                select: {
                  id: true, name: true, weight: true,
                  responsibleInstitutionId: true,
                  responsibleDepartmentId:  true,
                  responsibleUnitId:        true,
                },
              },
              indicators: {
                where: indicatorWhere,
                select: {
                  id: true, name: true, code: true, unit: true, baselineValue: true, formulaType: true,
                  ownerType: true, ownerInstitutionId: true, ownerDepartmentId: true, ownerUnitId: true,
                  ownerInstitution: { select: { id: true, name: true, code: true } },
                  ownerDepartment:  { select: { id: true, name: true, code: true } },
                  ownerUnit:        { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const isScoped = !!(institutionId || departmentId || unitId);

  const result = objectives
    .map(obj => {
      const firstResp = obj.responsibles?.[0];
      const responsible = firstResp?.unit || firstResp?.department || firstResp?.institution || obj.institution || null;

      // Filter outputs: when scoped, only include outputs that have ≥1 relevant indicator
      const relevantOutputs = obj.outcomes.flatMap(oc =>
        oc.outputs
          .filter(op => !isScoped || op.indicators.length > 0)
          .map(op => ({
            id:          op.id,
            name:        op.name,
            outcomeName: oc.name,
            activities:  op.activities.map(a => ({
              id: a.id, name: a.name, weight: a.weight,
              responsibleInstitutionId: a.responsibleInstitutionId || null,
              responsibleDepartmentId:  a.responsibleDepartmentId  || null,
              responsibleUnitId:        a.responsibleUnitId        || null,
            })),
            indicators: op.indicators,
          }))
      );

      return {
        id:   obj.id,
        name: obj.name,
        weight: obj.weight,
        institution:            obj.institution,
        responsibleInstitution: obj.institution,
        responsibles: obj.responsibles || [],
        responsibleDepartment: firstResp?.department || null,
        responsibleUnit:       firstResp?.unit       || null,
        responsible,
        outputs: relevantOutputs,
      };
    })
    // When scoped, drop objectives that ended up with no outputs
    .filter(obj => !isScoped || obj.outputs.length > 0);

  res.json(result);
}

module.exports = {
  listObjectives, getObjectiveTree, getChain,
  createObjective, updateObjective, deleteObjective,
  createOutcome, updateOutcome, deleteOutcome,
  createOutput, updateOutput, deleteOutput,
  createActivity, updateActivity, deleteActivity,
};
