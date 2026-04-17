const prisma = require('../../config/db');
const { calculate } = require('../../utils/formulaEngine');
const { getCurrentFiscalYear } = require('../../utils/fiscalYear');
const { sendSubmissionNotification, sendApprovalNotification } = require('../../utils/mailer');

async function listActuals(req, res) {
  const { indicatorId, institutionId, departmentId, unitId, period, fiscalYear, status } = req.query;
  const where = {};

  if (indicatorId)   where.indicatorId   = indicatorId;
  if (period)        where.reportingPeriod = period;
  if (fiscalYear)    where.fiscalYear    = fiscalYear;
  if (status)        where.status        = status;
  if (departmentId)  where.departmentId  = departmentId;
  if (unitId)        where.unitId        = unitId;

  // super_admin / me_officer / admin  → can see all entities (apply optional filter from query)
  // data_collector / viewer           → scoped to own institution only
  const isReviewer = ['super_admin', 'me_officer', 'admin'].includes(req.user.role);
  if (!isReviewer) {
    where.institutionId = req.user.institutionId;
  } else if (institutionId) {
    where.institutionId = institutionId;
  }

  const actuals = await prisma.indicatorActual.findMany({
    where,
    include: {
      indicator:   { select: { id: true, name: true, code: true, unit: true, formulaType: true, formulaConfig: true } },
      activity:    { select: { id: true, name: true, responsibleInstitutionId: true, responsibleDepartmentId: true, responsibleUnitId: true } },
      institution: { select: { id: true, name: true, code: true } },
      department:  { select: { id: true, name: true, code: true } },
      unit:        { select: { id: true, name: true, code: true } },
      submittedBy: { select: { id: true, name: true } },
      supervisedBy: { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
    },
    orderBy: [{ fiscalYear: 'desc' }, { reportingPeriod: 'asc' }],
  });
  res.json(actuals);
}

async function getActual(req, res) {
  const actual = await prisma.indicatorActual.findUnique({
    where: { id: req.params.id },
    include: {
      indicator:   true,
      institution: { select: { id: true, name: true } },
      department:  { select: { id: true, name: true, code: true } },
      unit:        { select: { id: true, name: true, code: true } },
      submittedBy: { select: { id: true, name: true } },
      supervisedBy: { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
    },
  });
  if (!actual) return res.status(404).json({ error: 'Not found' });
  res.json(actual);
}

async function getCalculated(req, res) {
  const actual = await prisma.indicatorActual.findUnique({
    where: { id: req.params.id },
    include: { indicator: true, institution: true },
  });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  const target = await prisma.indicatorTarget.findUnique({
    where: {
      indicatorId_institutionId_fiscalYear: {
        indicatorId: actual.indicatorId,
        institutionId: actual.institutionId,
        fiscalYear: actual.fiscalYear,
      },
    },
  });

  const periodTargetMap = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };
  const periodTarget = target?.[periodTargetMap[actual.reportingPeriod]];

  const result = calculate(
    actual.indicator.formulaType,
    actual.indicator.formulaConfig,
    {
      actualValue: actual.actualValue,
      baselineValue: actual.indicator.baselineValue,
      target: periodTarget,
      extraFields: actual.extraFields,
    }
  );

  res.json({ actual, target: periodTarget, calculated: result });
}

const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function submitActual(req, res) {
  const {
    indicatorId, activityId, objectiveId,
    institutionId, departmentId, unitId,
    fiscalYear, reportingPeriod, actualValue, extraFields, remarks, attachments,
  } = req.body;

  // ── Input validation ─────────────────────────────────────────────────────────
  if (!indicatorId || !UUID_RE.test(indicatorId)) {
    return res.status(400).json({ error: 'Valid indicatorId (UUID) is required' });
  }
  if (!fiscalYear || typeof fiscalYear !== 'string') {
    return res.status(400).json({ error: 'fiscalYear is required' });
  }
  if (!reportingPeriod || !VALID_PERIODS.includes(reportingPeriod)) {
    return res.status(400).json({ error: 'reportingPeriod must be one of: ' + VALID_PERIODS.join(', ') });
  }
  if (actualValue === undefined || actualValue === null || isNaN(Number(actualValue))) {
    return res.status(400).json({ error: 'actualValue must be a number' });
  }
  if (Number(actualValue) < 0) {
    return res.status(400).json({ error: 'actualValue cannot be negative' });
  }

  // Verify the indicator exists before proceeding
  const indicatorExists = await prisma.indicator.findUnique({ where: { id: indicatorId }, select: { id: true } });
  if (!indicatorExists) {
    return res.status(404).json({ error: 'Indicator not found' });
  }

  // ── Resolve responsible assignment: OBJECTIVE is the primary source of truth ─
  // Priority chain: objective assignment > body fields > user's own institution
  let resolvedInstitutionId = institutionId || null;
  let resolvedDepartmentId  = departmentId  || null;
  let resolvedUnitId        = unitId        || null;

  // Look up the objective's responsible assignment
  if (objectiveId) {
    const objective = await prisma.strategicObjective.findUnique({
      where: { id: objectiveId },
      select: {
        institutionId: true,
        responsibles: {
          select: { institutionId: true, departmentId: true, unitId: true },
        },
      },
    });
    if (objective) {
      if (objective.institutionId) resolvedInstitutionId = objective.institutionId;

      const responsibles = objective.responsibles || [];
      if (responsibles.length > 0) {
        // Find the responsible that matches the submitted departmentId/unitId
        let match = null;
        if (unitId)        match = responsibles.find(r => r.unitId       === unitId);
        if (!match && departmentId) match = responsibles.find(r => r.departmentId === departmentId);
        // Fallback to first responsible
        if (!match) match = responsibles[0];

        if (match) {
          if (match.unitId)        resolvedUnitId        = match.unitId;
          if (match.departmentId)  resolvedDepartmentId  = match.departmentId;
          if (match.institutionId) resolvedInstitutionId = match.institutionId;
        }
      }
    }
  }

  // If still no dept/unit from objective, fall back to the indicator's owner assignment
  if ((!resolvedDepartmentId && !resolvedUnitId) && indicatorId) {
    const indicatorOwner = await prisma.indicator.findUnique({
      where: { id: indicatorId },
      select: { ownerInstitutionId: true, ownerDepartmentId: true, ownerUnitId: true },
    });
    if (indicatorOwner) {
      if (!resolvedUnitId        && indicatorOwner.ownerUnitId)        resolvedUnitId        = indicatorOwner.ownerUnitId;
      if (!resolvedDepartmentId  && indicatorOwner.ownerDepartmentId)  resolvedDepartmentId  = indicatorOwner.ownerDepartmentId;
      if (!resolvedInstitutionId && indicatorOwner.ownerInstitutionId) resolvedInstitutionId = indicatorOwner.ownerInstitutionId;
    }
  }

  // For data_collector / admin: always lock to their own institution (security)
  if (req.user.role === 'data_collector' || req.user.role === 'admin') {
    resolvedInstitutionId = req.user.institutionId;
  }

  // Final fallback: the logged-in user's own institution
  if (!resolvedInstitutionId) {
    resolvedInstitutionId = req.user.institutionId || null;
  }

  if (!resolvedInstitutionId) {
    return res.status(400).json({
      error: 'Institution is required. The selected objective has no responsible institution assigned. Please assign a responsible entity to the objective first.',
    });
  }

  // ── Validate: actual must not exceed the defined target ───────────────────
  const periodTargetMap = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };

  const target = await prisma.indicatorTarget.findFirst({
    where: { indicatorId, institutionId: resolvedInstitutionId, fiscalYear },
  });

  if (target) {
    const periodTarget = target[periodTargetMap[reportingPeriod]];
    if (periodTarget != null && actualValue > periodTarget) {
      return res.status(422).json({
        error: `Submission rejected: progress value (${actualValue}) exceeds the defined target (${periodTarget}). Please enter a value within the target.`,
      });
    }
  }

  const actual = await prisma.indicatorActual.upsert({
    where: {
      indicatorId_institutionId_fiscalYear_reportingPeriod: {
        indicatorId, institutionId: resolvedInstitutionId, fiscalYear, reportingPeriod,
      },
    },
    update: {
      activityId: activityId || null,
      actualValue, extraFields, remarks, status: 'submitted',
      submittedById: req.user.id,
      departmentId: resolvedDepartmentId,
      unitId:       resolvedUnitId,
      attachments: attachments || [],
    },
    create: {
      indicatorId, activityId: activityId || null,
      institutionId: resolvedInstitutionId, fiscalYear, reportingPeriod,
      actualValue, extraFields, remarks, status: 'submitted',
      submittedById: req.user.id,
      departmentId: resolvedDepartmentId,
      unitId:       resolvedUnitId,
      attachments: attachments || [],
    },
  });

  // ── Notify M&E officers of new submission (fire-and-forget) ──────────────────
  prisma.user.findMany({
    where: { role: { in: ['me_officer', 'super_admin'] }, isActive: true },
    select: { email: true, name: true },
  }).then(officers => {
    officers.forEach(o =>
      sendSubmissionNotification(o.email, o.name, {
        indicatorName: indicator.name,
        period:        reportingPeriod,
        fiscalYear,
        actualValue,
        submittedBy:   req.user?.name || req.user?.email || 'Unknown',
      }).catch(() => {})
    );
  }).catch(() => {});

  // ── Compute live performance snapshot and attach to response ─────────────────
  const indicator = await prisma.indicator.findUnique({ where: { id: indicatorId } });
  const periodTargetKey2 = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };
  const perfTarget = target?.[periodTargetKey2[reportingPeriod]];
  const perfCalc   = calculate(
    indicator?.formulaType,
    indicator?.formulaConfig,
    { actualValue, baselineValue: indicator?.baselineValue, target: perfTarget, extraFields },
  );
  const achievementPct = perfTarget != null && perfTarget !== 0
    ? Math.round((actualValue / perfTarget) * 1000) / 10
    : null;

  // Log API key submissions for sync audit trail
  if (req.user.apiKeyAuth) {
    const { logSyncAttempt } = require('../integrations/integrations.controller');
    logSyncAttempt({
      apiKeyId: req.user.apiKeyId,
      institutionId: resolvedInstitutionId,
      endpoint: '/api/data-entry/actuals',
      method: 'POST',
      statusCode: 201,
      ipAddress: req.ip,
    });
  }

  res.status(201).json({
    ...actual,
    _performance: {
      target:         perfTarget   ?? null,
      actual:         actualValue,
      achievementPct,
      formulaResult:  perfCalc,
      status:         achievementPct == null ? 'no_target'
                    : achievementPct >= 90   ? 'on_track'
                    : achievementPct >= 60   ? 'moderate'
                    : 'off_track',
    },
  });
}

