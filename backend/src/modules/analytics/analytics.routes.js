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

module.exports = router;
