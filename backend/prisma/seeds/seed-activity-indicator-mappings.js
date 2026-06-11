/**
 * Bulk-seed Activity → Indicator mappings (Dira ya Taifa 2050 automation).
 *
 * Strategy: SHARED OUTPUT. In the Results Framework, activities deliver an
 * Output and indicators measure that same Output. We therefore map every
 * activity to each indicator that sits under the same output. This is the
 * principled M&E relationship and makes indicator values update automatically
 * as the activities under their output report approved data.
 *
 * Aggregation method per indicator is inferred from its unit:
 *   - "%" / percentage units      → average
 *   - count-like units (Number…)  → sum
 *   - everything else             → sum (safe default)
 *
 * Idempotent: uses upsert on the unique (activity_id, indicator_id) pair, so
 * re-running will not create duplicates.
 *
 * Usage:  node prisma/seeds/seed-activity-indicator-mappings.js
 *         node prisma/seeds/seed-activity-indicator-mappings.js --dry-run
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

function inferAggregation(unit = '') {
  const u = String(unit).toLowerCase();
  if (u.includes('%') || u.includes('percent') || u.includes('rate') || u.includes('proportion')) {
    return 'average';
  }
  return 'sum';
}

async function seedMappings() {
  console.log(`\nBulk-seeding Activity → Indicator mappings ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  const [activities, indicators] = await Promise.all([
    prisma.activity.findMany({ select: { id: true, outputId: true, name: true } }),
    prisma.indicator.findMany({ select: { id: true, outputId: true, unit: true, code: true } }),
  ]);

  // Group indicators by their output for O(1) lookup
  const indicatorsByOutput = {};
  for (const ind of indicators) {
    (indicatorsByOutput[ind.outputId] = indicatorsByOutput[ind.outputId] || []).push(ind);
  }

  let planned = 0;
  let created = 0;
  let skipped = 0;
  let activitiesWithNoIndicators = 0;
  const errors = [];

  for (const activity of activities) {
    const linkedIndicators = indicatorsByOutput[activity.outputId] || [];
    if (linkedIndicators.length === 0) {
      activitiesWithNoIndicators++;
      continue;
    }

    for (const ind of linkedIndicators) {
      planned++;
      if (DRY_RUN) continue;

      try {
        await prisma.activityIndicatorMapping.upsert({
          where: {
            activity_id_indicator_id: {
              activity_id: activity.id,
              indicator_id: ind.id,
            },
          },
          update: {}, // keep any manual customisation already made
          create: {
            activity_id: activity.id,
            indicator_id: ind.id,
            contribution_type: 'direct',
            aggregation_method: inferAggregation(ind.unit),
            weighting: 100,
            enabled: true,
          },
        });
        created++;
      } catch (err) {
        errors.push(`${activity.id} → ${ind.code}: ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`Activities scanned:                 ${activities.length}`);
  console.log(`Indicators available:               ${indicators.length}`);
  console.log(`Activities with no shared-output indicator: ${activitiesWithNoIndicators}`);
  console.log(`Mappings planned:                   ${planned}`);
  if (!DRY_RUN) {
    console.log(`Mappings upserted:                  ${created}`);
    console.log(`Errors/skipped:                     ${skipped}`);
    if (errors.length) {
      console.log('\nFirst few errors:');
      errors.slice(0, 5).forEach((e) => console.log('  -', e));
    }
    const total = await prisma.activityIndicatorMapping.count({ where: { enabled: true } });
    console.log(`\nTotal enabled mappings now in DB:   ${total}`);
  } else {
    console.log('\n(Dry run — no rows written.)');
  }

  console.log('\n✓ Done.');
}

seedMappings()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
