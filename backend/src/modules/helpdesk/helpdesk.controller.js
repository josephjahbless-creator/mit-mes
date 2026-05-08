const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification, notifyRole } = require('../../utils/notifications');

// ── SLA targets (hours) per priority ─────────────────────────────────────────
const SLA_HOURS = { critical: 4, high: 8, medium: 24, low: 72 };

/**
 * Compute SLA status for a ticket.
 * Returns { deadlineAt, hoursRemaining, isBreached, slaLabel }
 */
function computeSla(ticket) {
  const hours   = SLA_HOURS[ticket.priority] || SLA_HOURS.medium;
  const created = new Date(ticket.createdAt);
  const deadlineAt = new Date(created.getTime() + hours * 60 * 60 * 1000);
  const now     = new Date();

  // If the ticket is resolved/closed use resolvedAt or closedAt as "now"
  const endTime = ticket.resolvedAt || ticket.closedAt || now;
  const msRemaining = deadlineAt.getTime() - endTime.getTime();
  const hoursRemaining = Math.round(msRemaining / 36e5 * 10) / 10;
  const isBreached  = msRemaining < 0;

  let slaLabel;
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    slaLabel = isBreached ? 'Resolved — SLA breached' : 'Resolved — within SLA';
  } else {
    slaLabel = isBreached
      ? `Breached by ${Math.abs(hoursRemaining)}h`
      : `${hoursRemaining}h remaining`;
  }

  return {
    slaTargetHours: hours,
    deadlineAt,
    hoursRemaining,
    isBreached,
    slaLabel,
  };
}

// ── Generate ticket number ────────────────────────────────────────────────────
async function nextTicketNo() {
  const count = await prisma.supportTicket.count();
  const year  = new Date().getFullYear();
  return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ── List tickets ──────────────────────────────────────────────────────────────
exports.listTickets = async (req, res) => {
  const user = req.user;
  const { status, priority, category, page = 1, limit = 20 } = req.query;

  // Admins see all; others see only their own
  const ownerFilter = ['super_admin', 'me_officer', 'admin'].includes(user.role)
    ? {}
    : { submittedById: user.id };

  const where = {
    ...ownerFilter,
    ...(status   ? { status }   : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo:  { select: { id: true, name: true, email: true } },
        _count:      { select: { replies: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.supportTicket.count({ where }),
  ]);

  const ticketsWithSla = tickets.map(t => ({ ...t, sla: computeSla(t) }));
  res.json({ tickets: ticketsWithSla, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

// ── Ticket stats (admin) ──────────────────────────────────────────────────────
exports.ticketStats = async (req, res) => {
  const [total, byStatus, byPriority, openTickets] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.groupBy({ by: ['status'],   _count: { id: true } }),
    prisma.supportTicket.groupBy({ by: ['priority'], _count: { id: true } }),
    prisma.supportTicket.findMany({
      where: { status: { in: ['open', 'in_progress'] } },
      select: { id: true, priority: true, createdAt: true, resolvedAt: true, closedAt: true, status: true },
    }),
  ]);

  const statusMap = {};
  byStatus.forEach(s => { statusMap[s.status] = s._count.id; });
  const priorityMap = {};
  byPriority.forEach(p => { priorityMap[p.priority] = p._count.id; });

  // SLA summary
  const slaBreached  = openTickets.filter(t => computeSla(t).isBreached).length;
  const slaAtRisk    = openTickets.filter(t => {
    const { hoursRemaining, isBreached } = computeSla(t);
    return !isBreached && hoursRemaining < 2;
  }).length;

  res.json({ total, byStatus: statusMap, byPriority: priorityMap, sla: { breached: slaBreached, atRisk: slaAtRisk, openCount: openTickets.length } });
};

// ── Get single ticket ─────────────────────────────────────────────────────────
exports.getTicket = async (req, res) => {
  const user   = req.user;
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      submittedBy: { select: { id: true, name: true, email: true, role: true } },
      assignedTo:  { select: { id: true, name: true, email: true } },
      replies: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Non-admins can only view their own tickets
  const isAdmin = ['super_admin', 'me_officer', 'admin'].includes(user.role);
  if (!isAdmin && ticket.submittedById !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ ...ticket, sla: computeSla(ticket) });
};

// ── Create ticket (public or authenticated) ───────────────────────────────────
exports.createTicket = async (req, res) => {
  const { subject, description, category, priority, guestName, guestEmail } = req.body;
  if (!subject)     return res.status(400).json({ error: 'subject is required' });
  if (!description) return res.status(400).json({ error: 'description is required' });

  // Public submission requires name + email
  if (!req.user && (!guestName?.trim() || !guestEmail?.trim())) {
    return res.status(400).json({ error: 'name and email are required for guest submissions' });
  }

  const ticketNo = await nextTicketNo();
  const ticket   = await prisma.supportTicket.create({
    data: {
      ticketNo,
      subject,
      description,
      category:      category || 'general',
      priority:      priority || 'medium',
      submittedById: req.user?.id  || null,
      guestName:     req.user ? null : guestName.trim(),
      guestEmail:    req.user ? null : guestEmail.trim().toLowerCase(),
      institutionId: req.user?.institutionId || null,
    },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify admins/me_officers of new ticket
  notifyRole({
    roles: ['super_admin', 'admin', 'me_officer'],
    type: 'helpdesk_new_ticket',
    title: `New support ticket: ${subject}`,
    message: `Ticket ${ticketNo} submitted — ${priority || 'medium'} priority.`,
    relatedType: 'SupportTicket',
    relatedId: ticket.id,
  }).catch(() => {});

  res.status(201).json(ticket);
};

// ── Update ticket (status, assignment, priority) ──────────────────────────────
exports.updateTicket = async (req, res) => {
  const user   = req.user;
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: req.params.id } });
  const isAdmin = ['super_admin', 'me_officer', 'admin'].includes(user.role);

  // Non-admins can only edit their own open tickets' subject/description
  if (!isAdmin && ticket.submittedById !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { subject, description, category, priority, status, assignedToId } = req.body;

  // Non-admins cannot change status or assignment
  const data = {
    ...(subject     !== undefined ? { subject }     : {}),
    ...(description !== undefined ? { description } : {}),
    ...(category    !== undefined ? { category }    : {}),
    ...(isAdmin && priority    !== undefined ? { priority }    : {}),
    ...(isAdmin && status      !== undefined ? { status }      : {}),
    ...(isAdmin && assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
  };

  // Set timestamps when status changes
  if (isAdmin && status === 'resolved' && ticket.status !== 'resolved') {
    data.resolvedAt = new Date();
  }
  if (isAdmin && status === 'closed' && ticket.status !== 'closed') {
    data.closedAt = new Date();
  }

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data,
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      assignedTo:  { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } },
    },
  });
  res.json(updated);
};

