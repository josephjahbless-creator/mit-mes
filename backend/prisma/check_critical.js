const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.activity.count({ where: { isCritical: true } })
  .then(n => console.log('Critical activities:', n))
  .finally(() => p.$disconnect());
