const prisma = require('../../config/db');

// GET /api/notifications?page=1&limit=20&unreadOnly=true
async function list(req, res) {
  const page       = Math.max(1, parseInt(req.query.page)  || 1);
  const limit      = Math.min(100, parseInt(req.query.limit) || 20);
  const unreadOnly = req.query.unreadOnly === 'true';
  const skip       = (page - 1) * limit;

  const where = { userId: req.user.id };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  res.json({ notifications, total, unreadCount, page, limit });
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  if (notification.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data:  { isRead: true },
  });
  res.json(updated);
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data:  { isRead: true },
  });
  res.json({ updated: count });
}

// DELETE /api/notifications/:id
async function remove(req, res) {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  if (notification.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.notification.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// GET /api/notifications/unread-count
async function unreadCount(req, res) {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json({ count });
}

// Utility — not a route handler; call from other modules
async function createNotification({ userId, type, title, message, relatedType, relatedId }) {
  return prisma.notification.create({
    data: { userId, type, title, message, relatedType, relatedId },
  });
}

module.exports = { list, markRead, markAllRead, remove, unreadCount, createNotification };
