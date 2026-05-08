const prisma = require('../../config/db');
const { generateNationalInsights, getIndicatorTrendSummary } = require('../../services/insight.service');

// ── List insights (dashboard / national) ──────────────────────────────────────
async function listInsights(req, res) {
  try {
    const { scope, fiscalYear, period, indicatorId, institutionId, limit = 20, dismissed = 'false' } = req.query;

    const where = { isDismissed: dismissed === 'true' };
    if (scope)         where.scope         = scope;
    if (fiscalYear)    where.fiscalYear    = fiscalYear;
    if (period)        where.period        = period;
    if (indicatorId)   where.indicatorId   = indicatorId;
    if (institutionId) where.institutionId = institutionId;

    // Non-super_admin sees only their own institution's + national insights
    const { user } = req;
    if (!['super_admin', 'admin', 'me_officer'].includes(user.role) && user.institutionId) {
      where.OR = [
        { scope: 'national' },
        { institutionId: user.institutionId },
        { scope: 'submission', institutionId: user.institutionId },
      ];
    }

    const insights = await prisma.systemInsight.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { generatedAt: 'desc' },
      ],
      take: Number(limit),
      include: {
        indicator: { select: { id: true, name: true, unit: true } },
        institution: { select: { id: true, name: true } },
      },
    });

    res.json({ data: insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load insights' });
  }
}

// ── Insights for a specific submission ────────────────────────────────────────
async function getSubmissionInsights(req, res) {
  try {
    const { actualId } = req.params;
    const insights = await prisma.systemInsight.findMany({
      where: { actualId, isDismissed: false },
      orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
    });
    res.json({ data: insights });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load submission insights' });
  }
}

// ── Insights for an indicator ─────────────────────────────────────────────────
async function getIndicatorInsights(req, res) {
  try {
    const { indicatorId } = req.params;
    const { fiscalYear } = req.query;

    const where = { indicatorId, isDismissed: false };
    if (fiscalYear) where.fiscalYear = fiscalYear;

    const [insights, trendSummary] = await Promise.all([
      prisma.systemInsight.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { generatedAt: 'desc' }],
        take: 10,
      }),
      fiscalYear ? getIndicatorTrendSummary(indicatorId, fiscalYear) : null,
    ]);

    res.json({ data: insights, trendSummary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load indicator insights' });
  }
}

// ── Mark as read ──────────────────────────────────────────────────────────────
async function markRead(req, res) {
  try {
    const { ids } = req.body; // array of ids
    if (!ids?.length) return res.json({ count: 0 });
    const result = await prisma.systemInsight.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark insights as read' });
  }
}

// ── Dismiss ───────────────────────────────────────────────────────────────────
async function dismissInsight(req, res) {
  try {
    const { id } = req.params;
    await prisma.systemInsight.update({ where: { id }, data: { isDismissed: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss insight' });
  }
}

// ── Manually trigger national insight generation (admin) ──────────────────────
async function triggerNational(req, res) {
  try {
    const { fiscalYear, period } = req.body;
    if (!fiscalYear || !period) return res.status(400).json({ error: 'fiscalYear and period required' });
    await generateNationalInsights(fiscalYear, period);
    res.json({ success: true, message: `National insights generated for ${period} ${fiscalYear}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate national insights' });
  }
}

module.exports = {
  listInsights,
  getSubmissionInsights,
  getIndicatorInsights,
  markRead,
  dismissInsight,
  triggerNational,
};
