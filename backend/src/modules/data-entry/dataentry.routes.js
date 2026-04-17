const express = require('express');
const controller = require('./dataentry.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/actuals', controller.listActuals);
router.get('/actuals/:id', controller.getActual);
router.get('/actuals/:id/calculated', controller.getCalculated);
router.get('/tracking', controller.submissionTracking);
router.get('/departments', controller.listDepartments);

router.post('/actuals', authorize('super_admin', 'me_officer', 'admin', 'data_collector'), controller.submitActual);
router.patch('/actuals/:id', authorize('super_admin', 'me_officer', 'admin', 'data_collector'), controller.updateActual);

// ── 4-stage approval workflow ─────────────────────────────────────────────────
router.patch('/actuals/:id/supervisor-review', authorize('admin', 'me_officer', 'super_admin'), controller.supervisorReview);
router.patch('/actuals/:id/me-review',         authorize('me_officer', 'super_admin'),          controller.meReview);

// ── Legacy direct approve/reject (backwards compatibility) ────────────────────
router.patch('/actuals/:id/approve', authorize('super_admin', 'me_officer', 'admin'), controller.approveActual);
router.patch('/actuals/:id/reject',  authorize('super_admin', 'me_officer', 'admin'), controller.rejectActual);

// ── Submission comments ───────────────────────────────────────────────────────
router.get('/actuals/:id/comments',  controller.getComments);
router.post('/actuals/:id/comments', controller.addComment);

module.exports = router;
