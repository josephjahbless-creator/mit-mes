'use strict';

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const c = require('./webhook.controller');

const router = express.Router();

// Public webhook endpoints (authenticated by source token in header, not JWT)
router.post('/kobotoolbox', c.koboWebhook);
router.post('/odk',         c.odkWebhook);

// Authenticated endpoints
router.post('/integrations/:id/sync', authenticate, authorize('super_admin', 'admin'), c.triggerSync);
router.get('/integrations/:id/logs',  authenticate, c.syncLogs);

module.exports = router;
