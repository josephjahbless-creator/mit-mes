const express = require('express');
const axios   = require('axios');
const prisma  = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('super_admin', 'admin'));

const VALID_SYSTEMS = ['dhis2', 'kobotoolbox', 'planrep', 'ifms'];

// ── Helper: upsert ExternalIntegration ────────────────────────────────────────
async function getOrCreate(system) {
  const DISPLAY = { dhis2: 'DHIS2', kobotoolbox: 'KoboToolbox', planrep: 'PLANREP', ifms: 'IFMS' };
  return prisma.externalIntegration.upsert({
    where:  { system },
    create: { system, displayName: DISPLAY[system] || system },
    update: {},
  });
}

// ── Log helper ─────────────────────────────────────────────────────────────────
async function logSync(integrationId, status, message, recordsSynced = 0, errors = null) {
  await prisma.externalSyncLog.create({
    data: { integrationId, status, message, recordsSynced, errors, completedAt: new Date() },
  });
  await prisma.externalIntegration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date(), lastSyncStatus: status, lastSyncMessage: message,
      syncCount: { increment: 1 },
    },
  });
}

// GET /external-integrations
router.get('/', async (req, res) => {
  const integrations = await Promise.all(
    VALID_SYSTEMS.map(s => getOrCreate(s))
  );
  res.json(integrations);
});

// GET /external-integrations/:system
router.get('/:system', async (req, res) => {
  if (!VALID_SYSTEMS.includes(req.params.system)) {
    return res.status(400).json({ error: 'Unknown system' });
  }
  const integration = await getOrCreate(req.params.system);
  // Mask credentials
  const safe = { ...integration, passwordEncrypted: integration.passwordEncrypted ? '••••••' : null, clientSecret: integration.clientSecret ? '••••••' : null };
  res.json(safe);
});

// PUT /external-integrations/:system — configure
router.put('/:system', async (req, res) => {
  if (!VALID_SYSTEMS.includes(req.params.system)) {
    return res.status(400).json({ error: 'Unknown system' });
  }
  const { baseUrl, apiKey, username, passwordEncrypted, clientId, clientSecret, syncConfig, isEnabled } = req.body;
  const integration = await prisma.externalIntegration.upsert({
    where: { system: req.params.system },
    create: {
      system: req.params.system,
      displayName: req.params.system.toUpperCase(),
      baseUrl, apiKey, username, passwordEncrypted, clientId, clientSecret,
      syncConfig: syncConfig || null, isEnabled: isEnabled || false,
    },
    update: {
      ...(baseUrl            !== undefined ? { baseUrl }            : {}),
      ...(apiKey             !== undefined ? { apiKey }             : {}),
      ...(username           !== undefined ? { username }           : {}),
      ...(passwordEncrypted  !== undefined ? { passwordEncrypted }  : {}),
      ...(clientId           !== undefined ? { clientId }           : {}),
      ...(clientSecret       !== undefined ? { clientSecret }       : {}),
      ...(syncConfig         !== undefined ? { syncConfig }         : {}),
      ...(isEnabled          !== undefined ? { isEnabled }          : {}),
    },
  });
  res.json({ ...integration, passwordEncrypted: integration.passwordEncrypted ? '••••••' : null });
});

// POST /external-integrations/:system/test — test connection
router.post('/:system/test', async (req, res) => {
  const system = req.params.system;
  if (!VALID_SYSTEMS.includes(system)) return res.status(400).json({ error: 'Unknown system' });

  const cfg = await getOrCreate(system);
  if (!cfg.baseUrl) return res.status(400).json({ success: false, error: 'No base URL configured' });

  const testUrls = {
    dhis2:       `${cfg.baseUrl}/api/me`,
    kobotoolbox: `${cfg.baseUrl}/api/v2/assets/?format=json`,
    planrep:     `${cfg.baseUrl}/api/health`,
    ifms:        `${cfg.baseUrl}/api/ping`,
  };

  try {
    const url  = testUrls[system] || `${cfg.baseUrl}/api/health`;
    const auth = cfg.username && cfg.passwordEncrypted
      ? { username: cfg.username, password: cfg.passwordEncrypted }
      : undefined;
    const headers = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};
    const resp = await axios.get(url, { auth, headers, timeout: 8000 });
    res.json({ success: true, statusCode: resp.status, message: 'Connection successful' });
  } catch (err) {
    res.json({ success: false, statusCode: err.response?.status, error: err.message });
  }
});

