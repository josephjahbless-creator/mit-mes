const express = require('express');
const { body } = require('express-validator');
const controller = require('./institutions.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);

router.post('/', authorize('super_admin'), [
  body('name').notEmpty(),
  body('code').notEmpty(),
], controller.create);

router.patch('/:id', authorize('super_admin', 'admin'), controller.update);

router.post('/:id/regenerate-key', authorize('super_admin'), controller.regenerateApiKey);

module.exports = router;
