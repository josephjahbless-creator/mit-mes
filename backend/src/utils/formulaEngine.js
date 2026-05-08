/**
 * Formula Engine — calculates derived metrics for indicators
 * Supports 13 formula types covering the full range of MIT M&E indicator needs.
 *
 * inputs shape:
 *  { actualValue, baselineValue, target, totalNetwork, extraFields, formulaConfig }
 *
 * All functions return: { result, achievementPct?, derived: { ... }, displayValue?, statusLabel? }
 */

// ── Shared helpers ─────────────────────────────────────────────────────────────

function round(val, decimals = 2) {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function achievementStatus(pct) {
  if (pct >= 100) return 'achieved';
  if (pct >= 75)  return 'on_track';
  if (pct >= 50)  return 'at_risk';
  return 'off_track';
}

function safeDiv(num, den) {
  if (!den || den === 0) return null;
  return num / den;
}

// ── Main dispatcher ────────────────────────────────────────────────────────────

function calculate(formulaType, formulaConfig, inputs) {
  const { actualValue, baselineValue, target, totalNetwork, extraFields } = inputs;

  switch (formulaType) {

    // ── Original 6 ────────────────────────────────────────────────────────────
    case 'achievement_pct':
      return achievementPct(actualValue, target);

    case 'cumulative_total':
      return cumulativeTotal(baselineValue, actualValue);

    case 'proportion_pct':
      return proportionPct(actualValue, baselineValue,
        totalNetwork || formulaConfig?.totalNetwork);

    case 'complement_pct':
      return complementPct(actualValue, baselineValue,
        totalNetwork || formulaConfig?.totalNetwork);

    case 'multi_input':
      return multiInput(formulaConfig, extraFields);

    case 'manual':
      return { result: actualValue, derived: {} };

    // ── New 7 ─────────────────────────────────────────────────────────────────
    case 'yoy_growth':
      return yoyGrowth(actualValue, extraFields, target);

    case 'weighted_score':
      return weightedScore(formulaConfig, extraFields);

    case 'cost_per_output':
      return costPerOutput(actualValue, extraFields, formulaConfig, target);

    case 'ppt_change':
      return pptChange(actualValue, baselineValue, target);

    case 'binary':
      return binary(actualValue);

    case 'rate_per_n':
      return ratePerN(actualValue, extraFields, formulaConfig, target);

    case 'average_value':
      return averageValue(actualValue, extraFields, target);

    default:
      return achievementPct(actualValue, target);
  }
}

// ── Original formula implementations ──────────────────────────────────────────

function achievementPct(actual, target) {
  if (target == null || target === 0) {
    return { achievementPct: null, result: actual, derived: {} };
  }
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
    derived: { cumulativeTotal: total },
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
      proportionPct:   round(pct),
    },
  };
}

function complementPct(actual, baseline, totalNetwork) {
  if (!totalNetwork || totalNetwork === 0) return { result: actual, derived: {} };
  const cumulative  = (actual || 0) + (baseline || 0);
  const complement  = totalNetwork - cumulative;
  const compPct     = (complement / totalNetwork) * 100;
  return {
    result: actual,
    derived: {
      cumulativeTotal: round(cumulative),
      complementTotal: round(complement),
      complementPct:   round(compPct),
    },
  };
}

function multiInput(formulaConfig, extraFields) {
  if (!extraFields || !formulaConfig?.subIndicators) {
    return { result: null, derived: extraFields || {} };
  }
  const derived = {};
  const total   = Object.values(extraFields)
    .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  for (const [key, value] of Object.entries(extraFields)) {
    const pct = total > 0 ? ((parseFloat(value) || 0) / total) * 100 : 0;
    derived[`${key}_pct`] = round(pct);
    derived[key]          = parseFloat(value) || 0;
  }
  derived.assessedTotal = round(total);
  return { result: total, derived };
}

// ── New formula implementations ────────────────────────────────────────────────

/**
 * yoy_growth — Year-over-Year Growth Rate
 *
 * Required extra fields: { previousYearValue: number }
 * target = desired growth rate as a % (e.g. 10 for "10% growth target")
 *
 * Growth %     = ((actual - prev) / |prev|) × 100
 * Achievement% = (growth% / target_growth%) × 100
 */