// POST /external-integrations/:system/sync — trigger sync
router.post('/:system/sync', async (req, res) => {
  const system = req.params.system;
  if (!VALID_SYSTEMS.includes(system)) return res.status(400).json({ error: 'Unknown system' });

  const cfg = await getOrCreate(system);
  if (!cfg.isEnabled) return res.status(400).json({ error: 'Integration is not enabled' });
  if (!cfg.baseUrl)   return res.status(400).json({ error: 'No base URL configured' });

  // Respond immediately — sync runs in background
  res.json({ message: `${system} sync started`, syncId: cfg.id });

  // Background sync
  setImmediate(async () => {
    try {
      let recordsSynced = 0;
      const errors = [];

      if (system === 'dhis2') {
        recordsSynced = await syncDhis2(cfg, errors);
      } else if (system === 'kobotoolbox') {
        recordsSynced = await syncKoboToolbox(cfg, errors);
      } else if (system === 'planrep') {
        recordsSynced = await syncPlanrep(cfg, errors);
      } else if (system === 'ifms') {
        recordsSynced = await syncIfms(cfg, errors);
      }

      const status = errors.length > 0 && recordsSynced === 0 ? 'failed'
                   : errors.length > 0 ? 'partial' : 'success';
      await logSync(cfg.id, status, `Synced ${recordsSynced} records${errors.length ? `, ${errors.length} errors` : ''}`, recordsSynced, errors.length ? errors : null);
    } catch (err) {
      await logSync(cfg.id, 'failed', err.message, 0, [err.message]).catch(() => {});
    }
  });
});

// GET /external-integrations/:system/logs
router.get('/:system/logs', async (req, res) => {
  const system = req.params.system;
  const cfg = await prisma.externalIntegration.findUnique({ where: { system } });
  if (!cfg) return res.json([]);
  const logs = await prisma.externalSyncLog.findMany({
    where:   { integrationId: cfg.id },
    orderBy: { startedAt: 'desc' },
    take:    50,
  });
  res.json(logs);
});

// ── DHIS2 sync ────────────────────────────────────────────────────────────────
async function syncDhis2(cfg, errors) {
  const auth    = { username: cfg.username, password: cfg.passwordEncrypted };
  const headers = { 'Content-Type': 'application/json' };
  const mappings = cfg.syncConfig?.fieldMappings || [];

  let imported = 0;
  for (const mapping of mappings) {
    try {
      // Fetch data values for this indicator mapping
      const url = `${cfg.baseUrl}/api/dataValueSets.json?dataElement=${mapping.dhisElementId}&period=${mapping.period || 'LAST_12_MONTHS'}`;
      const resp = await axios.get(url, { auth, headers, timeout: 15000 });
      const values = resp.data?.dataValues || [];

      for (const dv of values) {
        if (!mapping.indicatorCode) continue;
        const indicator = await prisma.indicator.findUnique({ where: { code: mapping.indicatorCode } });
        const institution = await prisma.institution.findFirst({ where: { code: dv.orgUnit } });
        if (!indicator || !institution) continue;

        await prisma.indicatorActual.upsert({
          where: {
            indicatorId_institutionId_fiscalYear_reportingPeriod: {
              indicatorId: indicator.id,
              institutionId: institution.id,
              fiscalYear: cfg.syncConfig?.fiscalYear || '2025-2026',
              reportingPeriod: mapping.period || 'Q1',
            },
          },
          create: {
            indicatorId: indicator.id, institutionId: institution.id,
            fiscalYear: cfg.syncConfig?.fiscalYear || '2025-2026',
            reportingPeriod: mapping.period || 'Q1',
            actualValue: parseFloat(dv.value) || 0,
            status: 'submitted',
            submittedById: cfg.syncConfig?.systemUserId || (await getSystemUser()).id,
          },
          update: { actualValue: parseFloat(dv.value) || 0 },
        });
        imported++;
      }
    } catch (e) { errors.push(e.message); }
  }
  return imported;
}

// ── KoboToolbox sync ──────────────────────────────────────────────────────────
async function syncKoboToolbox(cfg, errors) {
  const assetUid = cfg.syncConfig?.assetUid;
  if (!assetUid) { errors.push('syncConfig.assetUid not set'); return 0; }

  const url  = `${cfg.baseUrl}/api/v2/assets/${assetUid}/data/?format=json`;
  const resp = await axios.get(url, {
    headers: { Authorization: `Token ${cfg.apiKey}` }, timeout: 15000,
  });

  const submissions = resp.data?.results || [];
  const mappings    = cfg.syncConfig?.fieldMappings || [];
  let imported = 0;

  for (const sub of submissions) {
    for (const mapping of mappings) {
      try {
        const value = parseFloat(sub[mapping.koboField]);
        if (isNaN(value)) continue;

        const indicator  = await prisma.indicator.findUnique({ where: { code: mapping.indicatorCode } });
        const institution = cfg.syncConfig?.defaultInstitutionCode
          ? await prisma.institution.findUnique({ where: { code: cfg.syncConfig.defaultInstitutionCode } })
          : null;
        if (!indicator || !institution) continue;

        await prisma.indicatorActual.upsert({
          where: {
            indicatorId_institutionId_fiscalYear_reportingPeriod: {
              indicatorId: indicator.id,
              institutionId: institution.id,
              fiscalYear: cfg.syncConfig?.fiscalYear || '2025-2026',
              reportingPeriod: mapping.period || 'Q1',
            },
          },
          create: {
            indicatorId: indicator.id, institutionId: institution.id,
            fiscalYear: cfg.syncConfig?.fiscalYear || '2025-2026',
            reportingPeriod: mapping.period || 'Q1',
            actualValue: value, status: 'submitted',
            submittedById: (await getSystemUser()).id,
          },
          update: { actualValue: value },
        });
        imported++;
      } catch (e) { errors.push(e.message); }
    }
  }
  return imported;
}

