const express = require('express');
const controller = require('./budget.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/plans', controller.listPlans);
router.get('/plans/:id', controller.getPlan);
router.post('/plans', authorize('super_admin', 'me_officer', 'admin'), controller.createPlan);
router.patch('/plans/:id', authorize('super_admin', 'me_officer', 'admin'), controller.updatePlan);

router.get('/expenditures', controller.listExpenditures);
router.post('/expenditures', authorize('super_admin', 'me_officer', 'admin', 'data_collector'), controller.createExpenditure);
router.patch('/expenditures/:id/approve', authorize('super_admin', 'me_officer', 'admin'), controller.approveExpenditure);

router.get('/summary', controller.summary);

module.exports = router;