function yoyGrowth(actual, extraFields, targetGrowthRate) {
  const prev = parseFloat(extraFields?.previousYearValue);
  if (isNaN(prev) || prev === 0) {
    return {
      result: actual,
      derived: { growthRate: null, previousYearValue: prev || null },
      displayValue: 'Prior year value required',
    };
  }

  const growthRate = ((actual - prev) / Math.abs(prev)) * 100;
  const absChange  = actual - prev;

  let achievementPctVal = null;
  if (targetGrowthRate != null && targetGrowthRate !== 0) {
    achievementPctVal = round((growthRate / targetGrowthRate) * 100);
  }

  const derived = {
    previousYearValue: prev,
    currentYearValue:  actual,
    absoluteChange:    round(absChange),
    growthRate:        round(growthRate),
    targetGrowthRate:  targetGrowthRate || null,
  };
  if (achievementPctVal != null) {
    derived.achievementPct = achievementPctVal;
    derived.status         = achievementStatus(achievementPctVal);
  }

  return {
    result:         round(growthRate),
    achievementPct: achievementPctVal,
    displayValue:   `${growthRate >= 0 ? '+' : ''}${round(growthRate)}%`,
    derived,
  };
}

/**
 * weighted_score — Composite Performance Index
 *
 * formulaConfig.subIndicators = [{ key, label, weight, target }]   (weights should sum to 1.0)
 * extraFields = { [key]: actualValue, ... }
 *
 * Normalised_i = min((actual_i / target_i) × 100, 100)
 * Score        = Σ(Normalised_i × weight_i)
 */
function weightedScore(formulaConfig, extraFields) {
  const subs = formulaConfig?.subIndicators;
  if (!subs?.length || !extraFields) {
    return { result: null, derived: extraFields || {} };
  }

  let score        = 0;
  let totalWeight  = 0;
  const derived    = {};

  for (const sub of subs) {
    const actual   = parseFloat(extraFields[sub.key]) || 0;
    const target   = parseFloat(sub.target)           || 0;
    const weight   = parseFloat(sub.weight)           || 0;
    const normPct  = target > 0 ? Math.min((actual / target) * 100, 100) : 0;

    derived[sub.key]              = actual;
    derived[`${sub.key}_target`]  = target;
    derived[`${sub.key}_pct`]     = round(normPct);
    derived[`${sub.key}_weight`]  = weight;
    derived[`${sub.key}_contrib`] = round(normPct * weight);

    score       += normPct * weight;
    totalWeight += weight;
  }

  // Normalise if weights don't sum to 1
  const finalScore = totalWeight > 0 && totalWeight !== 1
    ? score / totalWeight
    : score;

  derived.compositeScore = round(finalScore);
  derived.totalWeight    = round(totalWeight);
  derived.status         = achievementStatus(finalScore);

  return {
    result:         round(finalScore),
    achievementPct: round(finalScore),
    displayValue:   `${round(finalScore)}/100`,
    derived,
  };
}

/**
 * cost_per_output — Budget Efficiency Ratio
 *
 * Required extra fields: { expenditure: number }
 * target or formulaConfig.targetCostPerUnit = target cost per unit
 *
 * Cost per unit       = expenditure / actual (units delivered)
 * Cost efficiency %   = (targetCostPerUnit / actualCostPerUnit) × 100
 *   (higher = more efficient — you spent less per unit than planned)
 */
function costPerOutput(actual, extraFields, formulaConfig, targetCostPerUnit) {
  const expenditure = parseFloat(extraFields?.expenditure);
  if (isNaN(expenditure) || expenditure <= 0 || actual <= 0) {
    return {
      result: actual,
      derived: { expenditure: expenditure || null, unitsDelivered: actual },
      displayValue: actual > 0 ? `${actual} units` : 'Expenditure required',
    };
  }

  const costPerUnit = expenditure / actual;
  const tCost       = parseFloat(targetCostPerUnit || formulaConfig?.targetCostPerUnit);

  let efficiencyPct = null;
  if (!isNaN(tCost) && tCost > 0) {
    efficiencyPct = round((tCost / costPerUnit) * 100);
  }

  const derived = {
    unitsDelivered: actual,
    expenditure:    round(expenditure),
    costPerUnit:    round(costPerUnit),
    targetCostPerUnit: !isNaN(tCost) ? tCost : null,
  };
  if (efficiencyPct != null) {
    derived.efficiencyPct = efficiencyPct;
    derived.status        = achievementStatus(efficiencyPct);
  }

  return {
    result:         round(costPerUnit),
    achievementPct: efficiencyPct,
    displayValue:   `${round(costPerUnit).toLocaleString()} per unit`,
    derived,
  };
}

