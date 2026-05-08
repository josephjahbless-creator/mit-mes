/**
 * Shared formula metadata used by NewIndicatorPage, SubmitDataPage,
 * IndicatorDetailPage, and the live preview engine.
 */

export const FORMULA_META = {
  achievement_pct: {
    label:       'Achievement %',
    description: '(Actual ÷ Target) × 100',
    hint:        'Most common. Use when you report a count or measure against a fixed period target.',
    category:    'basic',
    extraFields:  [],
    configFields: [],
    targetLabel:  'Period Target',
    inputLabel:   'Actual Value',
  },
  cumulative_total: {
    label:       'Cumulative Total',
    description: 'Baseline + Actual',
    hint:        'Use for running stock indicators (total registered, total trained since inception).',
    category:    'basic',
    extraFields:  [],
    configFields: [],
    targetLabel:  'Annual Target',
    inputLabel:   'New Value This Period',
  },
  proportion_pct: {
    label:       'Proportion %',
    description: '(Cumulative ÷ Total Network) × 100',
    hint:        'What share of a known total has been reached? Requires Total Network size.',
    category:    'basic',
    extraFields:  [],
    configFields: [{ key: 'totalNetwork', label: 'Total Network / Population Size', type: 'number' }],
    targetLabel:  'Target %',
    inputLabel:   'New Value This Period',
  },
  complement_pct: {
    label:       'Complement %',
    description: '(Total − Cumulative) ÷ Total × 100',
    hint:        'Remaining / not-yet-reached share. Measures what still needs to happen.',
    category:    'basic',
    extraFields:  [],
    configFields: [{ key: 'totalNetwork', label: 'Total Network / Population Size', type: 'number' }],
    targetLabel:  'Target Complement %',
    inputLabel:   'New Value This Period',
  },
  multi_input: {
    label:       'Multi-Input Breakdown',
    description: 'Sum of sub-indicators with % shares',
    hint:        'Use for indicators with multiple categories (e.g. industry types, regions).',
    category:    'composite',
    extraFields:  'dynamic', // built from subIndicators config
    configFields: [],        // managed by sub-indicator builder
    targetLabel:  'Total Target',
    inputLabel:   'Sub-indicator values',
  },
  manual: {
    label:       'Manual Entry',
    description: 'No calculation — value reported as-is',
    hint:        'Use when the data source already computes the metric (e.g. survey score, index value).',
    category:    'basic',
    extraFields:  [],
    configFields: [],
    targetLabel:  'Target Value',
    inputLabel:   'Value',
  },

  // ── New formulas ────────────────────────────────────────────────────────────
  yoy_growth: {
    label:       'Year-over-Year Growth',
    description: '((Current − Previous) ÷ |Previous|) × 100',
    hint:        'Track growth rates. Target is the desired % growth (e.g. 10 for 10% growth).',
    category:    'growth',
    extraFields: [
      { key: 'previousYearValue', label: 'Previous Year Value', type: 'number', required: true,
        hint: 'Approved value for same indicator last fiscal year' },
    ],
    configFields: [],
    targetLabel:  'Target Growth Rate (%)',
    inputLabel:   'Current Year Value',
    resultUnit:   '%',
  },
  weighted_score: {
    label:       'Weighted Score (Composite Index)',
    description: 'Σ(Normalised_i × Weight_i)',
    hint:        'Combine multiple sub-dimensions into a single 0–100 score. Weights must sum to 1.0.',
    category:    'composite',
    extraFields: 'dynamic', // built from subIndicators config
    configFields: [],       // managed by sub-indicator builder
    targetLabel:  'Target Score (0–100)',
    inputLabel:   'Sub-dimension values',
    resultUnit:   '/100',
  },
  cost_per_output: {
    label:       'Cost per Output',
    description: 'Expenditure ÷ Units Delivered',
    hint:        'Budget efficiency. Enter units delivered; add actual expenditure. Target = planned cost per unit.',
    category:    'efficiency',
    extraFields: [
      { key: 'expenditure', label: 'Actual Expenditure (TZS)', type: 'number', required: true,
        hint: 'Total approved spend linked to this activity this period' },
    ],
    configFields: [
      { key: 'targetCostPerUnit', label: 'Target Cost per Unit (TZS)', type: 'number' },
    ],
    targetLabel:  'Target Cost per Unit (TZS)',
    inputLabel:   'Units Delivered',
    resultUnit:   'TZS/unit',
  },
  ppt_change: {
    label:       'Percentage Point Change',
    description: 'Current % − Baseline %',
    hint:        'For indicators already expressed as percentages. Measures change in percentage points. Set baseline in PIRS section.',
    category:    'change',
    extraFields: [],
    configFields: [],
    targetLabel:  'Target PP Change (e.g. 8 for +8pp)',
    inputLabel:   'Current Percentage (%)',
    resultUnit:   'pp',
  },
  binary: {
    label:       'Binary (Yes/No)',
    description: 'Achieved = 100%,  Not achieved = 0%',
    hint:        'For policy milestones, system launches, agreements signed. Pass/fail only.',
    category:    'milestone',
    extraFields: [],
    configFields: [],
    targetLabel:  'N/A (binary)',
    inputLabel:   'Was this achieved?',
    isBinary:     true,
  },
  rate_per_n: {
    label:       'Rate per N (Population-Normalised)',
    description: '(Count ÷ Population) × Base',
    hint:        'Normalises counts by population for fair regional/cross-period comparison.',
    category:    'rate',
    extraFields: [
      { key: 'referencePopulation', label: 'Reference Population / Universe', type: 'number', required: true,
        hint: 'e.g. 400,000 workforce in region' },
    ],
    configFields: [
      { key: 'base', label: 'Rate Base', type: 'select',
        options: [
          { value: '100',    label: 'Per 100' },
          { value: '1000',   label: 'Per 1,000' },
          { value: '10000',  label: 'Per 10,000' },
          { value: '100000', label: 'Per 100,000' },
        ],
        defaultValue: '1000',
      },
    ],
    targetLabel:  'Target Rate (per N)',
    inputLabel:   'Count / Cases',
    resultUnit:   'per N',
  },
  average_value: {
    label:       'Average (Mean)',
    description: 'Total ÷ Count  (or direct entry)',
    hint:        'Average processing time, cost, score. Enter total value + count, or just enter the average directly.',
    category:    'average',
    extraFields: [
      { key: 'count', label: 'Number of Cases / Observations', type: 'number', required: false,
        hint: 'Leave blank to enter the average value directly' },
    ],
    configFields: [],
    targetLabel:  'Target Average',
    inputLabel:   'Total Value (or Average if no count)',
  },
};