// ── PLANREP sync ──────────────────────────────────────────────────────────────
async function syncPlanrep(cfg, errors) {
  // PLANREP Tanzania: fetch budget plans for activities
  const url    = `${cfg.baseUrl}/api/budgets`;
  const headers = { Authorization: `Bearer ${cfg.apiKey || ''}` };
  const resp = await axios.get(url, { headers, timeout: 15000 });
  const plans = resp.data?.data || resp.data || [];
  let imported = 0;

  for (const plan of plans) {
    try {
      const activity    = plan.activityCode ? await prisma.activity.findFirst({ where: { id: plan.activityId } }) : null;
      const institution = plan.institutionCode ? await prisma.institution.findUnique({ where: { code: plan.institutionCode } }) : null;
      if (!activity || !institution) continue;

      await prisma.mtefBudget.upsert({
        where: { activityId_institutionId: { activityId: activity.id, institutionId: institution.id } },
        create: {
          activityId: activity.id, institutionId: institution.id,
          year1: plan.year1 || '2025-2026', year2: plan.year2 || '2026-2027', year3: plan.year3 || '2027-2028',
          year1Budget: parseFloat(plan.year1Budget) || 0,
          year2Budget: parseFloat(plan.year2Budget) || 0,
          year3Budget: parseFloat(plan.year3Budget) || 0,
          totalBudget: (parseFloat(plan.year1Budget) || 0) + (parseFloat(plan.year2Budget) || 0) + (parseFloat(plan.year3Budget) || 0),
          fundingSource: plan.fundingSource, programCode: plan.programCode,
        },
        update: {
          year1Budget: parseFloat(plan.year1Budget) || 0,
          year2Budget: parseFloat(plan.year2Budget) || 0,
          year3Budget: parseFloat(plan.year3Budget) || 0,
        },
      });
      imported++;
    } catch (e) { errors.push(e.message); }
  }
  return imported;
}

// ── IFMS sync ─────────────────────────────────────────────────────────────────
async function syncIfms(cfg, errors) {
  // IFMS Tanzania: fetch expenditures
  const fiscalYear = cfg.syncConfig?.fiscalYear || '2025-2026';
  const url = `${cfg.baseUrl}/api/expenditures?fiscalYear=${fiscalYear}`;
  const headers = { Authorization: `Bearer ${cfg.apiKey || ''}` };
  const resp = await axios.get(url, { headers, timeout: 15000 });
  const expenditures = resp.data?.data || resp.data || [];
  let imported = 0;

  for (const exp of expenditures) {
    try {
      const institution = exp.institutionCode
        ? await prisma.institution.findUnique({ where: { code: exp.institutionCode } })
        : null;
      if (!institution) continue;

      // Map IFMS expenditure to an existing BudgetPlan or create itemized budget record
      await prisma.itemizedBudget.upsert({
        where: {
          // use a synthetic unique constraint — fall back to create
          id: exp.ifmsId || undefined,
        },
        create: {
          accountCode:       exp.accountCode || 'IFMS-' + imported,
          accountDescription: exp.description || 'IFMS Import',
          accountClass:      exp.class || null,
          institutionId:     institution.id,
          fiscalYear,
          period:            exp.period || 'Q1',
          expenditureThisMonth: parseFloat(exp.amount) || 0,
          expenditureToDate:    parseFloat(exp.cumulative) || 0,
        },
        update: {
          expenditureThisMonth: parseFloat(exp.amount) || 0,
          expenditureToDate:    parseFloat(exp.cumulative) || 0,
        },
      }).catch(() => {});
      imported++;
    } catch (e) { errors.push(e.message); }
  }
  return imported;
}

// ── System user for automated imports ─────────────────────────────────────────
async function getSystemUser() {
  const user = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!user) throw new Error('No super_admin user found for system imports');
  return user;
}

module.exports = router;
