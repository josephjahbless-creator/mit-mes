/**
 * fix-indicator-owners.js
 * Backfills ownerInstitutionId on institution-specific indicators that
 * were created by seed-institutions.js before the ownerInstitutionId field
 * was being set.
 *
 * Indicators with codes like "CAMARTEC-01-02", "BRELA-03-01" etc. can be
 * matched to institutions by their code prefix.
 *
 * Run: node prisma/fix-indicator-owners.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Fix Indicator Owners — backfill ownerInstitutionId');
  console.log('═══════════════════════════════════════════════════\n');

  // Load all institutions
  const institutions = await prisma.institution.findMany({ select: { id: true, code: true } });
  const instByCode = Object.fromEntries(institutions.map(i => [i.code, i]));
  console.log(`  Found ${institutions.length} institutions`);

  // Load indicators that have no owner set
  const unownedIndicators = await prisma.indicator.findMany({
    where: { ownerInstitutionId: null, ownerDepartmentId: null, ownerUnitId: null },
    select: { id: true, code: true },
  });
  console.log(`  Found ${unownedIndicators.length} indicators without owner\n`);

  let updated = 0;
  let noMatch = 0;

  for (const ind of unownedIndicators) {
    // Extract institution code from the indicator code (e.g. "CAMARTEC-01-02" → "CAMARTEC")
    const prefix = ind.code.split('-')[0];
    const inst = instByCode[prefix];
    if (!inst) {
      noMatch++;
      continue;
    }

    await prisma.indicator.update({
      where: { id: ind.id },
      data: { ownerType: 'Institution', ownerInstitutionId: inst.id },
    });
    updated++;
    process.stdout.write(`  ✓ ${ind.code} → ${prefix}\n`);
  }

  console.log(`\n  ✅  Updated ${updated} indicators, ${noMatch} had no matching institution prefix\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
