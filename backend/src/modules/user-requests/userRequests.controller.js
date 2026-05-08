const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');
const { emitToRole } = require('../../lib/socket');
const { sendWelcomeEmail, sendRejectionEmail } = require('../../utils/mailer');
const { generateMitEmail } = require('../../utils/mitEmail');

const ROLE_LABELS = {
  data_collector: 'Data Collector',
  viewer: 'Viewer',
  me_officer: 'M&E Officer',
};

// POST /api/auth/request-account  (public — no auth)
async function requestAccount(req, res) {
  const { name, email, institution, role, reason } = req.body;

  if (!name?.trim() || !email?.trim() || !institution?.trim()) {
    return res.status(400).json({ error: 'Name, email, and institution are required' });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const allowed = ['data_collector', 'viewer', 'me_officer'];
  const requestedRole = allowed.includes(role) ? role : 'data_collector';

  // Prevent duplicate pending requests for same email
  const existing = await prisma.userRequest.findFirst({
    where: { email: email.toLowerCase().trim(), status: 'pending' },
  });
  if (existing) {
    return res.status(409).json({ error: 'A pending request for this email already exists. An administrator will review it.' });
  }

  // Also prevent if user account already exists
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Use "Forgot password?" if you need access.' });
  }

  const request = await prisma.userRequest.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      institution: institution.trim(),
      role: requestedRole,
      reason: reason?.trim() || null,
    },
  });

  // Notify all admins and super_admins in real-time
  const admins = await prisma.user.findMany({
    where: { role: { in: ['super_admin', 'admin'] }, isActive: true },
    select: { id: true },
  });

  const notifData = admins.map(a => ({
    userId: a.id,
    type: 'account_request',
    title: 'New Account Request',
    message: `${name} (${email}) from ${institution} has requested ${ROLE_LABELS[requestedRole] || requestedRole} access.`,
    relatedType: 'user-requests',
    relatedId: request.id,
  }));

  if (notifData.length > 0) {
    await prisma.notification.createMany({ data: notifData });
    emitToRole('admin',       'notification:new', {});
    emitToRole('super_admin', 'notification:new', {});
  }

  res.status(201).json({ message: 'Request submitted. An administrator will review it and contact you.' });
}

// GET /api/user-requests  (admin)
async function listRequests(req, res) {
  const { status } = req.query;
  const where = status ? { status } : {};

  const requests = await prisma.userRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(requests);
}

// POST /api/user-requests/:id/approve  (admin)
async function approveRequest(req, res) {
  const { id } = req.params;
  const { password, institutionId, departmentId, unitId } = req.body;

  const request = await prisma.userRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request has already been actioned' });

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'A password of at least 8 characters is required to create the account' });
  }

  // Generate MIT login email from the applicant's name
  const mitEmail = await generateMitEmail(request.name, prisma);

  const hash = await bcrypt.hash(password, 12);
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: request.name,
        email: mitEmail,          // MIT email becomes their login
        passwordHash: hash,
        role: request.role,
        institutionId: institutionId || null,
        departmentId: departmentId || null,
        unitId: unitId || null,
        isActive: true,
      },
    }),
    prisma.userRequest.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date(), reviewedById: req.user.id },
    }),
  ]);

  // Send credentials to their personal email (from request), showing MIT login email
  sendWelcomeEmail(request.email, request.name, mitEmail, password).catch(() => {});

  res.json({ message: 'Account created successfully', userId: user.id });
}

// POST /api/user-requests/:id/reject  (admin)
async function rejectRequest(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const request = await prisma.userRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request has already been actioned' });

  const updated = await prisma.userRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectionReason: reason?.trim() || null,
      reviewedAt: new Date(),
      reviewedById: req.user.id,
    },
  });

  // Notify the applicant (non-blocking)
  sendRejectionEmail(updated.email, updated.name, reason?.trim() || null).catch(() => {});

  res.json({ message: 'Request rejected' });
}

// GET /api/user-requests/count  (admin) — unreviewed count for badge
async function pendingCount(req, res) {
  const count = await prisma.userRequest.count({ where: { status: 'pending' } });
  res.json({ count });
}

module.exports = { requestAccount, listRequests, approveRequest, rejectRequest, pendingCount };
