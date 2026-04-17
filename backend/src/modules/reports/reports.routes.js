const express = require('express');
const controller = require('./reports.controller');
const { authenticate, authorize, scopeToInstitution } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(scopeToInstitution);

// data_collector and viewer can only view reports (scoped to their institution via scopeToInstitution)
router.get('/indicator/:id', controller.indicatorReport);
router.get('/institution/:id', controller.institutionReport);
router.get('/consolidated', controller.consolidatedReport);
// exports restricted to admin-level roles
router.post('/export/excel', authorize('super_admin', 'me_officer', 'admin'), controller.exportExcel);
router.post('/export/pdf',   authorize('super_admin', 'me_officer', 'admin'), controller.exportPdf);

module.exports = router;