async function updateActual(req, res) {
  const { actualValue, extraFields, remarks, departmentId, unitId } = req.body;
  const actual = await prisma.indicatorActual.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Not found' });
  if (actual.status === 'approved') return res.status(400).json({ error: 'Cannot edit approved submission' });

  const updated = await prisma.indicatorActual.update({
    where: { id: req.params.id },
    data: {
      actualValue, extraFields, remarks, status: 'submitted',
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(unitId !== undefined && { unitId: unitId || null }),
    },
  });
  res.json(updated);
}

// ── Stage 2: Supervisor / Admin review ────────────────────────────────────────
// Transitions: submitted → pending_me (approved) | rejected
// Roles: admin, me_officer, super_admin
async function supervisorReview(req, res) {
  const { action, supervisorNote } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  const actual = await prisma.indicatorActual.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  // Only act on submissions that are in the submitted state
  if (actual.status !== 'submitted') {
    return res.status(400).json({
      error: `Cannot perform supervisor review on a submission with status "${actual.status}". Expected "submitted".`,
    });
  }

  const newStatus = action === 'approve' ? 'pending_me' : 'rejected';

  const updated = await prisma.indicatorActual.update({
    where: { id: req.params.id },
    data: {
      status: newStatus,
      supervisedById: req.user.id,
      supervisedAt: new Date(),
      supervisorNote: supervisorNote || null,
    },
    include: {
      indicator:    { select: { id: true, name: true, code: true } },
      institution:  { select: { id: true, name: true } },
      submittedBy:  { select: { id: true, name: true } },
      supervisedBy: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
}

// ── Stage 3: M&E Officer final review ─────────────────────────────────────────
// Transitions: pending_me → approved | rejected
// Roles: me_officer, super_admin
async function meReview(req, res) {
  const { action, remarks } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  const actual = await prisma.indicatorActual.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  // Only act on submissions pending final M&E review
  if (actual.status !== 'pending_me') {
    return res.status(400).json({
      error: `Cannot perform M&E review on a submission with status "${actual.status}". Expected "pending_me".`,
    });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const updated = await prisma.indicatorActual.update({
    where: { id: req.params.id },
    data: {
      status: newStatus,
      approvedById: req.user.id,
      approvedAt: new Date(),
      remarks: remarks || null,
    },
    include: {
      indicator:   { select: { id: true, name: true, code: true } },
      institution: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy:  { select: { id: true, name: true } },
    },
  });

  // ── Notify submitter of the decision (fire-and-forget) ───────────────────
  if (updated.submittedBy?.id) {
    prisma.user.findUnique({ where: { id: updated.submittedBy.id }, select: { email: true, name: true } })
      .then(submitter => {
        if (submitter) {
          sendApprovalNotification(submitter.email, submitter.name, {
            indicatorName: updated.indicator?.name || '—',
            period:        updated.reportingPeriod,
            fiscalYear:    updated.fiscalYear,
            status:        newStatus,
            remarks:       remarks || null,
          }).catch(() => {});
        }
      }).catch(() => {});
  }

  // ── Return live performance snapshot after approval ───────────────────────
  if (newStatus === 'approved') {
    const periodTargetKey = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };
    const tgt = await prisma.indicatorTarget.findFirst({
      where: {
        indicatorId: updated.indicatorId,
        institutionId: updated.institutionId,
        fiscalYear: updated.fiscalYear,
      },
    });
    const perfTarget = tgt?.[periodTargetKey[updated.reportingPeriod]];
    const achievementPct = perfTarget != null && perfTarget !== 0
      ? Math.round((updated.actualValue / perfTarget) * 1000) / 10
      : null;

    return res.json({
      ...updated,
      _performance: {
        target:         perfTarget ?? null,
        actual:         updated.actualValue,
        achievementPct,
        status:         achievementPct == null ? 'no_target'
                      : achievementPct >= 90   ? 'on_track'
                      : achievementPct >= 60   ? 'moderate'
                      : 'off_track',
      },
    });
  }

  res.json(updated);
}

// ── Legacy approve/reject — kept for backwards compatibility ──────────────────
// approveActual now performs a direct M&E-level approval regardless of workflow state.
// This is intentional for admin tooling / bulk operations.
async function approveActual(req, res) {
  const actual = await prisma.indicatorActual.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.indicatorActual.update({
    where: { id: req.params.id },
    data: { status: 'approved', approvedById: req.user.id, approvedAt: new Date() },
    include: { indicator: true },
  });

  // ── Return live performance snapshot after approval ───────────────────────
  const periodTargetKey2 = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };
  const tgt = await prisma.indicatorTarget.findFirst({
    where: { indicatorId: updated.indicatorId, institutionId: updated.institutionId, fiscalYear: updated.fiscalYear },
  });
  const perfTarget = tgt?.[periodTargetKey2[updated.reportingPeriod]];
  const achievementPct = perfTarget != null && perfTarget !== 0
    ? Math.round((updated.actualValue / perfTarget) * 1000) / 10
    : null;

  res.json({
    ...updated,
    _performance: {
      target:         perfTarget   ?? null,
      actual:         updated.actualValue,
      achievementPct,
      status:         achievementPct == null ? 'no_target'
                    : achievementPct >= 90   ? 'on_track'
                    : achievementPct >= 60   ? 'moderate'
                    : 'off_track',
    },
  });
}

async function rejectActual(req, res) {
  const { remarks } = req.body;
  const actual = await prisma.indicatorActual.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.indicatorActual.update({
    where: { id: req.params.id },
    data: { status: 'rejected', remarks, approvedById: req.user.id, approvedAt: new Date() },
  });
  res.json(updated);
}

// ── Comments ──────────────────────────────────────────────────────────────────

async function getComments(req, res) {
  // Verify the actual exists and the user is allowed to see it
  const actual = await prisma.indicatorActual.findUnique({
    where: { id: req.params.id },
    select: { id: true, institutionId: true },
  });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  // Scope check: data_collector/viewer can only see their own institution's actuals
  const isReviewer = ['super_admin', 'me_officer', 'admin'].includes(req.user.role);
  if (!isReviewer && actual.institutionId !== req.user.institutionId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Internal comments are hidden from data_collectors and viewers
  const where = { actualId: req.params.id };
  if (!isReviewer) {
    where.isInternal = false;
  }

  const comments = await prisma.submissionComment.findMany({
    where,
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(comments);
}

async function addComment(req, res) {
  const { comment, isInternal } = req.body;

  if (!comment || typeof comment !== 'string' || comment.trim() === '') {
    return res.status(400).json({ error: 'comment is required and must be a non-empty string' });
  }

  // Verify the actual exists and the user is allowed to see it
  const actual = await prisma.indicatorActual.findUnique({
    where: { id: req.params.id },
    select: { id: true, institutionId: true },
  });
  if (!actual) return res.status(404).json({ error: 'Not found' });

  // Scope check: data_collector/viewer can only comment on their own institution's actuals
  const isPrivileged = ['super_admin', 'me_officer', 'admin'].includes(req.user.role);
  if (!isPrivileged && actual.institutionId !== req.user.institutionId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // isInternal can only be set by me_officer or super_admin
  const canMarkInternal = ['me_officer', 'super_admin'].includes(req.user.role);
  const resolvedInternal = canMarkInternal ? Boolean(isInternal) : false;

  const created = await prisma.submissionComment.create({
    data: {
      actualId:   req.params.id,
      userId:     req.user.id,
      comment:    comment.trim(),
      isInternal: resolvedInternal,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  res.status(201).json(created);
}

// ── Submission tracking: completion status per institution / dept / unit ────────
async function submissionTracking(req, res) {
  const { fiscalYear = getCurrentFiscalYear(), period } = req.query;

  const [institutions, departments, actuals] = await Promise.all([
    prisma.institution.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { code: 'asc' },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      include: { units: { where: { isActive: true }, select: { id: true, name: true, code: true } } },
      orderBy: { orderNo: 'asc' },
    }),
    prisma.indicatorActual.findMany({
      where: {
        fiscalYear,
        ...(period ? { reportingPeriod: period } : {}),
      },
      select: {
        id: true,
        institutionId: true,
        departmentId: true,
        unitId: true,
        reportingPeriod: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        submittedBy: { select: { name: true } },
      },
    }),
  ]);

  // ── Institution-level tracking ────────────────────────────────────────────
  const instTracking = institutions.map(inst => {
    const instActuals = actuals.filter(a => a.institutionId === inst.id);
    const byStatus = instActuals.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    const total  = instActuals.length;
    const done   = (byStatus.approved || 0) + (byStatus.submitted || 0);
    const lastSubmission = instActuals
      .filter(a => a.submittedAt)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
    return {
      id: inst.id, name: inst.name, code: inst.code,
      total, draft: byStatus.draft || 0, submitted: byStatus.submitted || 0,
      pending_supervisor: byStatus.pending_supervisor || 0,
      pending_me: byStatus.pending_me || 0,
      approved: byStatus.approved || 0, rejected: byStatus.rejected || 0,
      completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
      lastSubmittedAt: lastSubmission?.submittedAt ?? null,
      lastSubmittedBy: lastSubmission?.submittedBy?.name ?? null,
    };
  });

  // ── Department-level tracking ─────────────────────────────────────────────
  const deptTracking = departments.map(dept => {
    const deptActuals = actuals.filter(a => a.departmentId === dept.id);
    const byStatus = deptActuals.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    const total = deptActuals.length;
    const done  = (byStatus.approved || 0) + (byStatus.submitted || 0);

    const unitTracking = dept.units.map(unit => {
      const unitActuals = actuals.filter(a => a.unitId === unit.id);
      const uByStatus = unitActuals.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {});
      const uTotal = unitActuals.length;
      const uDone  = (uByStatus.approved || 0) + (uByStatus.submitted || 0);
      const lastSub = unitActuals
        .filter(a => a.submittedAt)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
      return {
        id: unit.id, name: unit.name, code: unit.code,
        total: uTotal, submitted: uByStatus.submitted || 0,
        pending_supervisor: uByStatus.pending_supervisor || 0,
        pending_me: uByStatus.pending_me || 0,
        approved: uByStatus.approved || 0, rejected: uByStatus.rejected || 0,
        completionPct: uTotal > 0 ? Math.round((uDone / uTotal) * 100) : 0,
        lastSubmittedAt: lastSub?.submittedAt ?? null,
        lastSubmittedBy: lastSub?.submittedBy?.name ?? null,
      };
    });

    return {
      id: dept.id, name: dept.name, code: dept.code,
      total, draft: byStatus.draft || 0, submitted: byStatus.submitted || 0,
      pending_supervisor: byStatus.pending_supervisor || 0,
      pending_me: byStatus.pending_me || 0,
      approved: byStatus.approved || 0, rejected: byStatus.rejected || 0,
      completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
      units: unitTracking,
    };
  });

  res.json({
    fiscalYear, period: period || 'All',
    institutions: instTracking,
    departments: deptTracking,
  });
}

// ── List departments with units (for form dropdowns) ───────────────────────────
async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: { units: { where: { isActive: true }, orderBy: { orderNo: 'asc' } } },
    orderBy: { orderNo: 'asc' },
  });
  res.json(departments);
}

module.exports = {
  listActuals, getActual, getCalculated,
  submitActual, updateActual,
  supervisorReview, meReview,
  approveActual, rejectActual,
  getComments, addComment,
  submissionTracking, listDepartments,
};
