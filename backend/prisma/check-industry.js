const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const count = await p.industryStatistics.count();
  const sample = await p.industryStatistics.findMany({ take: 3, orderBy: { reportDate: 'desc' } });
  console.log('Total rows:', count);
  console.log('Sample:', JSON.stringify(sample, null, 2));
}
main().catch(console.error).finally(() => p.$disconnect());
