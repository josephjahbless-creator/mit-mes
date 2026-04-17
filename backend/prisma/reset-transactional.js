/**
 * reset-transactional.js
 * Clears all submitted/generated data so the system is ready for real data entry.
 * KEEPS: institutions, users, framework (objectives→outcomes→outputs→activities), indicators
 * CLEARS: actuals, targets, budget plans, expenditures, form submissions, audit logs
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('Resetting transactional data...\n');

  const auditLogs       = await p.auditLog.deleteMany();
  console.log(`  audit logs deleted       : ${auditLogs.count}`);

  const formSubs        = await p.formSubmission.deleteMany();
  console.log(`  form submissions deleted : ${formSubs.count}`);

  const expenditures    = await p.expenditure.deleteMany();
  console.log(`  expenditures deleted     : ${expenditures.count}`);

  const budgetPlans     = await p.budgetPlan.deleteMany();
  console.log(`  budget plans deleted     : ${budgetPlans.count}`);

  const actuals         = await p.indicatorActual.deleteMany();
  console.log(`  indicator actuals deleted: ${actuals.count}`);

  const targets         = await p.indicatorTarget.deleteMany();
  console.log(`  indicator targets deleted: ${targets.count}`);

  console.log('\n=== Preserved ===');
  const [institutions, users, objectives, indicators, activities] = await Promise.all([
    p.institution.count(),
    p.user.count(),
    p.strategicObjective.count(),
    p.indicator.count(),
    p.activity.count(),
  ]);
  console.log(`  institutions : ${institutions}`);
  console.log(`  users        : ${users}`);
  console.log(`  objectives   : ${objectives}`);
  console.log(`  indicators   : ${indicators}`);
  console.log(`  activities   : ${activities}`);
  console.log('\nSystem is clean and ready for real data entry.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
