const prisma = require('../config/db');

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'currentPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken', 'resetToken', 'passwordResetToken',
  'apiKey', 'secret', 'clientSecret', 'privateKey', 'passwordEncrypted',
  'twoFactorSecret', 'pin', 'cvv', 'ssn',
]);

function sanitizeBody(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return obj;
  if (Array.isArray(obj)) return obj.map(v => sanitizeBody(v, depth + 1));
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k) ? '[REDACTED]' : sanitizeBody(v, depth + 1),
    ])
  );
}

function audit(action, tableName) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 300 && req.user?.id) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            tableName,
            recordId: body?.data?.id || req.params.id || null,
            changes: req.body ? sanitizeBody(req.body) : null,
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit, sanitizeBody };
