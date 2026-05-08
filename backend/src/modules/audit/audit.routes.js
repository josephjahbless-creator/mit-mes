const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const c = require('./audit.controller');

router.get('/', authenticate, authorize('super_admin', 'admin'), c.list);
router.get('/stats', authenticate, authorize('super_admin', 'admin'), c.stats);

module.exports = router;
