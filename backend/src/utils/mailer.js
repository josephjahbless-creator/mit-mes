/**
 * Mailer utility — wraps nodemailer with environment-driven config.
 *
 * Required .env variables:
 *   SMTP_HOST     e.g. smtp.gmail.com
 *   SMTP_PORT     e.g. 587
 *   SMTP_SECURE   "true" for port 465, "false" for STARTTLS
 *   SMTP_USER     sender email address
 *   SMTP_PASS     sender email password / app-password
 *   APP_URL       public URL of the app  e.g. https://mes.mit.go.tz
 */
const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP not configured — emails will be logged to console only');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || `"MIT M&E System" <${process.env.SMTP_USER || 'noreply@mit.go.tz'}>`;

  if (!transport) {
    // Fallback: log to console when SMTP is not configured
    console.log(`\n📧 [MAIL — console fallback]\n  To:      ${to}\n  Subject: ${subject}\n  Body:    ${text || (html || '').replace(/<[^>]+>/g, ' ').substring(0, 200)}\n`);
    return;
  }
  await transport.sendMail({ from, to, subject, html, text });
}

/**
 * Send a password-reset email containing a one-time token link.
 */
async function sendPasswordResetEmail(email, name, token) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const link = `${appUrl}/reset-password?token=${token}`;

  await sendMail({
    to: email,
    subject: 'Password Reset — MIT M&E System',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#1a3a5c;padding:20px 28px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Ministry of Industry & Trade</h2>
          <p style="color:#90b4d4;margin:4px 0 0;font-size:13px;">M&amp;E System — Password Reset</p>
        </div>
        <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#374151;">A password reset was requested for your account. Click the button below to set a new password:</p>
          <a href="${link}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:14px;">Reset My Password</a>
          <p style="margin:20px 0 0;font-size:12px;color:#6b7280;">This link expires in <strong>1 hour</strong>. If you did not request a reset, please ignore this email.</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">If the button does not work, copy and paste this URL:<br>
            <a href="${link}" style="color:#1a3a5c;word-break:break-all;">${link}</a>
          </p>
        </div>
      </div>
    `,
    text: `Hello ${name},\n\nReset your password here: ${link}\n\nThis link expires in 1 hour.\n\nIf you did not request a reset, ignore this email.`,
  });
}

/**
 * Send account-locked notification.
 */
async function sendAccountLockedEmail(email, name, unlockAt) {
  await sendMail({
    to: email,
    subject: 'Account Temporarily Locked — MIT M&E System',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#1a3a5c;padding:20px 28px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Ministry of Industry & Trade</h2>
          <p style="color:#90b4d4;margin:4px 0 0;font-size:13px;">M&amp;E System — Security Alert</p>
        </div>
        <div style="background:#fff8f0;padding:28px;border:1px solid #fde68a;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color:#374151;">Your account has been <strong>temporarily locked</strong> due to 5 consecutive failed login attempts.</p>
          <p style="color:#374151;">Your account will automatically unlock at: <strong>${new Date(unlockAt).toLocaleString()}</strong></p>
          <p style="font-size:12px;color:#6b7280;margin-top:20px;">If this was not you, please contact your system administrator immediately.</p>
        </div>
      </div>
    `,
    text: `Hello ${name},\n\nYour account has been temporarily locked due to 5 failed login attempts.\nIt will unlock at: ${new Date(unlockAt).toLocaleString()}\n\nIf this was not you, contact your administrator.`,
  });
}

// ── Submission notification — sent to M&E officers/admins ─────────────────────
async function sendSubmissionNotification(email, name, { indicatorName, period, fiscalYear, actualValue, submittedBy }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  await sendMail({
    to: email,
    subject: `MIT M&E — New Submission Awaiting Review`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#1a3a5c;padding:20px 28px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Ministry of Industry & Trade</h2>
          <p style="color:#90b4d4;margin:4px 0 0;font-size:13px;">M&amp;E System — New Submission</p>
        </div>
        <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color:#374151;">A new activity report has been submitted and requires your review:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
            <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;color:#374151;width:40%">Indicator</td><td style="padding:8px 12px;color:#6b7280;">${indicatorName || '—'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#374151;">Period</td><td style="padding:8px 12px;color:#6b7280;">${period || '—'} · FY ${fiscalYear || '—'}</td></tr>
            <tr style="background:#f3f4f6;"><td style="padding:8px 12px;font-weight:bold;color:#374151;">Value Submitted</td><td style="padding:8px 12px;color:#1a3a5c;font-weight:bold;">${actualValue ?? '—'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#374151;">Submitted by</td><td style="padding:8px 12px;color:#6b7280;">${submittedBy || '—'}</td></tr>
          </table>
          <a href="${appUrl}/data-entry/approval-queue" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:11px 24px;border-radius:6px;font-weight:bold;font-size:13px;">
            Review in Approval Queue →
          </a>
          <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;">Ministry of Industry and Trade · M&amp;E System</p>
        </div>
      </div>
    `,
    text: `Hello ${name},\n\nNew submission for ${indicatorName} (${period} FY ${fiscalYear}) by ${submittedBy}.\nValue: ${actualValue}\n\nReview at: ${appUrl}/data-entry/approval-queue`,
  });
}

// ── Approval/rejection notification — sent to data submitter ──────────────────
async function sendApprovalNotification(email, name, { indicatorName, period, fiscalYear, status, remarks }) {
  const appUrl     = process.env.APP_URL || 'http://localhost:5173';
  const isApproved = status === 'approved';
  const headerColor = isApproved ? '#15803d' : '#b91c1c';
  const statusLabel = isApproved ? 'Approved ✓' : 'Returned for Correction';

  await sendMail({
    to: email,
    subject: `MIT M&E — Your Submission ${isApproved ? 'Approved' : 'Needs Attention'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:${headerColor};padding:20px 28px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Submission ${statusLabel}</h2>
          <p style="color:${isApproved ? '#bbf7d0' : '#fecaca'};margin:4px 0 0;font-size:13px;">MIT M&amp;E System Notification</p>
        </div>
        <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color:#374151;">
            Your submission for <strong>${indicatorName}</strong> (${period} · FY ${fiscalYear}) has been
            <strong style="color:${headerColor}">${status}</strong>.
          </p>
          ${remarks ? `
          <div style="background:${isApproved ? '#f0fdf4' : '#fef2f2'};border-left:4px solid ${headerColor};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
            <p style="margin:0;color:#374151;font-size:13px;"><strong>Reviewer's note:</strong> ${remarks}</p>
          </div>` : ''}
          <a href="${appUrl}/data-entry" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:11px 24px;border-radius:6px;font-weight:bold;font-size:13px;margin-top:8px;">
            View My Submissions →
          </a>
          <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;">Ministry of Industry and Trade · M&amp;E System</p>
        </div>
      </div>
    `,
    text: `Hello ${name},\n\nYour submission for ${indicatorName} (${period} FY ${fiscalYear}) is ${status}.\n${remarks ? `Note: ${remarks}` : ''}\n\nView at: ${appUrl}/data-entry`,
  });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
  sendSubmissionNotification,
  sendApprovalNotification,
};
