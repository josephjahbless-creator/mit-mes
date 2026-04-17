const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── List all activities with workplan fields ──────────────────────────────────
exports.listWorkplan = async (req, res) => {
  const { outputId, objectiveId, status, institutionId, fiscalYear } = req.query;
  const user = req.user;

  // Build output filter through results framework hierarchy
  let outputFilter = {};
  if (outputId) {
    outputFilter = { id: outputId };
  } else if (objectiveId) {
    outputFilter = {
      outcome: { objectiveId }
    };
  }

  // Institution scoping for non-super_admin
  let institutionFilter = {};
  if (user.role !== 'super_admin' && user.role !== 'me_officer') {
    institutionFilter = { responsibleInstitutionId: user.institutionId };
  } else if (institutionId) {
    institutionFilter = { responsibleInstitutionId: institutionId };
  }

  const where = {
    ...institutionFilter,
    ...(status ? { workplanStatus: status } : {}),
    ...(Object.keys(outputFilter).length ? { output: outputFilter } : {}),
  };

  const activities = await prisma.activity.findMany({
    where,
    include: {
      output: {
        include: {
          outcome: {
            include: { objective: { select: { id: true, name: true } } }
          }
        }
      },
      responsibleInstitution: { select: { id: true, name: true, code: true } },
      responsibleDepartment:  { select: { id: true, name: true } },
      responsibleUnit:        { select: { id: true, name: true } },
      milestones: { orderBy: { orderNo: 'asc' } },
      _count: { select: { budgetPlans: true, actuals: true } },
    },
    orderBy: [{ output: { outcome: { objective: { orderNo: 'asc' } } } }, { orderNo: 'asc' }],
  });

  res.json(activities);
};

// ── Workplan summary stats ────────────────────────────────────────────────────
exports.workplanSummary = async (req, res) => {
  const user = req.user;
  const { institutionId } = req.query;

  let institutionFilter = {};
  if (user.role !== 'super_admin' && user.role !== 'me_officer') {
    institutionFilter = { responsibleInstitutionId: user.institutionId };
  } else if (institutionId) {
    institutionFilter = { responsibleInstitutionId: institutionId };
  }

  const [total, byStatus] = await Promise.all([
    prisma.activity.count({ where: institutionFilter }),
    prisma.activity.groupBy({
      by: ['workplanStatus'],
      where: institutionFilter,
      _count: { id: true },
    }),
  ]);

  const milestoneStats = await prisma.activityMilestone.aggregate({
    where: { activity: institutionFilter },
    _count: { id: true },
  });

  const completedMilestones = await prisma.activityMilestone.count({
    where: { activity: institutionFilter, status: 'completed' },
  });

  const statusMap = {};
  byStatus.forEach(s => { statusMap[s.workplanStatus] = s._count.id; });

  res.json({
    total,
    not_started: statusMap.not_started || 0,
    in_progress: statusMap.in_progress || 0,
    completed:   statusMap.completed   || 0,
    delayed:     statusMap.delayed     || 0,
    on_hold:     statusMap.on_hold     || 0,
    totalMilestones:     milestoneStats._count.id,
    completedMilestones,
    overallProgress: total > 0
      ? Math.round(
          (await prisma.activity.aggregate({ where: institutionFilter, _avg: { progressPct: true } }))
            ._avg.progressPct || 0
        )
      : 0,
  });
};

// ── Get single activity with full workplan detail ─────────────────────────────
exports.getActivity = async (req, res) => {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      output: {
        include: {
          outcome: {
            include: { objective: { select: { id: true, name: true } } }
          }
        }
      },
      responsibleInstitution: { select: { id: true, name: true } },
      responsibleDepartment:  { select: { id: true, name: true } },
      responsibleUnit:        { select: { id: true, name: true } },
      milestones: { orderBy: { orderNo: 'asc' } },
      budgetPlans: {
        select: { id: true, fiscalYear: true, totalBudget: true, fundingSource: true },
      },
    },
  });
  res.json(activity);
};

// ── Update workplan fields for an activity ────────────────────────────────────
exports.updateWorkplan = async (req, res) => {
  const { startDate, endDate, progressPct, workplanStatus, remarks } = req.body;

  const updated = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...(startDate      !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate        !== undefined ? { endDate:   endDate   ? new Date(endDate)   : null } : {}),
      ...(progressPct    !== undefined ? { progressPct: parseFloat(progressPct) } : {}),
      ...(workplanStatus !== undefined ? { workplanStatus } : {}),
      ...(remarks        !== undefined ? { remarks } : {}),
    },
    include: { milestones: { orderBy: { orderNo: 'asc' } } },
  });

  res.json(updated);
};

// ── Create milestone ──────────────────────────────────────────────────────────
exports.createMilestone = async (req, res) => {
  const { title, description, dueDate, status, orderNo } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const milestone = await prisma.activityMilestone.create({
    data: {
      activityId:  req.params.id,
      title,
      description: description || null,
      dueDate:     dueDate ? new Date(dueDate) : null,
      status:      status  || 'not_started',
      orderNo:     orderNo || 0,
    },
  });
  res.status(201).json(milestone);
};

// ── Update milestone ──────────────────────────────────────────────────────────
exports.updateMilestone = async (req, res) => {
  const { title, description, dueDate, completedAt, status, orderNo } = req.body;

  const updated = await prisma.activityMilestone.update({
    where: { id: req.params.milestoneId },
    data: {
      ...(title       !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(dueDate     !== undefined ? { dueDate:     dueDate     ? new Date(dueDate)     : null } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
      ...(status      !== undefined ? { status } : {}),
      ...(orderNo     !== undefined ? { orderNo } : {}),
    },
  });
  res.json(updated);
};

// ── Delete milestone ──────────────────────────────────────────────────────────
exports.deleteMilestone = async (req, res) => {
  await prisma.activityMilestone.delete({ where: { id: req.params.milestoneId } });
  res.status(204).end();
};
