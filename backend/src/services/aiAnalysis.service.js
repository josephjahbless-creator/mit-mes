/**
 * AI Analysis Service  (Dira ya Taifa 2050 — local AI via Ollama)
 *
 * Connects the M&E system to a LOCAL, self-hosted LLM (Ollama) so that
 * government data never leaves the Ministry's own servers.
 *
 * Capabilities:
 *   - analyze()        Enhanced insights & concrete recommendations
 *   - chat()           Ask questions about live data in plain language
 *   - reportSummary()  One-click executive summary for a period
 *   - explainAnomaly() Likely causes for a spike/drop in an indicator
 *
 * Degrades gracefully: if Ollama is unreachable, callers fall back to the
 * existing rule-based insight engine.
 *
 * Config (.env):
 *   AI_ENABLED        default "true"
 *   OLLAMA_BASE_URL   default "http://127.0.0.1:11434"
 *   OLLAMA_MODEL      default "llama3.2"
 *   AI_TIMEOUT_MS     default 120000  (local CPU inference is slow)
 */

const prisma = require('../config/db');
const logger = require('../utils/logger');

const AI_ENABLED      = (process.env.AI_ENABLED || 'true') !== 'false';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL || 'llama3.2';
const AI_TIMEOUT_MS   = parseInt(process.env.AI_TIMEOUT_MS || '120000', 10);

const SYSTEM_PROMPT =
  'You are a senior Monitoring & Evaluation (M&E) analyst for the United Republic of Tanzania, ' +
  'Ministry of Industry & Trade, working within the Dira ya Taifa 2050 framework. ' +
  'You analyse performance data (indicators, targets, actuals, achievement %) for the Ministry and its agencies. ' +
  'Be precise, objective and concise. Use plain professional language suitable for senior government officials. ' +
  'Ground every statement in the DATA provided — never invent numbers. If the data is insufficient, say so. ' +
  'Prefer short paragraphs and clear bullet points. Quantify findings (use the actual numbers and %).';

// ── Ollama transport ──────────────────────────────────────────────────────────
async function ollamaChat(messages, { temperature = 0.2, numPredict = 700 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature, num_predict: numPredict },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return data?.message?.content?.trim() || '';
  } finally {
    clearTimeout(timer);
  }
}

async function status() {
  if (!AI_ENABLED) return { enabled: false, reachable: false, model: OLLAMA_MODEL, models: [], baseUrl: OLLAMA_BASE_URL };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    return {
      enabled: true,
      reachable: true,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      modelReady: models.some((m) => m === OLLAMA_MODEL || m.startsWith(OLLAMA_MODEL + ':') || m.startsWith(OLLAMA_MODEL)),
      models,
    };
  } catch (e) {
    return { enabled: true, reachable: false, baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL, error: e.message };
  }
}

// ── Data context builders (aggregated, NO personal data) ──────────────────────
function fmt(n) {
  if (n == null) return 'n/a';
  return Math.round(n * 100) / 100;
}
const PERIOD_KEY = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };

/**
 * Build a compact performance snapshot for a scope.
 * scope: 'national' | 'institution' | 'indicator'
 */
