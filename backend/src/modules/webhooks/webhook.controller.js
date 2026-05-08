'use strict';

const prisma = require('../../config/db');
const { handleWebhookPayload } = require('../../services/sync/kobotoolbox');
const { emitGlobal } = require('../../lib/socket');

async function koboWebhook(req, res) {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'Empty payload' });

  // Look up KoBoToolbox integration for syncConfig field mappings
  const integration = await prisma.externalIntegration.findFirst({
    where: { system: 'kobotoolbox', isEnabled: true },
  });

  try {
    const result = await handleWebhookPayload(payload, integration?.syncConfig);
    if (!result.ok) return res.status(422).json({ error: result.reason });

    // Broadcast real-time event so dashboards update
    emitGlobal('data:webhook_received', { source: 'kobotoolbox', timestamp: new Date() });
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ODK / OpenRosa submission receiver
async function odkWebhook(req, res) {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'Empty payload' });

  // ODK submissions come as XML or JSON depending on config.
  // For simplicity we expect JSON with the same field names as our KoBoToolbox mapper.
  const integration = await prisma.externalIntegration.findFirst({
    where: { system: 'odk', isEnabled: true },
  });

  try {
    const result = await handleWebhookPayload(payload, integration?.syncConfig);
    if (!result.ok) return res.status(422).json({ error: result.reason });
    emitGlobal('data:webhook_received', { source: 'odk', timestamp: new Date() });
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Manual sync trigger (called from the integrations UI)
async function triggerSync(req, res) {
  const { id } = req.params;
  const { runSync } = require('../../services/sync/sync.engine');
  try {
    const result = await runSync(id);
    emitGlobal('integration:synced', { integrationId: id, result });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get sync logs for an integration
async function syncLogs(req, res) {
  const { id } = req.params;
  const logs = await prisma.externalSyncLog.findMany({
    where: { integrationId: id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json(logs);
}

module.exports = { koboWebhook, odkWebhook, triggerSync, syncLogs };
