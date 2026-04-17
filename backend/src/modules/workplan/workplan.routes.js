const express = require('express');
const c = require('./workplan.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

const canWrite = authorize('super_admin', 'me_officer', 'admin', 'data_collector');
const canAdmin = authorize('super_admin', 'me_officer', 'admin');

// Activities workplan list + detail
router.get('/',         c.listWorkplan);
router.get('/summary',  c.workplanSummary);
router.get('/:id',      c.getActivity);
router.patch('/:id',    canWrite, c.updateWorkplan);

// Milestones
router.post('/:id/milestones',                     canWrite, c.createMilestone);
router.patch('/:id/milestones/:milestoneId',        canWrite, c.updateMilestone);
router.delete('/:id/milestones/:milestoneId',       canAdmin, c.deleteMilestone);

module.exports = router;