/**
 * ppt_change — Percentage Point Change
 *
 * actualValue  = current percentage (e.g. 45 for 45%)
 * baselineValue = starting percentage (e.g. 38 for 38%)
 * target       = target PPT change (e.g. 10 for "+10 percentage points")
 *
 * PPT change  = current% − baseline%
 * Achievement = (actual PPT / target PPT) × 100
 */
function pptChange(actual, baseline, targetPpt) {
  if (baseline == null) {
    return {
      result: actual,
      derived: { currentPct: actual, baseline: null },
      displayValue: `${actual}% (baseline not set)`,
    };
  }

  const pptActual = round(actual - baseline);
  let achievementPctVal = null;

  if (targetPpt != null && targetPpt !== 0) {
    achievementPctVal = round((pptActual / targetPpt) * 100);
  }

  const derived = {
    baselinePct:    round(baseline),
    currentPct:     round(actual),
    pptChange:      pptActual,
    targetPptChange: targetPpt || null,
  };
  if (achievementPctVal != null) {
    derived.achievementPct = achievementPctVal;
    derived.status         = achievementStatus(achievementPctVal);
  }

  return {
    result:         pptActual,
    achievementPct: achievementPctVal,
    displayValue:   `${pptActual >= 0 ? '+' : ''}${pptActual} pp (${round(actual)}%)`,
    derived,
  };
}

/**
 * binary — Yes/No Milestone Achievement
 *
 * actualValue = 1 (achieved) or 0 (not achieved)
 * Achievement = 100% or 0%
 */
function binary(actual) {
  const achieved    = actual === 1 || actual === true || actual === '1';
  const pct         = achieved ? 100 : 0;
  return {
    result:         achieved ? 1 : 0,
    achievementPct: pct,
    displayValue:   achieved ? '✓ Achieved' : '✗ Not achieved',
    derived: {
      achieved,
      achievementPct: pct,
      status:         achieved ? 'achieved' : 'off_track',
    },
  };
}

/**
 * rate_per_n — Population-Normalised Rate
 *
 * actualValue                        = count (e.g. 1200 registered businesses)
 * formulaConfig.referencePopulation  = denominator (e.g. 400000 workforce)
 * formulaConfig.base                 = multiplier (e.g. 1000 → "per 1,000")
 * target                             = target rate (e.g. 3.5 per 1,000)
 *
 * Rate        = (count / population) × base
 * Achievement = (rate / targetRate) × 100
 */
function ratePerN(actual, extraFields, formulaConfig, targetRate) {
  const population = parseFloat(
    extraFields?.referencePopulation || formulaConfig?.referencePopulation
  );
  const base = parseFloat(formulaConfig?.base) || 1000;

  if (isNaN(population) || population <= 0) {
    return {
      result: actual,
      derived: { count: actual, population: null, base },
      displayValue: 'Reference population required',
    };
  }

  const rate = (actual / population) * base;
  let achievementPctVal = null;
  if (targetRate != null && targetRate > 0) {
    achievementPctVal = round((rate / targetRate) * 100);
  }

  const derived = {
    count:      actual,
    population: round(population),
    base,
    rate:       round(rate),
    targetRate: targetRate || null,
  };
  if (achievementPctVal != null) {
    derived.achievementPct = achievementPctVal;
    derived.status         = achievementStatus(achievementPctVal);
  }

  return {
    result:         round(rate),
    achievementPct: achievementPctVal,
    displayValue:   `${round(rate)} per ${base.toLocaleString()}`,
    derived,
  };
}

/**
 * average_value — Simple Mean
 *
 * Two modes:
 *   A) User enters the total and a count → average = total / count
 *      extraFields = { count: N }
 *   B) User enters the average directly (no extraFields) → treated like achievement_pct
 *
 * target = target average (for achievement%)
 */
function averageValue(actual, extraFields, target) {
  const count   = parseFloat(extraFields?.count);
  const hasCount = !isNaN(count) && count > 0;
  const average  = hasCount ? actual / count : actual;

  let achievementPctVal = null;
  if (target != null && target > 0) {
    achievementPctVal = round((average / target) * 100);
  }

  const derived = {
    totalValue: actual,
    count:      hasCount ? count : 1,
    average:    round(average),
  };
  if (achievementPctVal != null) {
    derived.achievementPct = achievementPctVal;
    derived.status         = achievementStatus(achievementPctVal);
  }

  return {
    result:         round(average),
    achievementPct: achievementPctVal,
    displayValue:   round(average).toLocaleString(),
    derived,
  };
}

module.exports = { calculate };
