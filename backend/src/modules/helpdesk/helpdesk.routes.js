const express    = require('express');
const rateLimit  = require('express-rate-limit');
const c          = require('./helpdesk.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

const canAdmin = authorize('super_admin', 'me_officer', 'admin');

// Throttle the public ticket endpoint: 5 tickets per IP per 15 minutes
const ticketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  // Disable X-Forwarded-For validation — server is not behind a proxy,
  // so we use the real socket IP directly. Without this, express-rate-limit
  // throws a ValidationError when any client sends X-Forwarded-For, which
  // crashes the Node process.
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many support tickets submitted. Please wait before submitting again.' },
});

// Public — anyone can submit a ticket (no login required), rate-limited
router.post('/tickets', ticketLimiter, c.createTicket);

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
