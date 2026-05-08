const prisma = require('../config/db');

/**
 * Create an in-app notification for a user AND send a browser push if subscribed.
 * Fire-and-forget safe — catches all errors silently.
 */
async function createNotification({ userId, type, title, message, relatedType, relatedId, url }) {
  if (!userId) return null;
  try {
    const note = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedType: relatedType || null,
        relatedId:   relatedId   || null,
      },
    });

    // Also send browser push (non-blocking)
    try {
      const push = require('../services/push.service');
      push.pushToUser(userId, { title, body: message, url: url || '/' }).catch(() => {});
    } catch {}

    return note;
  } catch {
    return null;
  }
}

/**
 * Notify all users with a given role (in-app + push).
 */
async function notifyRole({ roles, type, title, message, relatedType, relatedId, url }) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    await Promise.all(users.map(u =>
      createNotification({ userId: u.id, type, title, message, relatedType, relatedId, url })
    ));
  } catch {}
}

module.exports = { createNotification, notifyRole };
