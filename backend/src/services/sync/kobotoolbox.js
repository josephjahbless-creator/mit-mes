'use strict';

/**
 * KoBoToolbox integration
 * - Pull: fetches submissions from KoBoToolbox API and maps to IndicatorActuals
 * - Webhook: receives incoming submissions pushed by KoBoToolbox
 */

const prisma = require('../../config/db');

async function fetchKoboSubmissions(baseUrl, apiKey, formId) {
  const url = `${baseUrl}/api/v2/assets/${formId}/data/?format=json&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${apiKey}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`KoBoToolbox API error ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

async function mapSubmissionToActual(submission, syncConfig, superAdminId) {
  // syncConfig.fieldMap: { indicatorCode, institutionCode, period, fiscalYear, value }
  const fm = syncConfig?.fieldMap ?? {};
  const indicatorCode = submission[fm.indicatorCode ?? 'indicator_code'];
  const value = parseFloat(submission[fm.value ?? 'value']);
  const period = submission[fm.period ?? 'period'] ?? 'Annual';
  const fiscalYear = submission[fm.fiscalYear ?? 'fiscal_year'];
  const institutionCode = submission[fm.institutionCode ?? 'institution_code'];

  if (!indicatorCode || isNaN(value) || !fiscalYear) return null;

  const indicator = await prisma.indicator.findFirst({ where: { code: indicatorCode }, select: { id: true } });
  if (!indicator) return null;

  const institution = institutionCode
    ? await prisma.institution.findFirst({ where: { code: institutionCode }, select: { id: true } })
    : await prisma.institution.findFirst({ select: { id: true } });
  if (!institution) return null;

  return {
    indicatorId: indicator.id,
    institutionId: institution.id,
    fiscalYear,
    reportingPeriod: period,
    actualValue: value,
    source: 'KoBoToolbox',
    status: 'submitted',
    submittedById: superAdminId,
    remarks: `Synced from KoBoToolbox submission ${submission._id ?? ''}`,
  };
}

async function syncKoboToolbox(integration) {
  const { baseUrl, apiKey, syncConfig } = integration;
  if (!baseUrl || !apiKey) throw new Error('KoBoToolbox baseUrl and apiKey required');

  const formIds = syncConfig?.formIds ?? [];
  if (!formIds.length) throw new Error('No form IDs configured in syncConfig.formIds');

  const superAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } });
  const superAdminId = superAdmin?.id;

  let recordsSynced = 0;
  const errors = [];

  for (const formId of formIds) {
    try {
      const submissions = await fetchKoboSubmissions(baseUrl, apiKey, formId);
      for (const sub of submissions) {
        const data = await mapSubmissionToActual(sub, syncConfig, superAdminId);
        if (!data) continue;
        try {
          await prisma.indicatorActual.upsert({
            where: {
              indicatorId_institutionId_fiscalYear_reportingPeriod: {
                indicatorId: data.indicatorId,
                institutionId: data.institutionId,
                fiscalYear: data.fiscalYear,
                reportingPeriod: data.reportingPeriod,
              },
            },
            update: { actualValue: data.actualValue, source: data.source },
            create: data,
          });
          recordsSynced++;
        } catch {}
      }
    } catch (err) {
      errors.push(`Form ${formId}: ${err.message}`);
    }
  }

  return { recordsSynced, errors, startedAt: new Date(), completedAt: new Date() };
}

// Handle a single incoming webhook payload from KoBoToolbox
async function handleWebhookPayload(payload, syncConfig) {
  const superAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } });
  const data = await mapSubmissionToActual(payload, syncConfig, superAdmin?.id);
  if (!data) return { ok: false, reason: 'Could not map submission to an indicator actual' };

  await prisma.indicatorActual.upsert({
    where: {
      indicatorId_institutionId_fiscalYear_reportingPeriod: {
        indicatorId: data.indicatorId,
        institutionId: data.institutionId,
        fiscalYear: data.fiscalYear,
        reportingPeriod: data.reportingPeriod,
      },
    },
    update: { actualValue: data.actualValue, source: data.source },
    create: data,
  });
  return { ok: true };
}

module.exports = { syncKoboToolbox, handleWebhookPayload };
