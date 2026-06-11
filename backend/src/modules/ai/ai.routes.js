/**
 * AI Analysis routes — local-LLM powered M&E analysis (Ollama).
 * All routes require authentication. Heavier generation is limited to
 * analyst/admin roles; status + chat are available to all signed-in users.
 */

const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./ai.controller');

router.use(authenticate);

// Health / availability of the local AI service
router.get('/status', ctrl.status);

// Enhanced insights & recommendations for a scope
router.post('/analyze',
  authorize('super_admin', 'admin', 'me_officer'),
  ctrl.analyze);

// Ask questions about live data in plain language
router.post('/chat', ctrl.chat);

// Executive summary for a period
router.post('/report-summary',
  authorize('super_admin', 'admin', 'me_officer'),
  ctrl.reportSummary);

// Explain an anomaly in a specific indicator
router.post('/explain-anomaly/:indicatorId',
  authorize('super_admin', 'admin', 'me_officer'),
  ctrl.explainAnomaly);

module.exports = router;
