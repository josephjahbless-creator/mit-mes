/**
 * Email Reports Scheduler
 * Reads EmailSchedule records from DB and sets up node-cron jobs.
 * Call startScheduler() once after DB is ready.
 */
const cron    = require('node-cron');
const prisma  = require('../../config/db');
const { sendMail } = require('../../utils/mailer');

const APP_NAME = 'MIT M&E System';
const APP_URL  = () => process.env.APP_URL || 'https://localhost:5443';

// Active cron jobs map: scheduleId → cron.ScheduledTask
const activeJobs = new Map();

// ── Report generators ──────────────────────────────────────────────────────────
async function generateWeeklySummary(params = {}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, approved, submitted, rejected, draft] = await Promise.all([
    prisma.indicatorActual.count({ where: { submittedAt: { gte: since } } }),
    prisma.indicatorActual.count({ where: { submittedAt: { gte: since }, status: 'approved' } }),
    prisma.indicatorActual.count({ where: { submittedAt: { gte: since }, status: 'submitted' } }),
    prisma.indicatorActual.count({ where: { submittedAt: { gte: since }, status: 'rejected' } }),
    prisma.indicatorActual.count({ where: { submittedAt: { gte: since }, status: 'draft' } }),
  ]);
  const topIndicators = await prisma.indicator.findMany({
    where: { isActive: true }, take: 5,
    select: { name: true, code: true, unit: true },
  });
  return {
    title: 'Weekly Submission Summary',
    subtitle: `7-day period ending ${new Date().toLocaleDateString('en-GB')}`,
    stats: [
      { label: 'Total Submissions', value: total, color: '#1a3a5c' },
      { label: 'Approved',          value: approved,  color: '#15803d' },
      { label: 'Awaiting Review',   value: submitted, color: '#1d4ed8' },
      { label: 'Rejected',          value: rejected,  color: '#b91c1c' },
      { label: 'Draft',             value: draft,     color: '#6b7280' },
    ],
    body: `<p>Total of <strong>${total}</strong> submissions recorded in the last 7 days.</p>`,
  };
}

