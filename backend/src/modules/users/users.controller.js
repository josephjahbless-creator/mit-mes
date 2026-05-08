const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const prisma = require('../../config/db');
const { sendWelcomeEmail } = require('../../utils/mailer');
const { generateMitEmail } = require('../../utils/mitEmail');

const SELECT_USER = {
  id: true, name: true, email: true, role: true, isActive: true,
  institutionId: true, departmentId: true, unitId: true,
  institution: { select: { id: true, name: true, code: true } },
  department:  { select: { id: true, name: true, code: true } },
  unit:        { select: { id: true, name: true, code: true } },
  createdAt: true,
};

async function list(req, res) {
  const where = {};
  // Admins can only see users in their own institution
  if (req.user.role === 'admin') where.institutionId = req.user.institutionId;
  if (req.query.institutionId) where.institutionId = req.query.institutionId;

  const users = await prisma.user.findMany({ where, select: SELECT_USER, orderBy: { name: 'asc' } });
  res.json(users);
}

async function getOne(req, res) {
  // Non-admin users may only view their own profile
  const role = req.user.role;
  if (!['super_admin', 'admin', 'me_officer'].includes(role) && req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: SELECT_USER });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, password, role, institutionId, departmentId, unitId, personalEmail } = req.body;

  // Prevent privilege escalation: only super_admin can create super_admin or me_officer
  const elevatedRoles = ['super_admin', 'me_officer'];
  if (role && elevatedRoles.includes(role) && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super_admin can create users with elevated roles' });
  }

  // Admins can only create users in their own institution
  const targetInstitutionId = req.user.role === 'admin' ? req.user.institutionId : institutionId;

  // Auto-generate MIT email from the user's name
  const email = await generateMitEmail(name, prisma);

  try {
    const user = await prisma.user.create({
      data: {
        name, email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        institutionId: targetInstitutionId || null,
        departmentId:  departmentId || null,
        unitId:        unitId       || null,
      },
      select: SELECT_USER,
    });

    // Send credentials to personal/contact email if given, else to the MIT email
    const sendTo = personalEmail?.trim() || email;
    sendWelcomeEmail(sendTo, name, email, password).catch(() => {});

    res.status(201).json(user);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
}

async function update(req, res) {
  const { name, role, isActive, institutionId, departmentId, unitId } = req.body;
  const callerRole = req.user.role;

  // Prevent privilege escalation: only super_admin can assign super_admin or me_officer roles
  const elevatedRoles = ['super_admin', 'me_officer'];
  if (role && elevatedRoles.includes(role) && callerRole !== 'super_admin') {
    return res.status(403).json({ error: 'Only super_admin can assign elevated roles' });
  }

  const data = { name, role, isActive };
  // Only update entity fields if explicitly provided (allow null to clear)
  if ('institutionId' in req.body) data.institutionId = institutionId || null;
  if ('departmentId'  in req.body) data.departmentId  = departmentId  || null;
  if ('unitId'        in req.body) data.unitId        = unitId        || null;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: SELECT_USER,
  });
  res.json(user);
}

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password || !PASSWORD_RE.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character' });
  }
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  // Invalidate all existing refresh tokens so sessions using old password are terminated
  await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
  res.json({ message: 'Password reset successfully' });
}

async function toggleActive(req, res) {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, isActive: true, role: true } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  // Prevent deactivating yourself
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account' });
  // Only super_admin can deactivate super_admin or me_officer
  if (['super_admin', 'me_officer'].includes(target.role) && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super_admin can deactivate privileged users' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !target.isActive },
    select: SELECT_USER,
  });
  // Invalidate sessions if deactivating
  if (!user.isActive) {
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
  }
  res.json(user);
}

module.exports = { list, getOne, create, update, resetPassword, toggleActive };
