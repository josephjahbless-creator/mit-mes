const express = require('express');
const controller = require('./indicators.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/all-targets', controller.getAllTargets);
router.get('/:id', controller.getOne);
router.get('/:id/targets', controller.getTargets);
router.get('/:id/actuals/:institutionId', controller.getActuals);

router.post('/', authorize('super_admin', 'me_officer'), controller.create);
router.patch('/:id', authorize('super_admin', 'me_officer'), controller.update);

router.post('/:id/targets', authorize('super_admin', 'me_officer', 'admin'), controller.setTargets);

module.exports = router;
