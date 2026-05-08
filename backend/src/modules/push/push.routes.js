'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const push = require('../../services/push.service');

const router = express.Router();

// Public: get VAPID public key (browser needs this to subscribe)
router.get('/vapid-public-key', (req, res) => {
  const key = push.getPublicKey();
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

// Save / update a subscription
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    await push.saveSubscription(req.user.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Remove a subscription
router.post('/unsubscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) await push.removeSubscription(endpoint);
  res.json({ ok: true });
});

module.exports = router;
