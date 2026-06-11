const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@mit.go.tz' },
    select: { id: true, name: true, email: true, isActive: true, failedLoginAttempts: true, lockedUntil: true }
  });
  console.log('Before:', JSON.stringify(user, null, 2));

  const updated = await prisma.user.update({
    where: { email: 'admin@mit.go.tz' },
    data: { failedLoginAttempts: 0, lockedUntil: null }
  });
  console.log('Reset done. failedLoginAttempts:', updated.failedLoginAttempts, '| lockedUntil:', updated.lockedUntil);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
