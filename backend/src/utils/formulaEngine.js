/**
 * Formula Engine — calculates derived metrics for indicators
 * Based on MIT sector indicator requirements
 */

function calculate(formulaType, formulaConfig, inputs) {
  const { actualValue, baselineValue, target, totalNetwork, extraFields } = inputs;

  switch (formulaType) {
    case 'achievement_pct':
      return achievementPct(actualValue, target);

    case 'cumulative_total':
      return cumulativeTotal(baselineValue, actualValue);

    case 'proportion_pct':
      return proportionPct(actualValue, baselineValue, totalNetwork || formulaConfig?.totalNetwork);

    case 'complement_pct':
      return complementPct(actualValue, baselineValue, totalNetwork || formulaConfig?.totalNetwork);

    case 'multi_input':
      return multiInputCalculate(formulaConfig, extraFields);

    case 'manual':
      return { result: actualValue, derived: {} };

    default:
      return achievementPct(actualValue, target);
  }
}

function achievementPct(actual, target) {
  if (!target || target === 0) return { achievementPct: null, result: actual, derived: {} };
  const pct = (actual / target) * 100;
  return {
    achievementPct: round(pct),
    result: actual,
    derived: {
      achievementPct: round(pct),
      status: achievementStatus(pct),
    },
  };
}

function cumulativeTotal(baseline, actual) {
  const total = (baseline || 0) + (actual || 0);
  return {
    result: total,
    derived: {
      cumulativeTotal: total,
    },
  };
}

function proportionPct(actual, baseline, totalNetwork) {
  if (!totalNetwork || totalNetwork === 0) return { result: actual, derived: {} };
  const cumulative = (actual || 0) + (baseline || 0);
  const pct = (cumulative / totalNetwork) * 100;
  return {
    result: actual,
    derived: {
      cumulativeTotal: round(cumulative),
      proportionPct: round(pct),
    },
  };
}

function complementPct(actual, baseline, totalNetwork) {
  if (!totalNetwork || totalNetwork === 0) return { result: actual, derived: {} };
  const cumulative = (actual || 0) + (baseline || 0);
  const complement = totalNetwork - cumulative;
  const complementPct = (complement / totalNetwork) * 100;
  return {
    result: actual,
    derived: {
      cumulativeTotal: round(cumulative),
      complementTotal: round(complement),
      complementPct: round(complementPct),
    },
  };
}

function multiInputCalculate(formulaConfig, extraFields) {
  if (!extraFields || !formulaConfig?.subIndicators) {
    return { result: null, derived: extraFields || {} };
  }

  const derived = {};
  const total = Object.values(extraFields).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  for (const [key, value] of Object.entries(extraFields)) {
    const pct = total > 0 ? ((parseFloat(value) || 0) / total) * 100 : 0;
    derived[`${key}_pct`] = round(pct);
    derived[key] = parseFloat(value) || 0;
  }
  derived.assessedTotal = round(total);

  return { result: total, derived };
}

function achievementStatus(pct) {
  if (pct >= 100) return 'achieved';
  if (pct >= 75) return 'on_track';
  if (pct >= 50) return 'at_risk';
  return 'off_track';
}

function round(val, decimals = 2) {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

module.exports = { calculate };
