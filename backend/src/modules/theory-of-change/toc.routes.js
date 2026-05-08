const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const c = require('./toc.controller');

router.get('/',                        authenticate, c.listAll);
router.get('/:level/:referenceId',     authenticate, c.get);
router.post('/',                       authenticate, authorize('super_admin', 'me_officer'), c.upsert);
router.post('/:tocId/assumptions',     authenticate, authorize('super_admin', 'me_officer'), c.addAssumption);
router.patch('/assumptions/:id',       authenticate, authorize('super_admin', 'me_officer'), c.updateAssumption);
router.delete('/assumptions/:id',      authenticate, authorize('super_admin', 'me_officer'), c.deleteAssumption);
router.post('/:tocId/risks',           authenticate, authorize('super_admin', 'me_officer'), c.addRisk);
router.patch('/risks/:id',             authenticate, authorize('super_admin', 'me_officer'), c.updateRisk);
router.delete('/risks/:id',            authenticate, authorize('super_admin', 'me_officer'), c.deleteRisk);

module.exports = router;