// Ordered list for dropdowns
export const FORMULA_LIST = [
  // Basic
  'achievement_pct', 'cumulative_total', 'proportion_pct',
  'complement_pct', 'manual',
  // Growth & change
  'yoy_growth', 'ppt_change',
  // Composite
  'weighted_score', 'multi_input',
  // Efficiency / rate
  'cost_per_output', 'rate_per_n', 'average_value',
  // Milestone
  'binary',
];

export const FORMULA_CATEGORIES = {
  basic:      { label: 'Basic',              color: 'blue' },
  growth:     { label: 'Growth & Trend',     color: 'green' },
  change:     { label: 'Change Tracking',    color: 'teal' },
  composite:  { label: 'Composite / Index',  color: 'purple' },
  efficiency: { label: 'Efficiency',         color: 'amber' },
  rate:       { label: 'Rate / Density',     color: 'indigo' },
  average:    { label: 'Average / Mean',     color: 'sky' },
  milestone:  { label: 'Milestone',          color: 'emerald' },
};

/**
 * Client-side live preview calculator (mirrors backend formulaEngine.js).
 * Returns { result, achievementPct, displayValue, derived }
 */
export function previewCalculate(formulaType, formulaConfig, inputs) {
  const { actualValue, baselineValue, target, extraFields } = inputs;
  const actual = parseFloat(actualValue);

  switch (formulaType) {
    case 'achievement_pct': {
      const t = parseFloat(target);
      if (!t) return null;
      const pct = (actual / t) * 100;
      return { result: actual, achievementPct: r(pct), displayValue: `${r(pct)}%`, derived: {} };
    }
    case 'cumulative_total': {
      const total = (parseFloat(baselineValue) || 0) + actual;
      return { result: total, displayValue: total.toLocaleString(), derived: { cumulativeTotal: total } };
    }
    case 'proportion_pct': {
      const pop = parseFloat(formulaConfig?.totalNetwork);
      if (!pop) return null;
      const cum = (parseFloat(baselineValue) || 0) + actual;
      const pct = (cum / pop) * 100;
      return { result: actual, displayValue: `${r(pct)}%`, derived: { proportionPct: r(pct) } };
    }
    case 'complement_pct': {
      const pop = parseFloat(formulaConfig?.totalNetwork);
      if (!pop) return null;
      const cum   = (parseFloat(baselineValue) || 0) + actual;
      const cpct  = ((pop - cum) / pop) * 100;
      return { result: actual, displayValue: `${r(cpct)}% remaining`, derived: { complementPct: r(cpct) } };
    }
    case 'manual':
      return { result: actual, displayValue: actual.toLocaleString(), derived: {} };

    case 'yoy_growth': {
      const prev = parseFloat(extraFields?.previousYearValue);
      if (!prev) return null;
      const growth = ((actual - prev) / Math.abs(prev)) * 100;
      const t      = parseFloat(target);
      const achPct = t ? r((growth / t) * 100) : null;
      return {
        result: r(growth),
        achievementPct: achPct,
        displayValue: `${growth >= 0 ? '+' : ''}${r(growth)}% growth`,
        derived: { growthRate: r(growth), previousYearValue: prev },
      };
    }
    case 'weighted_score': {
      const subs = formulaConfig?.subIndicators;
      if (!subs?.length) return null;
      let score = 0, tw = 0;
      for (const s of subs) {
        const a  = parseFloat(extraFields?.[s.key]) || 0;
        const t2 = parseFloat(s.target) || 0;
        const w  = parseFloat(s.weight) || 0;
        const n  = t2 > 0 ? Math.min((a / t2) * 100, 100) : 0;
        score += n * w; tw += w;
      }
      const final = tw > 0 && tw !== 1 ? score / tw : score;
      return { result: r(final), achievementPct: r(final), displayValue: `${r(final)}/100`, derived: {} };
    }
    case 'cost_per_output': {
      const exp = parseFloat(extraFields?.expenditure);
      if (!exp || !actual) return null;
      const cpu  = exp / actual;
      const tCpu = parseFloat(formulaConfig?.targetCostPerUnit || target);
      const eff  = tCpu ? r((tCpu / cpu) * 100) : null;
      return { result: r(cpu), achievementPct: eff, displayValue: `${r(cpu).toLocaleString()} per unit`, derived: {} };
    }
    case 'ppt_change': {
      const base = parseFloat(baselineValue);
      if (isNaN(base)) return null;
      const ppt  = r(actual - base);
      const t    = parseFloat(target);
      const ach  = t ? r((ppt / t) * 100) : null;
      return { result: ppt, achievementPct: ach, displayValue: `${ppt >= 0 ? '+' : ''}${ppt} pp`, derived: {} };
    }
    case 'binary': {
      const achieved = actual === 1;
      return { result: achieved ? 1 : 0, achievementPct: achieved ? 100 : 0,
               displayValue: achieved ? '✓ Achieved' : '✗ Not achieved', derived: {} };
    }
    case 'rate_per_n': {
      const pop  = parseFloat(extraFields?.referencePopulation || formulaConfig?.referencePopulation);
      const base = parseFloat(formulaConfig?.base) || 1000;
      if (!pop) return null;
      const rate = (actual / pop) * base;
      const t    = parseFloat(target);
      const ach  = t ? r((rate / t) * 100) : null;
      return { result: r(rate), achievementPct: ach,
               displayValue: `${r(rate)} per ${base.toLocaleString()}`, derived: {} };
    }
    case 'average_value': {
      const count = parseFloat(extraFields?.count);
      const avg   = count > 0 ? actual / count : actual;
      const t     = parseFloat(target);
      const ach   = t ? r((avg / t) * 100) : null;
      return { result: r(avg), achievementPct: ach, displayValue: r(avg).toLocaleString(), derived: {} };
    }
    case 'multi_input': {
      const vals = Object.values(extraFields || {}).map(v => parseFloat(v) || 0);
      const tot  = vals.reduce((a, b) => a + b, 0);
      return { result: tot, displayValue: tot.toLocaleString(), derived: {} };
    }
    default:
      return null;
  }
}

function r(val, dp = 2) {
  return Math.round(val * Math.pow(10, dp)) / Math.pow(10, dp);
}

export function statusColor(pct) {
  if (pct == null) return 'text-gray-400';
  if (pct >= 100)  return 'text-green-600';
  if (pct >= 75)   return 'text-blue-600';
  if (pct >= 50)   return 'text-amber-600';
  return 'text-red-600';
}

export function statusBadge(pct) {
  if (pct == null) return { label: 'No target', cls: 'bg-gray-100 text-gray-500' };
  if (pct >= 100)  return { label: 'Achieved',  cls: 'bg-green-100 text-green-700' };
  if (pct >= 75)   return { label: 'On Track',  cls: 'bg-blue-100 text-blue-700' };
  if (pct >= 50)   return { label: 'At Risk',   cls: 'bg-amber-100 text-amber-700' };
  return            { label: 'Off Track',        cls: 'bg-red-100 text-red-700' };
}
