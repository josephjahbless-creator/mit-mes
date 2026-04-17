/**
 * Returns the current fiscal year string in the format "YYYY-YYYY+1".
 * Tanzania's fiscal year runs 1 July → 30 June.
 *   - On or after 1 July  → e.g. "2025-2026"
 *   - Before 1 July       → e.g. "2024-2025"
 */
export function getCurrentFiscalYear() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed; June = 5, July = 6
  return month >= 6
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

/**
 * Returns an array of fiscal year strings covering a range of years
 * relative to the current fiscal year (useful for year-picker dropdowns).
 * @param {number} pastYears   – how many years back to include (default 3)
 * @param {number} futureYears – how many years ahead to include (default 1)
 */
export function getFiscalYearOptions(pastYears = 3, futureYears = 1) {
  const now        = new Date();
  const year       = now.getFullYear();
  const startYear  = now.getMonth() >= 6 ? year : year - 1; // base start year
  const years      = [];
  for (let y = startYear - pastYears; y <= startYear + futureYears; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}
