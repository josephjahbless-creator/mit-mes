const express = require('express');
const controller = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/overview', controller.nationalOverview);
router.get('/performance', controller.performanceDashboard);
router.get('/institution/:id', controller.institutionOverview);
router.get('/institutions-performance', controller.allInstitutionsPerformance);
router.get('/departments', controller.departmentPerformance);
router.get('/industry-statistics', controller.industryStatistics);
router.get('/industry-statistics/list', controller.listIndustryStatistics);
router.post('/industry-statistics', authorize('super_admin', 'me_officer', 'admin'), controller.createIndustryStatistics);
router.patch('/industry-statistics/:id', authorize('super_admin', 'me_officer', 'admin'), controller.updateIndustryStatistics);
router.delete('/industry-statistics/:id', authorize('super_admin', 'me_officer', 'admin'), controller.deleteIndustryStatistics);
router.get('/itemized-budget', controller.itemizedBudgetReport);

module.exports = router;
