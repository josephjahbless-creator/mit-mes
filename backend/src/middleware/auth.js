const { verifyAccess } = require('../config/jwt');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateApiKey(apiKey, req, res, next);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = verifyAccess(authHeader.split(' ')[1]);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function authenticateApiKey(rawKey, req, res, next) {
  if (!rawKey || rawKey.length < 12) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const prefix = rawKey.substring(0, 12);

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyPrefix: prefix, isActive: true },
    include: { institution: { select: { id: true, isActive: true } } },
  });

  if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
  if (!apiKey.institution?.isActive) return res.status(401).json({ error: 'Institution is inactive' });
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return res.status(401).json({ error: 'API key has expired' });

  const valid = await bcrypt.compare(rawKey, apiKey.keyHash);
  if (!valid) return res.status(401).json({ error: 'Invalid API key' });

  // Update lastUsedAt without blocking the request
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  req.user = { id: apiKey.id, role: 'data_collector', institutionId: apiKey.institutionId, apiKeyAuth: true, apiKeyId: apiKey.id };
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function scopeToInstitution(req, res, next) {
  if (req.user.role !== 'super_admin' && req.user.role !== 'me_officer') {
    req.institutionId = req.user.institutionId;
  }
  next();
}

module.exports = { authenticate, authorize, scopeToInstitution };
