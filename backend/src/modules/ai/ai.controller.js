/**
 * AI Analysis Controller — exposes the local-LLM (Ollama) capabilities.
 * Every handler degrades gracefully if the AI backend is offline.
 */

const ai = require('../../services/aiAnalysis.service');
const logger = require('../../utils/logger');

function offline(res, info) {
  return res.status(503).json({
    success: false,
    aiAvailable: false,
    error: 'AI analysis is currently unavailable. The local AI service (Ollama) is not reachable.',
    detail: info?.error || null,
    hint: 'Ensure Ollama is installed and running, and the model is pulled. See D:\\MIT\\Setup-AI-Ollama.bat',
  });
}

async function status(req, res) {
  try {
    const st = await ai.status();
    res.json({ success: true, ...st });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function analyze(req, res) {
  const st = await ai.status();
  if (!st.reachable) return offline(res, st);
  try {
    const { scope = 'national', fiscalYear, period, institutionId, indicatorId } = req.body || {};
    const out = await ai.analyze({ scope, fiscalYear, period, institutionId, indicatorId });
    res.json({ success: true, aiAvailable: true, model: st.model, ...out });
  } catch (e) {
    logger.error(`AI analyze error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function chat(req, res) {
  const st = await ai.status();
  if (!st.reachable) return offline(res, st);
  try {
    const { question, scope, fiscalYear, period, institutionId, indicatorId, history } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, error: 'A question is required.' });
    }
    const out = await ai.chat({ question, scope, fiscalYear, period, institutionId, indicatorId, history });
    res.json({ success: true, aiAvailable: true, model: st.model, ...out });
  } catch (e) {
    logger.error(`AI chat error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function reportSummary(req, res) {
  const st = await ai.status();
  if (!st.reachable) return offline(res, st);
  try {
    const { fiscalYear, period } = req.body || {};
    const out = await ai.reportSummary({ fiscalYear, period });
    res.json({ success: true, aiAvailable: true, model: st.model, ...out });
  } catch (e) {
    logger.error(`AI report-summary error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function explainAnomaly(req, res) {
  const st = await ai.status();
  if (!st.reachable) return offline(res, st);
  try {
    const indicatorId = req.params.indicatorId || req.body?.indicatorId;
    if (!indicatorId) return res.status(400).json({ success: false, error: 'indicatorId is required.' });
    const out = await ai.explainAnomaly({ indicatorId });
    res.json({ success: true, aiAvailable: true, model: st.model, ...out });
  } catch (e) {
    logger.error(`AI explain-anomaly error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = { status, analyze, chat, reportSummary, explainAnomaly };