async function buildContext({ scope = 'national', fiscalYear, period = 'Q2', institutionId, indicatorId }) {
  fiscalYear = fiscalYear || '2025-2026';
  const tgtKey = PERIOD_KEY[period] || 'annualTarget';

  if (scope === 'indicator' && indicatorId) {
    const ind = await prisma.indicator.findUnique({ where: { id: indicatorId } });
    const actuals = await prisma.indicatorActual.findMany({
      where: { indicatorId, status: 'approved' },
      include: { institution: { select: { name: true, code: true } } },
      orderBy: [{ fiscalYear: 'asc' }, { reportingPeriod: 'asc' }],
      take: 40,
    });
    return {
      scope, fiscalYear, period,
      indicator: ind ? { name: ind.name, code: ind.code, unit: ind.unit, baseline: ind.baselineValue } : null,
      records: actuals.map((a) => ({ institution: a.institution?.code, fy: a.fiscalYear, period: a.reportingPeriod, value: a.actualValue })),
    };
  }

  const where = { status: 'approved', fiscalYear, reportingPeriod: period };
  if (scope === 'institution' && institutionId) where.institutionId = institutionId;
  const actuals = await prisma.indicatorActual.findMany({
    where,
    include: {
      indicator: { select: { id: true, name: true, code: true, unit: true } },
      institution: { select: { name: true, code: true } },
    },
    take: 400,
  });

  // Pull targets for these indicator/institution pairs
  const items = [];
  for (const a of actuals) {
    const tgt = await prisma.indicatorTarget.findFirst({
      where: { indicatorId: a.indicatorId, institutionId: a.institutionId, fiscalYear },
    });
    const target = tgt ? tgt[tgtKey] : null;
    const ach = target ? Math.round((a.actualValue / target) * 1000) / 10 : null;
    items.push({
      indicator: a.indicator?.name, code: a.indicator?.code, unit: a.indicator?.unit,
      institution: a.institution?.code, actual: fmt(a.actualValue), target: fmt(target), achievementPct: ach,
    });
  }

  // Institution-level averages
  const byInst = {};
  items.forEach((it) => {
    if (it.achievementPct == null) return;
    (byInst[it.institution] = byInst[it.institution] || []).push(it.achievementPct);
  });
  const institutionAverages = Object.entries(byInst).map(([code, arr]) => ({
    institution: code, avgAchievementPct: Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10, indicators: arr.length,
  })).sort((a, b) => a.avgAchievementPct - b.avgAchievementPct);

  const withTarget = items.filter((i) => i.achievementPct != null);
  const onTarget = withTarget.filter((i) => i.achievementPct >= 100).length;

  return {
    scope, fiscalYear, period,
    summary: {
      indicatorsReported: items.length,
      indicatorsWithTargets: withTarget.length,
      onTarget,
      onTargetPct: withTarget.length ? Math.round((onTarget / withTarget.length) * 100) : null,
    },
    institutionAverages,
    indicators: items.slice(0, 60),
  };
}

function dataBlock(ctx) {
  return 'DATA (JSON):\n```json\n' + JSON.stringify(ctx, null, 1) + '\n```';
}

// ── Capabilities ──────────────────────────────────────────────────────────────
async function analyze({ scope, fiscalYear, period, institutionId, indicatorId }) {
  const ctx = await buildContext({ scope, fiscalYear, period, institutionId, indicatorId });
  const prompt =
    `Analyse the M&E performance below for ${period} ${fiscalYear} (${scope} scope).\n\n` +
    `Provide:\n1. **Overall assessment** (2-3 sentences).\n2. **Key findings** (3-5 bullets, each with numbers).\n` +
    `3. **Areas of concern** (lagging indicators/institutions, with %).\n4. **Recommended actions** (3-5 concrete, prioritised steps).\n\n` +
    dataBlock(ctx);
  const content = await ollamaChat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ], { numPredict: 800 });
  return { content, context: ctx.summary || null };
}

async function chat({ question, scope = 'national', fiscalYear, period, institutionId, indicatorId, history = [] }) {
  const ctx = await buildContext({ scope, fiscalYear, period, institutionId, indicatorId });
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\nAnswer the user question using ONLY the DATA provided. Be specific and quantify.' },
    ...history.slice(-6).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content || '').slice(0, 2000) })),
    { role: 'user', content: `${question}\n\n${dataBlock(ctx)}` },
  ];
  const content = await ollamaChat(messages, { numPredict: 600 });
  return { content };
}

async function reportSummary({ fiscalYear, period }) {
  const ctx = await buildContext({ scope: 'national', fiscalYear, period });
  const prompt =
    `Write a concise EXECUTIVE SUMMARY of national M&E performance for ${period} ${fiscalYear}, ` +
    `suitable for a Ministerial / CMT briefing. Structure:\n` +
    `- **Headline** (one sentence with the on-target %).\n- **Performance overview** (one short paragraph).\n` +
    `- **Top performers** and **Lagging institutions** (named, with %).\n- **Priorities for next period** (3 bullets).\n` +
    `Keep it under 250 words.\n\n` + dataBlock(ctx);
  const content = await ollamaChat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ], { numPredict: 600 });
  return { content, context: ctx.summary || null };
}

async function explainAnomaly({ indicatorId }) {
  const ctx = await buildContext({ scope: 'indicator', indicatorId });
  const prompt =
    `The indicator below may show an unusual change across periods. Identify any spike or drop, ` +
    `quantify it, and explain the MOST LIKELY causes (data-entry error, seasonality, real performance change, ` +
    `policy effect, etc.). List what an M&E officer should verify. Be brief.\n\n` + dataBlock(ctx);
  const content = await ollamaChat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ], { numPredict: 500 });
  return { content, indicator: ctx.indicator || null };
}

module.exports = { status, analyze, chat, reportSummary, explainAnomaly, buildContext, OLLAMA_MODEL, OLLAMA_BASE_URL };
