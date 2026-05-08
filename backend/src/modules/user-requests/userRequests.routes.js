const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const controller = require('./userRequests.controller');

const router = express.Router();

// Admin routes — all require auth + admin role
router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/',              controller.listRequests);
router.get('/count',         controller.pendingCount);
router.post('/:id/approve',  controller.approveRequest);
router.post('/:id/reject',   controller.rejectRequest);

module.exports = router;
