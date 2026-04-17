const express = require('express');
const controller = require('./framework.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.get('/chain', controller.getChain);

// Objectives
router.get('/objectives', controller.listObjectives);
router.get('/objectives/:id/tree', controller.getObjectiveTree);
router.post('/objectives', authorize('super_admin', 'me_officer'), controller.createObjective);
router.patch('/objectives/:id', authorize('super_admin', 'me_officer'), controller.updateObjective);
router.delete('/objectives/:id', authorize('super_admin'), controller.deleteObjective);

// Outcomes
router.post('/outcomes', authorize('super_admin', 'me_officer'), controller.createOutcome);
router.patch('/outcomes/:id', authorize('super_admin', 'me_officer'), controller.updateOutcome);
router.delete('/outcomes/:id', authorize('super_admin'), controller.deleteOutcome);

// Outputs
router.post('/outputs', authorize('super_admin', 'me_officer'), controller.createOutput);
router.patch('/outputs/:id', authorize('super_admin', 'me_officer'), controller.updateOutput);
router.delete('/outputs/:id', authorize('super_admin'), controller.deleteOutput);

// Activities
router.post('/activities', authorize('super_admin', 'me_officer'), controller.createActivity);
router.patch('/activities/:id', authorize('super_admin', 'me_officer'), controller.updateActivity);
router.delete('/activities/:id', authorize('super_admin'), controller.deleteActivity);

module.exports = router;
