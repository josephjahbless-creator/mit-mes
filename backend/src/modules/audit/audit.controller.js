const prisma = require('../../config/db');

async function list(req, res) {
  const { userId, tableName, action, startDate, endDate, page = 1, limit = 50 } = req.query;
  const where = {};
  if (userId)    where.userId    = userId;
  if (tableName) where.tableName = tableName;
  if (action)    where.action    = action;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate)   where.timestamp.lte = new Date(endDate);
  }
  // Admins scoped to their institution's users
  if (req.user.role === 'admin') {
    const institutionUsers = await prisma.user.findMany({
      where: { institutionId: req.user.institutionId },
      select: { id: true },
    });
    where.userId = { in: institutionUsers.map(u => u.id) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / take) });
}

async function stats(req, res) {
  const [byAction, byTable, recent] = await Promise.all([
    prisma.auditLog.groupBy({ by: ['action'],    _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.auditLog.groupBy({ by: ['tableName'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 10,
      include: { user: { select: { name: true, email: true } } } }),
  ]);
  res.json({ byAction, byTable, recent });
}

module.exports = { list, stats };
