const prisma = require('../config/db');

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
            changes: req.body || null,
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = audit;
