const express = require('express');
const c = require('./helpdesk.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

const canAdmin = authorize('super_admin', 'me_officer', 'admin');

// Public — anyone can submit a ticket (no login required)
router.post('/tickets', c.createTicket);

// Authenticated routes
router.use(authenticate);

router.get('/tickets',          c.listTickets);
router.get('/tickets/stats',    canAdmin, c.ticketStats);
router.get('/tickets/:id',      c.getTicket);
router.patch('/tickets/:id',    c.updateTicket);
router.delete('/tickets/:id',   canAdmin, c.deleteTicket);

// Replies
router.get('/tickets/:id/replies',                     c.listReplies);
router.post('/tickets/:id/replies',                    c.addReply);
router.delete('/tickets/:id/replies/:replyId', canAdmin, c.deleteReply);

module.exports = router;
