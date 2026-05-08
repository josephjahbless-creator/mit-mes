/**
 * MIT email generator utility.
 * "Joseph Sungareti"   → joseph.sungareti@mit.go.tz
 * "Joseph L Sungareti" → joseph.l.sungareti@mit.go.tz
 */

function nameToMitEmail(name) {
  return name
    .trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')                          // keep only letters & spaces
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('.') + '@mit.go.tz';
}

/**
 * Generate a unique MIT email, appending a number if the base is already taken.
 * e.g. joseph.sungareti@mit.go.tz → joseph.sungareti2@mit.go.tz
 */
async function generateMitEmail(name, prisma) {
  const base  = nameToMitEmail(name);
  const local = base.split('@')[0];

  const existing = await prisma.user.findUnique({ where: { email: base } });
  if (!existing) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${local}${i}@mit.go.tz`;
    const taken = await prisma.user.findUnique({ where: { email: candidate } });
    if (!taken) return candidate;
  }
  return base; // fallback (shouldn't reach here)
}

module.exports = { nameToMitEmail, generateMitEmail };
