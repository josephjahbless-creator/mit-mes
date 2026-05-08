const express = require('express');
const prisma   = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');
const { mountJob, removeJob, runSchedule } = require('./emailreports.scheduler');

const router = express.Router();
router.use(authenticate, authorize('super_admin', 'admin'));

const VALID_REPORT_TYPES = ['weekly_summary', 'monthly_performance', 'indicator_status'];

// GET /email-reports
router.get('/', async (req, res) => {
  const schedules = await prisma.emailSchedule.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(schedules);
});

// POST /email-reports
router.post('/', async (req, res) => {
  const { name, recipients, reportType, cronExpr, params, isActive } = req.body;
  if (!name || !recipients?.length || !reportType || !cronExpr) {
    return res.status(400).json({ error: 'name, recipients, reportType, and cronExpr are required' });
  }
  if (!VALID_REPORT_TYPES.includes(reportType)) {
    return res.status(400).json({ error: `reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}` });
  }
  const schedule = await prisma.emailSchedule.create({
    data: { name, recipients, reportType, cronExpr, params: params || null, isActive: isActive !== false },
  });
  if (schedule.isActive) mountJob(schedule);
  res.status(201).json(schedule);
});

// PATCH /email-reports/:id
router.patch('/:id', async (req, res) => {
  const { name, recipients, reportType, cronExpr, params, isActive } = req.body;
  const schedule = await prisma.emailSchedule.update({
    where: { id: req.params.id },
    data: {
      ...(name       != null ? { name }       : {}),
      ...(recipients != null ? { recipients } : {}),
      ...(reportType != null ? { reportType } : {}),
      ...(cronExpr   != null ? { cronExpr }   : {}),
      ...(params     != null ? { params }     : {}),
      ...(isActive   != null ? { isActive }   : {}),
    },
  });
  if (schedule.isActive) mountJob(schedule); else removeJob(schedule.id);
  res.json(schedule);
});

// DELETE /email-reports/:id
router.delete('/:id', async (req, res) => {
  removeJob(req.params.id);
  await prisma.emailSchedule.delete({ where: { id: req.params.id } });
  res.json({ message: 'Schedule deleted' });
});

// POST /email-reports/:id/trigger — send now
router.post('/:id/trigger', async (req, res) => {
  const schedule = await prisma.emailSchedule.findUnique({ where: { id: req.params.id } });
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  await runSchedule(schedule);
  res.json({ message: 'Report sent' });
});

module.exports = router;
