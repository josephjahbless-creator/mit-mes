const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const c = require('./disaggregation.controller');

router.get('/',                     authenticate, c.list);
router.get('/:id',                  authenticate, c.getOne);
router.post('/',                    authenticate, authorize('super_admin', 'me_officer'), c.create);
router.patch('/:id',                authenticate, authorize('super_admin', 'me_officer'), c.update);
router.delete('/:id',               authenticate, authorize('super_admin'), c.remove);

router.get('/:id/options',          authenticate, c.listOptions);
router.post('/:id/options',         authenticate, authorize('super_admin', 'me_officer'), c.addOption);
router.patch('/options/:optId',     authenticate, authorize('super_admin', 'me_officer'), c.updateOption);
router.delete('/options/:optId',    authenticate, authorize('super_admin'), c.removeOption);

router.get('/actuals/:actualId',    authenticate, c.getActualDisagg);
router.post('/actuals/:actualId',   authenticate, c.saveActualDisagg);
router.put('/actuals/:actualId/bulk', authenticate, c.bulkSaveActualDisagg);

module.exports = router;
