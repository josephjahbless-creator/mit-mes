'use strict';
/**
 * Browser Push Notification Service
 * Uses VAPID keys + web-push to deliver real-time push notifications
 * even when the user does not have the app tab open.
 */

const webpush = require('web-push');
const prisma  = require('../config/db');

// Configure VAPID credentials once at module load
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      VAPID_EMAIL || 'mailto:admin@mit.go.tz',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  } catch (err) {
    console.warn('[push] Invalid VAPID keys — browser push disabled:', err.message);
  }
} else {
  console.warn('[push] VAPID keys not configured — browser push disabled');
}

/**
 * Get the public VAPID key (sent to the browser to create a subscription).
 */
function getPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

/**
 * Save a push subscription for a user.
 * If the same endpoint already exists, update it.
 */
async function saveSubscription(userId, subscription) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  return prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
}

/**
 * Remove a push subscription (user unsubscribed).
 */
async function removeSubscription(endpoint) {
  return prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {});
}

/**
 * Send a push notification to all subscriptions for a specific user.
 */
async function pushToUser(userId, payload) {
  if (!VAPID_PUBLIC_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  const message = JSON.stringify({
    title:   payload.title   || 'MIT M&E System',
    body:    payload.body    || payload.message || '',
    icon:    payload.icon    || '/pwa-192x192.png',
    badge:   payload.badge   || '/pwa-64x64.png',
    url:     payload.url     || '/',
    tag:     payload.tag     || 'mit-mes',
  });

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
        { TTL: 86400 },
      ).catch(async (err) => {
        // 410 Gone = subscription expired; remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      })
    )
  );
}

/**
 * Send a push to all subscribers with a given role.
 */
async function pushToRole(roles, payload) {
  if (!VAPID_PUBLIC_KEY) return;

  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
  await Promise.allSettled(users.map(u => pushToUser(u.id, payload)));
}

module.exports = { getPublicKey, saveSubscription, removeSubscription, pushToUser, pushToRole };
