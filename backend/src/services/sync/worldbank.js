'use strict';

/**
 * World Bank Open Data sync
 * Pulls Tanzania indicator data and maps to system indicators by code pattern.
 * Free API, no auth required.
 */

const prisma = require('../../config/db');

// Map of World Bank indicator codes → local indicator name keywords to match
const WB_INDICATOR_MAP = [
  { wbCode: 'NY.GDP.MKTP.CD',      keyword: 'gdp' },
  { wbCode: 'NE.EXP.GNFS.ZS',      keyword: 'export' },
  { wbCode: 'NE.IMP.GNFS.ZS',      keyword: 'import' },
  { wbCode: 'SL.UEM.TOTL.ZS',      keyword: 'unemployment' },
  { wbCode: 'IC.BUS.EASE.XQ',      keyword: 'ease of doing business' },
  { wbCode: 'TX.VAL.MANF.ZS.UN',   keyword: 'manufacturing' },
  { wbCode: 'NV.IND.MANF.ZS',      keyword: 'industry' },
  { wbCode: 'IC.REG.DURS',         keyword: 'business registration' },
];

const COUNTRY = 'TZ';
const WB_BASE = 'https://api.worldbank.org/v2';

async function fetchWbIndicator(wbCode, fromYear) {
  const url = `${WB_BASE}/country/${COUNTRY}/indicator/${wbCode}?format=json&per_page=10&mrv=5&date=${fromYear}:${new Date().getFullYear()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`World Bank API error ${res.status} for ${wbCode}`);
  const json = await res.json();
  // json[0] = metadata, json[1] = data array
  return (json[1] || []).filter(d => d.value !== null);
}

function mapPeriod(year) {
  // World Bank data is annual; map to our Annual period
  const fyStart = year;
  const fyEnd = year + 1;
  return { fiscalYear: `${fyStart}-${fyEnd}`, period: 'Annual' };
}

async function findMatchingIndicator(keyword) {
  return prisma.indicator.findFirst({
    where: { name: { contains: keyword, mode: 'insensitive' } },
    select: { id: true, name: true, code: true },
  });
}

async function getSystemInstitutionId() {
  // Use MIT (first institution) as owner of World Bank data
  const inst = await prisma.institution.findFirst({ select: { id: true } });
  return inst?.id ?? null;
}

async function syncWorldBank(integration) {
  const startedAt = new Date();
  let recordsSynced = 0;
  const errors = [];

  const fromYear = new Date().getFullYear() - 3;
  const institutionId = await getSystemInstitutionId();
  if (!institutionId) throw new Error('No institution found');

  for (const { wbCode, keyword } of WB_INDICATOR_MAP) {
    try {
      const indicator = await findMatchingIndicator(keyword);
      if (!indicator) { errors.push(`No indicator matching "${keyword}"`); continue; }

      const wbData = await fetchWbIndicator(wbCode, fromYear);
      for (const row of wbData) {
        const { fiscalYear, period } = mapPeriod(parseInt(row.date));
        await prisma.indicatorActual.upsert({
          where: {
            indicatorId_institutionId_fiscalYear_reportingPeriod: {
              indicatorId: indicator.id,
              institutionId,
              fiscalYear,
              reportingPeriod: period,
            },
          },
          update: { actualValue: parseFloat(row.value), source: 'World Bank API', status: 'approved' },
          create: {
            indicatorId: indicator.id,
            institutionId,
            fiscalYear,
            reportingPeriod: period,
            actualValue: parseFloat(row.value),
            source: 'World Bank API',
            status: 'approved',
            submittedById: (await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } }))?.id ?? institutionId,
          },
        });
        recordsSynced++;
      }
    } catch (err) {
      errors.push(`${wbCode}: ${err.message}`);
    }
  }

  return { recordsSynced, errors, startedAt, completedAt: new Date() };
}

module.exports = { syncWorldBank };
