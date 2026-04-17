const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const [actuals, targets, budgets, expenditures, indicators, activities, objectives, institutions, users] = await Promise.all([
    p.indicatorActual.count(),
    p.indicatorTarget.count(),
    p.budgetPlan.count(),
    p.expenditure.count(),
    p.indicator.count(),
    p.activity.count(),
    p.strategicObjective.count(),
    p.institution.count(),
    p.user.count(),
  ]);
  console.log('=== Database Status ===');
  console.log('  institutions :', institutions);
  console.log('  users        :', users);
  console.log('  objectives   :', objectives);
  console.log('  activities   :', activities);
  console.log('  indicators   :', indicators);
  console.log('  targets      :', targets);
  console.log('  actuals      :', actuals);
  console.log('  budgetPlans  :', budgets);
  console.log('  expenditures :', expenditures);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
