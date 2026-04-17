const express    = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl       = require('./notifications.controller');

const router = express.Router();

// Order matters: /read-all and /unread-count must come before /:id routes
router.get('/',             authenticate, ctrl.list);
router.get('/unread-count', authenticate, ctrl.unreadCount);
router.patch('/read-all',   authenticate, ctrl.markAllRead);
router.patch('/:id/read',   authenticate, ctrl.markRead);
router.delete('/:id',       authenticate, ctrl.remove);

module.exports = router;
