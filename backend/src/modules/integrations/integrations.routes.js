const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const c = require('./integrations.controller');

const router = express.Router();
router.use(authenticate);

// Key management — admin+ only
router.get('/keys',                    authorize('super_admin', 'me_officer', 'admin'), c.listKeys);
router.post('/keys',                   authorize('super_admin', 'me_officer', 'admin'), c.generateKey);
router.patch('/keys/:id/revoke',       authorize('super_admin', 'me_officer', 'admin'), c.revokeKey);
router.patch('/keys/:id/reactivate',   authorize('super_admin', 'me_officer', 'admin'), c.reactivateKey);
router.delete('/keys/:id',             authorize('super_admin', 'me_officer', 'admin'), c.deleteKey);

// Sync logs + status
router.get('/logs',    authorize('super_admin', 'me_officer', 'admin'), c.listSyncLogs);
router.get('/status',  authorize('super_admin', 'me_officer', 'admin'), c.syncStatus);

module.exports = router;
