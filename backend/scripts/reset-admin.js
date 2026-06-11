const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const newPassword = 'Admin@12345';
  const hash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email: 'admin@mit.go.tz' },
    data: {
      passwordHash: hash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
    },
    select: { id: true, email: true, name: true, role: true, failedLoginAttempts: true, lockedUntil: true, isActive: true }
  });

  console.log('✅ Admin reset successfully:');
  console.log(JSON.stringify(user, null, 2));
  console.log('\nLogin with:');
  console.log('  Email:    admin@mit.go.tz');
  console.log('  Password: Admin@12345');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('❌ Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
