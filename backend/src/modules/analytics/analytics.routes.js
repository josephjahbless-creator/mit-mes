'use strict';

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const c = require('./analytics.controller');

const router = express.Router();
router.use(authenticate);

router.get('/trends',             c.trends);
router.get('/rankings',           c.rankings);
router.get('/forecasting',        c.forecasting);
router.get('/performance-matrix', c.performanceMatrix);
router.get('/summary',            c.summary);
router.get('/descriptive',        c.descriptive);
router.get('/variance',           c.varianceAnalysis);
router.get('/disaggregation',     c.disaggregationAnalysis);
router.get('/cost-benefit',       c.costBenefit);
router.get('/rbm-logframe',       c.rbmLogframe);
router.get('/ai/anomalies',       c.aiAnomalies);
router.get('/ai/risk-scores',     c.aiRiskScores);
router.get('/ai/forecasting',     c.aiForecasting);
router.post('/ai/run-alerts',     c.aiRunAlerts);

module.exports = router;
