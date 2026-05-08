const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const prisma    = require('../../config/db');

const APP_NAME = 'MIT M&E System';

// GET /auth/2fa/status
async function status(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { twoFactorEnabled: true },
  });
  res.json({ enabled: user?.twoFactorEnabled || false });
}

// POST /auth/2fa/setup — generate secret + QR code (does NOT enable yet)
async function setup(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });

  const secret = speakeasy.generateSecret({
    name:   `${APP_NAME} (${user.email})`,
    length: 20,
  });

  // Store secret temporarily (not enabled yet — enabled after verify)
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { twoFactorSecret: secret.base32 },
  });

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    secret:       secret.base32,
    qrCodeDataUrl,
    manualCode:   secret.base32,
    otpauthUrl:   secret.otpauth_url,
  });
}

// POST /auth/2fa/verify — verify TOTP token and enable 2FA
async function verify(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'TOTP token is required' });

  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorSecret) {
    return res.status(400).json({ error: 'Run /auth/2fa/setup first to generate a secret' });
  }

  const valid = speakeasy.totp.verify({
    secret:   user.twoFactorSecret,
    encoding: 'base32',
    token:    String(token).replace(/\s/g, ''),
    window:   1,
  });

  if (!valid) return res.status(400).json({ error: 'Invalid or expired token' });

  await prisma.user.update({
    where: { id: req.user.id },
    data:  { twoFactorEnabled: true },
  });

  res.json({ message: '2FA enabled successfully' });
}

// POST /auth/2fa/disable — verify current token then disable
async function disable(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'TOTP token is required to disable 2FA' });

  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    return res.status(400).json({ error: '2FA is not enabled on this account' });
  }

  const valid = speakeasy.totp.verify({
    secret:   user.twoFactorSecret,
    encoding: 'base32',
    token:    String(token).replace(/\s/g, ''),
    window:   1,
  });

  if (!valid) return res.status(400).json({ error: 'Invalid or expired token' });

  await prisma.user.update({
    where: { id: req.user.id },
    data:  { twoFactorEnabled: false, twoFactorSecret: null },
  });

  res.json({ message: '2FA disabled successfully' });
}

// POST /auth/2fa/challenge — verify TOTP during login flow and issue tokens
async function challenge(req, res) {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'userId and token are required' });

  const { signAccess, signRefresh } = require('../../config/jwt');
  const dayjs = require('dayjs');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      department:  { select: { id: true, name: true, code: true } },
      unit:        { select: { id: true, name: true, code: true } },
    },
  });

  if (!user || !user.isActive) return res.status(401).json({ error: 'User not found or inactive' });
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ error: '2FA is not enabled for this user' });
  }

  const valid = speakeasy.totp.verify({
    secret:   user.twoFactorSecret,
    encoding: 'base32',
    token:    String(token).replace(/\s/g, ''),
    window:   1,
  });

  if (!valid) return res.status(401).json({ error: 'Invalid or expired 2FA token' });

  const payload = {
    id: user.id, email: user.email, role: user.role,
    institutionId: user.institutionId,
    departmentId:  user.departmentId,
    unitId:        user.unitId,
  };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh({ id: user.id });

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: dayjs().add(7, 'day').toDate() },
  });

  res.json({
    accessToken, refreshToken,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      institutionId: user.institutionId, departmentId: user.departmentId, unitId: user.unitId,
      institution: user.institution, department: user.department, unit: user.unit,
    },
  });
}

module.exports = { status, setup, verify, disable, challenge };
