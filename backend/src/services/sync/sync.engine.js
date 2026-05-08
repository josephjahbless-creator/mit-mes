'use strict';

/**
 * Central sync dispatcher — routes to the right sync service based on integration.system
 */

const prisma = require('../../config/db');
const { syncWorldBank } = require('./worldbank');
const { syncKoboToolbox } = require('./kobotoolbox');
const { pullFromDhis2, pushToDhis2 } = require('./dhis2');

async function runSync(integrationId) {
  const integration = await prisma.externalIntegration.findUnique({ where: { id: integrationId } });
  if (!integration) throw new Error('Integration not found');
  if (!integration.isEnabled) throw new Error('Integration is disabled');

  const log = await prisma.externalSyncLog.create({
    data: { integrationId, status: 'running', message: 'Sync started', startedAt: new Date() },
  });

  let result;
  try {
    switch (integration.system) {
      case 'worldbank':
        result = await syncWorldBank(integration);
        break;
      case 'kobotoolbox':
        result = await syncKoboToolbox(integration);
        break;
      case 'dhis2':
        result = await pullFromDhis2(integration);
        break;
      case 'dhis2_push':
        result = await pushToDhis2(integration);
        break;
      default:
        throw new Error(`Unknown integration system: ${integration.system}`);
    }

    await prisma.externalSyncLog.update({
      where: { id: log.id },
      data: {
        status: result.errors?.length ? 'partial' : 'success',
        message: result.errors?.length ? `Completed with ${result.errors.length} error(s)` : 'Sync completed successfully',
        recordsSynced: result.recordsSynced,
        errors: result.errors?.length ? result.errors : undefined,
        completedAt: new Date(),
      },
    });

    await prisma.externalIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: result.errors?.length ? 'partial' : 'success',
        lastSyncMessage: `${result.recordsSynced} records synced`,
        syncCount: { increment: 1 },
      },
    });

    return { success: true, recordsSynced: result.recordsSynced, errors: result.errors };
  } catch (err) {
    await prisma.externalSyncLog.update({
      where: { id: log.id },
      data: { status: 'failed', message: err.message, completedAt: new Date() },
    });
    await prisma.externalIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'failed', lastSyncMessage: err.message },
    });
    throw err;
  }
}

module.exports = { runSync };