// ── Delete ticket ─────────────────────────────────────────────────────────────
exports.deleteTicket = async (req, res) => {
  await prisma.supportTicket.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

// ── List replies ──────────────────────────────────────────────────────────────
exports.listReplies = async (req, res) => {
  const user   = req.user;
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: req.params.id } });
  const isAdmin = ['super_admin', 'me_officer', 'admin'].includes(user.role);

  if (!isAdmin && ticket.submittedById !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const replies = await prisma.ticketReply.findMany({
    where: {
      ticketId: req.params.id,
      // Non-admins don't see internal notes
      ...(isAdmin ? {} : { isInternal: false }),
    },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(replies);
};

// ── Add reply ─────────────────────────────────────────────────────────────────
exports.addReply = async (req, res) => {
  const user   = req.user;
  const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: req.params.id } });
  const isAdmin = ['super_admin', 'me_officer', 'admin'].includes(user.role);

  if (!isAdmin && ticket.submittedById !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (ticket.status === 'closed') {
    return res.status(400).json({ error: 'Cannot reply to a closed ticket' });
  }

  const { message, isInternal } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const [reply] = await Promise.all([
    prisma.ticketReply.create({
      data: {
        ticketId:   req.params.id,
        userId:     user.id,
        message,
        isInternal: isAdmin && isInternal ? true : false,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
    // Auto-set ticket to in_progress when admin first replies
    isAdmin && ticket.status === 'open'
      ? prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: 'in_progress' } })
      : null,
  ]);

  // Notify ticket submitter (if logged-in user) of the new reply
  if (ticket.submittedById && ticket.submittedById !== user.id) {
    const isInternalReply = isAdmin && isInternal;
    if (!isInternalReply) {
      createNotification({
        userId: ticket.submittedById,
        type: 'helpdesk_reply',
        title: 'New reply on your support ticket',
        message: `Your ticket "${ticket.subject}" received a new reply from ${user.name}.`,
        relatedType: 'SupportTicket',
        relatedId: ticket.id,
      }).catch(() => {});
    }
  }

  res.status(201).json(reply);
};

// ── Delete reply ──────────────────────────────────────────────────────────────
exports.deleteReply = async (req, res) => {
  await prisma.ticketReply.delete({ where: { id: req.params.replyId } });
  res.status(204).end();
};
