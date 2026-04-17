/**
 * fix-dept-users.js
 * One-time script to assign departmentId to MIT department users
 * that were created before the departmentId column existed.
 *
 * Run: node prisma/fix-dept-users.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map email domain/prefix to department code
const EMAIL_TO_DEPT_CODE = {
  'dahrm.director@mit.go.tz':  'DAHRM',
  'dahrm.officer@mit.go.tz':   'DAHRM',
  'did.director@mit.go.tz':    'DID',
  'did.officer@mit.go.tz':     'DID',
  'dpp.director@mit.go.tz':    'DPP',
  'dpp.officer@mit.go.tz':     'DPP',
  'dtd.director@mit.go.tz':    'DTD',
  'dtd.officer@mit.go.tz':     'DTD',
  'dsme.director@mit.go.tz':   'DSME',
  'dsme.officer@mit.go.tz':    'DSME',
  'dti.director@mit.go.tz':    'DTI',
  'dti.officer@mit.go.tz':     'DTI',
  'fau.head@mit.go.tz':        'FAU',
  'pmu.head@mit.go.tz':        'PMU',
  'lsu.head@mit.go.tz':        'LSU',
  'ictu.head@mit.go.tz':       'ICTU',
  'gcu.head@mit.go.tz':        'GCU',
  'iau.head@mit.go.tz':        'IAU',
  'meu.head@mit.go.tz':        'MEU',
  'meu.officer@mit.go.tz':     'MEU',
  'meu.analyst@mit.go.tz':     'MEU',
};

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Fix MIT Department Users — assign departmentId');
  console.log('═══════════════════════════════════════════════════\n');

  // Load all departments by code
  const departments = await prisma.department.findMany({ select: { id: true, code: true, name: true } });
  const deptByCode = Object.fromEntries(departments.map(d => [d.code, d]));
  console.log(`  Found ${departments.length} departments in DB`);

  let updated = 0;
  let skipped = 0;

  for (const [email, code] of Object.entries(EMAIL_TO_DEPT_CODE)) {
    const dept = deptByCode[code];
    if (!dept) {
      console.warn(`  ⚠ Department ${code} not found — run seed-departments.js first`);
      skipped++;
      continue;
    }

    const result = await prisma.user.updateMany({
      where: { email, departmentId: null },
      data: { departmentId: dept.id },
    });

    if (result.count > 0) {
      console.log(`  ✓ [${code.padEnd(6)}] ${email}`);
      updated++;
    } else {
      console.log(`  - [${code.padEnd(6)}] ${email}  (already set or user not found)`);
    }
  }

  console.log(`\n  ✅  Updated ${updated} users, skipped ${skipped}\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
