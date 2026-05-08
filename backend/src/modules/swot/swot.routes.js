'use strict';

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const c = require('./swot.controller');

const router = express.Router();
router.use(authenticate);

router.get('/',       c.list);
router.post('/',      c.create);
router.patch('/:id',  c.update);
router.delete('/:id', c.remove);

module.exports = router;
