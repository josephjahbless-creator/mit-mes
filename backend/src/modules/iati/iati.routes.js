const express  = require('express');
const { create } = require('xmlbuilder2');
const prisma   = require('../../config/db');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

const ORG_REF  = process.env.IATI_ORG_REF  || 'TZ-GOV-MIT';
const ORG_NAME = 'Ministry of Industry and Trade, Tanzania';
const IATI_VERSION = '2.03';

// GET /iati/activities.xml — IATI Activity Standard XML
router.get('/activities.xml', async (req, res) => {
  const projects = await prisma.project.findMany({
    include: {
      institution: { select: { name: true, code: true } },
      milestones:  { select: { title: true, dueDate: true, status: true } },
    },
    take: 200,
  });

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('iati-activities', {
      version: IATI_VERSION,
      'generated-datetime': new Date().toISOString(),
      'linked-data-default': 'https://iatiregistry.org/dataset/',
    });

  for (const p of projects) {
    const act = root.ele('iati-activity', {
      'xml:lang':            'en',
      'default-currency':    'TZS',
      'last-updated-datetime': p.updatedAt.toISOString(),
      'humanitarian':        '0',
    });
    act.ele('iati-identifier').txt(`${ORG_REF}-${p.code || p.id}`);
    act.ele('reporting-org', { ref: ORG_REF, type: '10' }).ele('narrative').txt(ORG_NAME);
    act.ele('title').ele('narrative').txt(p.name);
    if (p.description) act.ele('description', { type: '1' }).ele('narrative').txt(p.description);

    act.ele('activity-status', { code: mapProjectStatus(p.status) });
    act.ele('activity-scope', { code: '4' }); // National

    if (p.startDate) act.ele('activity-date', { type: '2', 'iso-date': p.startDate.toISOString().split('T')[0] });
    if (p.endDate)   act.ele('activity-date', { type: '4', 'iso-date': p.endDate.toISOString().split('T')[0] });

    if (p.totalBudget > 0) {
      const bud = act.ele('budget', { type: '1', status: '1' });
      bud.ele('period-start', { 'iso-date': (p.startDate || new Date()).toISOString().split('T')[0] });
      bud.ele('period-end',   { 'iso-date': (p.endDate   || new Date()).toISOString().split('T')[0] });
      bud.ele('value', { currency: 'TZS', 'value-date': new Date().toISOString().split('T')[0] }).txt(String(p.totalBudget));
    }

    if (p.institution) {
      act.ele('participating-org', { ref: p.institution.code, role: '4', type: '10' })
         .ele('narrative').txt(p.institution.name);
    }
  }

  const xml = root.end({ prettyPrint: true });
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="iati-activities.xml"');
  res.send(xml);
});

// GET /iati/results.xml — IATI Results Standard XML
router.get('/results.xml', async (req, res) => {
  const indicators = await prisma.indicator.findMany({
    where: { isActive: true },
    include: {
      actuals:  { where: { status: 'approved' }, orderBy: { reportingPeriod: 'asc' }, take: 20 },
      targets:  { orderBy: { fiscalYear: 'asc' }, take: 10 },
      output:   { include: { outcome: { include: { objective: true } } } },
    },
    take: 100,
  });

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('iati-activities', {
      version: IATI_VERSION,
      'generated-datetime': new Date().toISOString(),
    });

  const act = root.ele('iati-activity', {
    'xml:lang': 'en', 'default-currency': 'TZS',
    'last-updated-datetime': new Date().toISOString(),
  });
  act.ele('iati-identifier').txt(`${ORG_REF}-RESULTS`);
  act.ele('reporting-org', { ref: ORG_REF, type: '10' }).ele('narrative').txt(ORG_NAME);
  act.ele('title').ele('narrative').txt('MIT Results Framework Indicators');

  for (const ind of indicators) {
    const result = act.ele('result', { type: mapIndicatorType(ind.indicatorType), aggregation_status: '1' });
    result.ele('title').ele('narrative').txt(ind.name);
    if (ind.description) result.ele('description').ele('narrative').txt(ind.description);

    const indicator = result.ele('indicator', {
      measure:   ind.unit?.toLowerCase().includes('%') ? '2' : '1',
      ascending: ind.progressDirection !== 'decreasing' ? '1' : '0',
    });
    indicator.ele('title').ele('narrative').txt(ind.name);
    if (ind.description) indicator.ele('description').ele('narrative').txt(ind.description);

    // Baseline
    if (ind.baselineValue != null) {
      const bl = indicator.ele('baseline', { year: ind.baselineYear || new Date().getFullYear(), value: String(ind.baselineValue) });
      bl.ele('comment').ele('narrative').txt(`Baseline ${ind.baselineYear || ''}`);
    }

    // Targets
    for (const t of (ind.targets || [])) {
      ['q1Target', 'q2Target', 'q3Target', 'q4Target'].forEach((f, qi) => {
        if (t[f] != null) {
          const per = indicator.ele('period');
          per.ele('period-start', { 'iso-date': `${t.fiscalYear.split('-')[0]}-${String((qi * 3) + 1).padStart(2, '0')}-01` });
          per.ele('period-end',   { 'iso-date': `${t.fiscalYear.split('-')[0]}-${String(Math.min((qi + 1) * 3, 12)).padStart(2, '0')}-30` });
          per.ele('target', { value: String(t[f]) });
        }
      });
    }

    // Actuals
    for (const a of (ind.actuals || [])) {
      const per = indicator.ele('period');
      per.ele('period-start', { 'iso-date': new Date().toISOString().split('T')[0] });
      per.ele('period-end',   { 'iso-date': new Date().toISOString().split('T')[0] });
      if (a.actualValue != null) per.ele('actual', { value: String(a.actualValue) });
    }
  }

  const xml = root.end({ prettyPrint: true });
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="iati-results.xml"');
  res.send(xml);
});

function mapProjectStatus(status) {
  const map = { planned: '1', ongoing: '2', completed: '3', delayed: '2', cancelled: '5' };
  return map[status] || '2';
}
function mapIndicatorType(type) {
  const map = { output_indicator: '2', outcome_indicator: '3', impact_indicator: '3', process_indicator: '2' };
  return map[type] || '1';
}

module.exports = router;
