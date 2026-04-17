/**
 * Returns the current fiscal year string in the format "YYYY-YYYY+1".
 * Tanzania's fiscal year runs 1 July → 30 June.
 *   - On or after 1 July  → e.g. "2025-2026"
 *   - Before 1 July       → e.g. "2024-2025"
 */
function getCurrentFiscalYear() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed; June = 5, July = 6
  return month >= 6
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

module.exports = { getCurrentFiscalYear };
