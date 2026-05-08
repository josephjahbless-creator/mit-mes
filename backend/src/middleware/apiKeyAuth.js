'use strict';

const crypto = require('crypto');
const prisma = require('../config/db');

/**
 * Validates X-API-Key header against the api_keys table.
 * Attaches req.apiKey and req.institution for downstream use.
 * Can be used standalone (for public API access) or alongside JWT auth.
 */
async function apiKeyAuth(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) return res.status(401).json({ error: 'API key required (X-API-Key header)' });

  // Keys are stored as SHA-256 hash; prefix is the first 8 chars (plain)
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { institution: { select: { id: true, name: true, code: true } } },
  });

  if (!key) return res.status(401).json({ error: 'Invalid API key' });
  if (!key.isActive) return res.status(403).json({ error: 'API key is revoked' });
  if (key.expiresAt && key.expiresAt < new Date()) return res.status(403).json({ error: 'API key has expired' });

  // Update last used
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  // Log usage
  await prisma.apiSyncLog.create({
    data: {
      apiKeyId:      key.id,
      institutionId: key.institutionId,
      endpoint:      req.path,
      method:        req.method,
      statusCode:    200, // will be updated by response interceptor if needed
      ipAddress:     req.ip,
    },
  }).catch(() => {}); // non-blocking

  req.apiKey      = key;
  req.institution = key.institution;
  next();
}

module.exports = { apiKeyAuth };
