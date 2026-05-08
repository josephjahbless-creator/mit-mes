'use strict';

/**
 * DHIS2 integration
 * - Pull: fetch data values from DHIS2 and map to IndicatorActuals
 * - Push: export our actuals to DHIS2 as data values
 */

const prisma = require('../../config/db');

function dhis2Headers(username, password) {
  const b64 = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${b64}`, 'Content-Type': 'application/json' };
}

// Map a DHIS2 period string (e.g. "2024Q1") to our fiscalYear/period
function parseDhis2Period(dhisPeriod) {
  const qMatch = dhisPeriod.match(/^(\d{4})Q(\d)$/);
  if (qMatch) {
    const year = parseInt(qMatch[1]);
    const q = parseInt(qMatch[2]);
    return { fiscalYear: `${year}-${year + 1}`, period: `Q${q}` };
  }
  const yMatch = dhisPeriod.match(/^(\d{4})$/);
  if (yMatch) {
    const year = parseInt(yMatch[1]);
    return { fiscalYear: `${year}-${year + 1}`, period: 'Annual' };
  }
  return null;
}

// Convert our period to DHIS2 period format
function toDhis2Period(fiscalYear, period) {
  const year = parseInt(fiscalYear.split('-')[0]);
  if (period === 'Annual') return `${year}`;
  const q = period.replace('Q', '');
  return `${year}Q${q}`;
}

async function pullFromDhis2(integration) {
  const { baseUrl, username, passwordEncrypted: password, syncConfig } = integration;
  if (!baseUrl || !username || !password) throw new Error('DHIS2 credentials incomplete');

  const dataElements = syncConfig?.dataElements ?? []; // [{ dhis2Id, indicatorCode, orgUnit }]
  if (!dataElements.length) throw new Error('No dataElements in syncConfig');

  const superAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } });
  let recordsSynced = 0;
  const errors = [];

  for (const de of dataElements) {
    try {
      const url = `${baseUrl}/api/dataValueSets?dataElement=${de.dhis2Id}&orgUnit=${de.orgUnit}&period=LAST_4_QUARTERS&format=json`;
      const res = await fetch(url, {
        headers: dhis2Headers(username, password),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`DHIS2 responded ${res.status}`);
      const json = await res.json();

      const indicator = await prisma.indicator.findFirst({ where: { code: de.indicatorCode }, select: { id: true } });
      if (!indicator) throw new Error(`Indicator ${de.indicatorCode} not found`);
      const institution = await prisma.institution.findFirst({ select: { id: true } });

      for (const dv of json.dataValues ?? []) {
        const mapped = parseDhis2Period(dv.period);
        if (!mapped) continue;
        await prisma.indicatorActual.upsert({
          where: {
            indicatorId_institutionId_fiscalYear_reportingPeriod: {
              indicatorId: indicator.id,
              institutionId: institution.id,
              fiscalYear: mapped.fiscalYear,
              reportingPeriod: mapped.period,
            },
          },
          update: { actualValue: parseFloat(dv.value), source: 'DHIS2' },
          create: {
            indicatorId: indicator.id,
            institutionId: institution.id,
            fiscalYear: mapped.fiscalYear,
            reportingPeriod: mapped.period,
            actualValue: parseFloat(dv.value),
            source: 'DHIS2',
            status: 'approved',
            submittedById: superAdmin?.id,
          },
        });
        recordsSynced++;
      }
    } catch (err) {
      errors.push(`${de.dhis2Id}: ${err.message}`);
    }
  }
  return { recordsSynced, errors, startedAt: new Date(), completedAt: new Date() };
}

async function pushToDhis2(integration) {
  const { baseUrl, username, passwordEncrypted: password, syncConfig } = integration;
  if (!baseUrl || !username || !password) throw new Error('DHIS2 credentials incomplete');

  const mappings = syncConfig?.pushMappings ?? []; // [{ indicatorCode, dhis2DataElement, dhis2OrgUnit }]
  const fiscalYear = syncConfig?.fiscalYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  let recordsSynced = 0;
  const errors = [];
  const dataValues = [];

  for (const m of mappings) {
    try {
      const indicator = await prisma.indicator.findFirst({ where: { code: m.indicatorCode }, select: { id: true } });
      if (!indicator) continue;

      const actuals = await prisma.indicatorActual.findMany({
        where: { indicatorId: indicator.id, fiscalYear, status: 'approved' },
        select: { actualValue: true, reportingPeriod: true },
      });

      for (const actual of actuals) {
        dataValues.push({
          dataElement: m.dhis2DataElement,
          orgUnit: m.dhis2OrgUnit,
          period: toDhis2Period(fiscalYear, actual.reportingPeriod),
          value: String(actual.actualValue),
        });
      }
    } catch (err) {
      errors.push(`${m.indicatorCode}: ${err.message}`);
    }
  }

  if (dataValues.length) {
    const res = await fetch(`${baseUrl}/api/dataValueSets`, {
      method: 'POST',
      headers: dhis2Headers(username, password),
      body: JSON.stringify({ dataValues }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`DHIS2 push failed: ${res.status}`);
    recordsSynced = dataValues.length;
  }

  return { recordsSynced, errors, startedAt: new Date(), completedAt: new Date() };
}

module.exports = { pullFromDhis2, pushToDhis2 };