async function generateMonthlyPerformance(params = {}) {
  const fy     = params.fiscalYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const actuals = await prisma.indicatorActual.findMany({
    where: { fiscalYear: fy, status: 'approved' },
    include: { indicator: { select: { name: true, code: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 200,
  });

  const targets = await prisma.indicatorTarget.findMany({
    where: { fiscalYear: fy },
    select: { indicatorId: true, q1Target: true, q2Target: true, q3Target: true, q4Target: true },
  });
  const targetMap = {};
  targets.forEach(t => { targetMap[t.indicatorId] = t; });

  const rows = actuals.slice(0, 20).map(a => {
    const t     = targetMap[a.indicatorId];
    const tval  = t ? (t.q1Target || t.q2Target || t.q3Target || t.q4Target || 0) : 0;
    const pct   = tval > 0 ? Math.round((a.actualValue / tval) * 100) : null;
    return { name: a.indicator?.name || '—', actual: a.actualValue, target: tval, pct };
  });

  return {
    title:    'Monthly Performance Report',
    subtitle: `Fiscal Year ${fy}`,
    stats: [{ label: 'Approved Submissions', value: actuals.length, color: '#1a3a5c' }],
    tableRows: rows,
    body: `<p>Performance data for <strong>${rows.length}</strong> indicators in FY ${fy}.</p>`,
  };
}

async function generateIndicatorStatus(params = {}) {
  const [active, discontinued, under_revision, retired] = await Promise.all([
    prisma.indicator.count({ where: { indicatorStatus: 'active' } }),
    prisma.indicator.count({ where: { indicatorStatus: 'discontinued' } }),
    prisma.indicator.count({ where: { indicatorStatus: 'under_revision' } }),
    prisma.indicator.count({ where: { indicatorStatus: 'retired' } }),
  ]);
  return {
    title: 'Indicator Status Report',
    subtitle: `As of ${new Date().toLocaleDateString('en-GB')}`,
    stats: [
      { label: 'Active',          value: active,        color: '#15803d' },
      { label: 'Under Revision',  value: under_revision, color: '#d97706' },
      { label: 'Discontinued',    value: discontinued,  color: '#6b7280' },
      { label: 'Retired',         value: retired,       color: '#b91c1c' },
    ],
    body: `<p>Total of <strong>${active + discontinued + under_revision + retired}</strong> indicators in the system.</p>`,
  };
}

// ── HTML email builder ─────────────────────────────────────────────────────────
function buildReportHtml(data) {
  const statsHtml = data.stats.map(s => `
    <td style="text-align:center;padding:12px 16px;">
      <div style="font-size:28px;font-weight:900;color:${s.color};">${s.value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">${s.label}</div>
    </td>`).join('');

  const tableHtml = data.tableRows ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:16px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:8px;text-align:left;color:#374151;">Indicator</th>
        <th style="padding:8px;text-align:right;color:#374151;">Actual</th>
        <th style="padding:8px;text-align:right;color:#374151;">Target</th>
        <th style="padding:8px;text-align:right;color:#374151;">Achievement</th>
      </tr></thead>
      <tbody>${data.tableRows.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
          <td style="padding:8px;color:#374151;">${r.name}</td>
          <td style="padding:8px;text-align:right;color:#1a3a5c;font-weight:bold;">${r.actual ?? '—'}</td>
          <td style="padding:8px;text-align:right;color:#6b7280;">${r.target || '—'}</td>
          <td style="padding:8px;text-align:right;color:${r.pct >= 80 ? '#15803d' : r.pct >= 50 ? '#d97706' : '#b91c1c'};">
            ${r.pct != null ? r.pct + '%' : '—'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">
      <div style="background:#1a3a5c;padding:20px 28px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">Ministry of Industry &amp; Trade</h2>
        <p style="color:#90b4d4;margin:4px 0 0;font-size:13px;">${data.title}</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${data.subtitle}</p>
        <table style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <tr>${statsHtml}</tr>
        </table>
        ${data.body}
        ${tableHtml}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
          <a href="${APP_URL()}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:bold;">
            Open M&amp;E System →
          </a>
        </div>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
          This is an automated report from the MIT M&amp;E System.<br>
          To manage report schedules, visit the Email Reports section in Administration.
        </p>
      </div>
    </div>`;
}

// ── Schedule runner ────────────────────────────────────────────────────────────
async function runSchedule(schedule) {
  const generators = {
    weekly_summary:       generateWeeklySummary,
    monthly_performance:  generateMonthlyPerformance,
    indicator_status:     generateIndicatorStatus,
  };
  const gen = generators[schedule.reportType] || generateWeeklySummary;

  try {
    const data = await gen(schedule.params || {});
    const html = buildReportHtml(data);
    for (const email of schedule.recipients) {
      await sendMail({
        to:      email,
        subject: `${APP_NAME} — ${data.title}`,
        html,
        text:    `${data.title}\n${data.subtitle}\n${data.stats.map(s => `${s.label}: ${s.value}`).join('\n')}`,
      });
    }
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data:  { lastSentAt: new Date() },
    });
    console.log(`[EmailScheduler] Sent "${schedule.name}" to ${schedule.recipients.length} recipient(s)`);
  } catch (err) {
    console.error(`[EmailScheduler] Failed to run schedule "${schedule.name}":`, err.message);
  }
}

// ── Daily national insight generation (6 AM) ───────────────────────────────────
function scheduleNationalInsights() {
  const { generateNationalInsights } = require('../../services/insight.service');
  const { getCurrentFiscalYear }     = require('../../utils/fiscalYear');

  // Runs every day at 06:00 AM
  cron.schedule('0 6 * * *', async () => {
    try {
      const fy = getCurrentFiscalYear();
      // Determine current quarter based on month
      const m = new Date().getMonth() + 1; // 1-12
      const period = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
      await generateNationalInsights(fy, period);
    } catch (err) {
      console.error('[InsightScheduler] Daily national insights error:', err.message);
    }
  });
  console.log('[InsightScheduler] Daily national insight job registered (06:00 AM)');
}

// ── Refresh token cleanup ──────────────────────────────────────────────────────
// Runs daily at 03:00 AM — purges expired refresh tokens to prevent table bloat.
function scheduleTokenCleanup() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) {
        console.log(`[TokenCleanup] Purged ${count} expired refresh token(s)`);
      }
    } catch (err) {
      console.error('[TokenCleanup] Error:', err.message);
    }
  });
  console.log('[TokenCleanup] Daily token cleanup job registered (03:00 AM)');
}

// ── Daily strategic progress snapshot (02:00 AM) ───────────────────────────────
// Writes project_progress_snapshots + strategic_objective_progress rows so the
// flagship and project dashboards can show trends over time (Dira ya Taifa 2050).
function scheduleProgressSnapshot() {
  const { runSnapshot } = require('../../services/progressSnapshotService');
  cron.schedule('0 2 * * *', async () => {
    try {
      await runSnapshot();
    } catch (err) {
      console.error('[ProgressSnapshot] Daily snapshot error:', err.message);
    }
  });
  console.log('[ProgressSnapshot] Daily strategic progress snapshot registered (02:00 AM)');
}

// ── Start all active cron jobs ─────────────────────────────────────────────────
async function startScheduler() {
  try {
    const schedules = await prisma.emailSchedule.findMany({ where: { isActive: true } });
    for (const s of schedules) {
      mountJob(s);
    }
    console.log(`[EmailScheduler] Started ${schedules.length} schedule(s)`);
    scheduleNationalInsights();
    scheduleTokenCleanup();
    scheduleProgressSnapshot();
  } catch (err) {
    console.error('[EmailScheduler] Failed to start:', err.message);
  }
}

function mountJob(schedule) {
  if (activeJobs.has(schedule.id)) {
    activeJobs.get(schedule.id).destroy();
    activeJobs.delete(schedule.id);
  }
  try {
    const job = cron.schedule(schedule.cronExpr, () => runSchedule(schedule));
    activeJobs.set(schedule.id, job);
  } catch (e) {
    console.error(`[EmailScheduler] Invalid cron "${schedule.cronExpr}" for "${schedule.name}":`, e.message);
  }
}

function removeJob(id) {
  if (activeJobs.has(id)) {
    activeJobs.get(id).destroy();
    activeJobs.delete(id);
  }
}

module.exports = { startScheduler, mountJob, removeJob, runSchedule };
