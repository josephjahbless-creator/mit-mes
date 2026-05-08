const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./insights.controller');

// All routes require authentication
router.use(authenticate);

// List insights (with filters)
router.get('/', ctrl.listInsights);

// Insights for a specific submission
router.get('/submission/:actualId', ctrl.getSubmissionInsights);

// Insights for an indicator
router.get('/indicator/:indicatorId', ctrl.getIndicatorInsights);

// Mark as read
router.patch('/mark-read', ctrl.markRead);

// Dismiss an insight
router.patch('/:id/dismiss', ctrl.dismissInsight);

// Manually trigger national insights (admin only)
router.post('/trigger-national',
  authorize('super_admin', 'admin', 'me_officer'),
  ctrl.triggerNational
);

module.exports = router;
