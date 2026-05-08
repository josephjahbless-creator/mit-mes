const express = require('express');
const prisma   = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');
const { sendSms } = require('./sms.service');

const router = express.Router();
router.use(authenticate);

// GET /sms/config
router.get('/config', (req, res) => {
  res.json({
    configured: !!(process.env.AT_API_KEY && process.env.AT_USERNAME),
    username:   process.env.AT_USERNAME || null,
  });
});

// GET /sms/logs
router.get('/logs', authorize('super_admin', 'admin'), async (req, res) => {
  const page  = parseInt(req.query.page  || '1');
  const limit = parseInt(req.query.limit || '50');
  const [total, logs] = await Promise.all([
    prisma.smsLog.count(),
    prisma.smsLog.findMany({
      orderBy: { sentAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);
  res.json({ total, page, limit, logs });
});

// POST /sms/send  — manual send (super_admin only)
router.post('/send', authorize('super_admin'), async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  const result = await sendSms(to, message);
  res.json(result);
});

module.exports = router;
