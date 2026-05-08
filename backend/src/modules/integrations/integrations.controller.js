const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate: mit_<INSTCODE>_<32 random hex chars>
function generateRawKey(institutionCode) {
  const code = (institutionCode || 'key').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6);
  const rand = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  return `mit_${code}_${rand}`;
}

async function listKeys(req, res) {
  const where = {};
  if (req.user.role !== 'super_admin' && req.user.role !== 'me_officer') {
    where.institutionId = req.user.institutionId;
  } else if (req.query.institutionId) {
    where.institutionId = req.query.institutionId;
  }

  const keys = await prisma.apiKey.findMany({
    where,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Never return the hash
  res.json(keys.map(({ keyHash, ...k }) => k));
}

async function generateKey(req, res) {
  const { institutionId, label, expiresAt } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: 'Label is required' });

  const targetInstId = req.user.role === 'admin' ? req.user.institutionId : institutionId;
  if (!targetInstId) return res.status(400).json({ error: 'institutionId is required' });

  const institution = await prisma.institution.findUnique({ where: { id: targetInstId } });
  if (!institution) return res.status(404).json({ error: 'Institution not found' });

  const rawKey = generateRawKey(institution.code);
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = await bcrypt.hash(rawKey, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      institutionId: targetInstId,
      label: label.trim(),
      keyHash,
      keyPrefix,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdById: req.user.id,
    },
    include: {
      institution: { select: { id: true, name: true, code: true } },
    },
  });

  // Return the raw key ONCE — it will never be shown again
  res.status(201).json({ ...apiKey, keyHash: undefined, rawKey });
}

async function revokeKey(req, res) {
  const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key) return res.status(404).json({ error: 'Key not found' });

  // Admins can only revoke keys for their own institution
  if (req.user.role === 'admin' && key.institutionId !== req.user.institutionId) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await prisma.apiKey.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Key revoked' });
}

async function deleteKey(req, res) {
  const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key) return res.status(404).json({ error: 'Key not found' });

  if (req.user.role === 'admin' && key.institutionId !== req.user.institutionId) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await prisma.apiKey.delete({ where: { id: req.params.id } });
  res.json({ message: 'Key deleted' });
}

async function reactivateKey(req, res) {
  const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key) return res.status(404).json({ error: 'API key not found' });
  // Only super_admin, or the institution's own admin, can reactivate a key
  if (req.user.role !== 'super_admin') {
    if (req.user.role !== 'admin' || key.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Insufficient permissions to reactivate this key' });
    }
  }
  await prisma.apiKey.update({ where: { id: req.params.id }, data: { isActive: true } });
  res.json({ message: 'Key reactivated' });
}

async function listSyncLogs(req, res) {
  const where = {};
  if (req.user.role !== 'super_admin' && req.user.role !== 'me_officer') {
    where.institutionId = req.user.institutionId;
  } else if (req.query.institutionId) {
    where.institutionId = req.query.institutionId;
  }
  if (req.query.apiKeyId) where.apiKeyId = req.query.apiKeyId;

  const logs = await prisma.apiSyncLog.findMany({
    where,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      apiKey: { select: { id: true, label: true, keyPrefix: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(req.query.limit || '100'),
  });
  res.json(logs);
}

async function syncStatus(req, res) {
  // Per-institution: last sync time, total submissions, success rate
  const institutions = await prisma.institution.findMany({
    where: { isActive: true, code: { not: 'MIT-HQ' } },
    select: { id: true, name: true, code: true },
  });

  const status = await Promise.all(institutions.map(async (inst) => {
    const [keyCount, lastLog, totalLogs, successLogs] = await Promise.all([
      prisma.apiKey.count({ where: { institutionId: inst.id, isActive: true } }),
      prisma.apiSyncLog.findFirst({ where: { institutionId: inst.id }, orderBy: { createdAt: 'desc' } }),
      prisma.apiSyncLog.count({ where: { institutionId: inst.id } }),
      prisma.apiSyncLog.count({ where: { institutionId: inst.id, statusCode: { lt: 400 } } }),
    ]);
    return {
      institution: inst,
      activeKeys: keyCount,
      lastSync: lastLog?.createdAt || null,
      totalRequests: totalLogs,
      successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : null,
    };
  }));

  res.json(status);
}

// Middleware: log API key submissions
async function logSyncAttempt({ apiKeyId, institutionId, endpoint, method, statusCode, recordCount, errorMessage, ipAddress }) {
  try {
    await prisma.apiSyncLog.create({
      data: { apiKeyId, institutionId, endpoint, method: method || 'POST', statusCode, recordCount: recordCount || 1, errorMessage, ipAddress },
    });
  } catch {} // Non-blocking
}

module.exports = { listKeys, generateKey, revokeKey, deleteKey, reactivateKey, listSyncLogs, syncStatus, logSyncAttempt };
