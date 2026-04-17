const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const dayjs = require('dayjs');
const prisma = require('../../config/db');
const { signAccess, signRefresh, verifyRefresh } = require('../../config/jwt');
const { sendPasswordResetEmail, sendAccountLockedEmail } = require('../../utils/mailer');

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

// ── Login ──────────────────────────────────────────────────────────────────────
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      department:  { select: { id: true, name: true, code: true } },
      unit:        { select: { id: true, name: true, code: true } },
    },
  });

  // Unknown email — return generic message to avoid user enumeration
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Account disabled
  if (!user.isActive) return res.status(401).json({ error: 'Account is inactive. Contact your administrator.' });

  // Account locked?
  if (user.lockedUntil && dayjs().isBefore(dayjs(user.lockedUntil))) {
    const remaining = Math.ceil(dayjs(user.lockedUntil).diff(dayjs(), 'second') / 60);
    return res.status(423).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
      lockedUntil: user.lockedUntil,
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.failedLoginAttempts + 1;
    const willLock = newAttempts >= MAX_ATTEMPTS;
    const lockedUntil = willLock ? dayjs().add(LOCKOUT_MINUTES, 'minute').toDate() : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        ...(willLock ? { lockedUntil } : {}),
      },
    });

    if (willLock) {
      // Fire-and-forget — don't block the response if email fails
      sendAccountLockedEmail(user.email, user.name, lockedUntil).catch(() => {});
      return res.status(423).json({
        error: `Account locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
        lockedUntil,
      });
    }

    const attemptsLeft = MAX_ATTEMPTS - newAttempts;
    return res.status(401).json({
      error: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before account is locked.`,
    });
  }

  // ── Successful login — reset counters ─────────────────────────────────────
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  const payload = {
    id: user.id, email: user.email, role: user.role,
    institutionId: user.institutionId,
    departmentId:  user.departmentId,
    unitId:        user.unitId,
  };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: dayjs().add(7, 'day').toDate(),
    },
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      departmentId:  user.departmentId,
      unitId:        user.unitId,
      institution:   user.institution,
      department:    user.department,
      unit:          user.unit,
    },
  });
}

// ── Refresh ────────────────────────────────────────────────────────────────────
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = verifyRefresh(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || dayjs().isAfter(stored.expiresAt)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found' });

    const newRefreshToken = signRefresh({ id: user.id });
    const [deleted] = await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: { userId: user.id, token: newRefreshToken, expiresAt: dayjs().add(7, 'day').toDate() },
      }),
    ]);
    if (deleted.count === 0) return res.status(401).json({ error: 'Invalid refresh token' });

    const newPayload = { id: user.id, email: user.email, role: user.role, institutionId: user.institutionId };
    res.json({ accessToken: signAccess(newPayload), refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────────
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  res.json({ message: 'Logged out' });
}

// ── Me ─────────────────────────────────────────────────────────────────────────
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true,
      institutionId: true, departmentId: true, unitId: true,
      institution: { select: { id: true, name: true, code: true } },
      department:  { select: { id: true, name: true, code: true } },
      unit:        { select: { id: true, name: true, code: true } },
    },
  });
  res.json(user);
}

// ── Change Password (self-service, requires current password) ──────────────────
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }

  if (!PASSWORD_RE.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters and include an uppercase letter, a number, and a special character',
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });

  // Invalidate all other sessions so old-password sessions are terminated
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  res.json({ message: 'Password changed successfully. Please log in again.' });
}

// ── Forgot Password — send reset link ─────────────────────────────────────────
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Always return success to prevent user enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = dayjs().add(1, 'hour').toDate();

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  sendPasswordResetEmail(user.email, user.name, token).catch((err) => {
    console.error('[forgotPassword] email error:', err.message);
  });

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
}

// ── Reset Password — consume token from email link ────────────────────────────
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (!PASSWORD_RE.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character',
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // Invalidate all sessions
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  res.json({ message: 'Password has been reset successfully. You may now log in.' });
}

module.exports = { login, refresh, logout, me, changePassword, forgotPassword, resetPassword };
