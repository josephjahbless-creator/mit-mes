const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const n = await p.project.count();
  console.log('projects table ok, count:', n);
}
main().catch(e => console.log('ERROR:', e.message)).finally(() => p.$disconnect());
