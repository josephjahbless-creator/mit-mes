const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  console.log('Clearing framework tables...');
  await p.auditLog.deleteMany();
  await p.formSubmission.deleteMany();
  await p.dataForm.deleteMany();
  await p.expenditure.deleteMany();
  await p.budgetPlan.deleteMany();
  await p.indicatorActual.deleteMany();
  await p.indicatorTarget.deleteMany();
  await p.indicator.deleteMany();
  await p.activity.deleteMany();
  await p.output.deleteMany();
  await p.outcome.deleteMany();
  await p.strategicObjective.deleteMany();
  console.log('Done — framework tables cleared.');
}
main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>p.$disconnect());
