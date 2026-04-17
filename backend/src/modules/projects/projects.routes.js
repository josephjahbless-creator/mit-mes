const express = require('express');
const c = require('./projects.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

const canWrite = authorize('super_admin', 'me_officer', 'admin', 'data_collector');
const canAdmin = authorize('super_admin', 'me_officer', 'admin');

// Projects
router.get('/',        c.listProjects);
router.get('/:id',     c.getProject);
router.post('/',       canWrite, c.createProject);
router.patch('/:id',   canWrite, c.updateProject);
router.delete('/:id',  canAdmin, c.deleteProject);

// Milestones
router.post('/:id/milestones',                     canWrite, c.createMilestone);
router.patch('/:id/milestones/:milestoneId',        canWrite, c.updateMilestone);
router.delete('/:id/milestones/:milestoneId',       canAdmin, c.deleteMilestone);

// Activities
router.post('/:id/activities',                     canWrite, c.createProjectActivity);
router.patch('/:id/activities/:activityId',        canWrite, c.updateProjectActivity);
router.delete('/:id/activities/:activityId',       canAdmin, c.deleteProjectActivity);

// Expenditures
router.post('/:id/expenditures',                   canWrite, c.createProjectExpenditure);
router.patch('/:id/expenditures/:expenditureId',   canWrite, c.updateProjectExpenditure);
router.delete('/:id/expenditures/:expenditureId',  canAdmin, c.deleteProjectExpenditure);

module.exports = router;
