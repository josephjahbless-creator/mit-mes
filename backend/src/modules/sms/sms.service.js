/**
 * SMS Service — Africa's Talking integration
 * Set AT_API_KEY and AT_USERNAME env vars to enable real SMS.
 * Falls back to console logging if not configured.
 */
const prisma = require('../../config/db');

function getClient() {
  const { AT_API_KEY, AT_USERNAME } = process.env;
  if (!AT_API_KEY || !AT_USERNAME) return null;
  try {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey: AT_API_KEY, username: AT_USERNAME });
    return at.SMS;
  } catch { return null; }
}

async function sendSms(to, message) {
  // Normalise Tanzanian number
  let number = String(to).replace(/\s+/g, '');
  if (number.startsWith('0')) number = '+255' + number.slice(1);
  if (!number.startsWith('+')) number = '+' + number;

  const client  = getClient();
  const logData = { to: number, message, status: 'queued', provider: 'africas_talking' };

  if (!client) {
    console.log(`\n📱 [SMS — console fallback]\n  To:      ${number}\n  Message: ${message}\n`);
    logData.status = 'sent';
    logData.messageId = 'console-' + Date.now();
    await prisma.smsLog.create({ data: logData }).catch(() => {});
    return { status: 'sent', messageId: logData.messageId };
  }

  try {
    const result = await client.send({ to: [number], message });
    const recipient = result.SMSMessageData?.Recipients?.[0];
    logData.status    = recipient?.status === 'Success' ? 'sent' : 'failed';
    logData.messageId = recipient?.messageId;
    logData.cost      = parseFloat(recipient?.cost?.replace(/[^\d.]/g, '') || '0') || null;
    if (logData.status === 'failed') logData.error = recipient?.status;
  } catch (err) {
    logData.status = 'failed';
    logData.error  = err.message;
  }

  await prisma.smsLog.create({ data: logData }).catch(() => {});
  return { status: logData.status, messageId: logData.messageId };
}

async function sendApprovalSms(phoneNumber, indicatorName, status) {
  if (!phoneNumber) return;
  const msg = status === 'approved'
    ? `MIT M&E: Your submission for "${indicatorName}" has been approved.`
    : `MIT M&E: Your submission for "${indicatorName}" needs attention. Please check the system.`;
  return sendSms(phoneNumber, msg);
}

async function sendDeadlineReminderSms(phoneNumber, name, period, deadline) {
  if (!phoneNumber) return;
  const msg = `MIT M&E: Reminder — ${name}, the deadline for ${period} data submission is ${deadline}. Please submit your data.`;
  return sendSms(phoneNumber, msg);
}

module.exports = { sendSms, sendApprovalSms, sendDeadlineReminderSms };
