const express    = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl       = require('./documents.controller');

const router = express.Router();

router.post('/',    authenticate, ctrl.uploadMiddleware, ctrl.uploadDoc);
router.get('/',     authenticate, ctrl.list);
router.get('/:id',  authenticate, ctrl.getOne);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id',
  authenticate,
  authorize('super_admin', 'admin', 'me_officer'),
  ctrl.remove
);

module.exports = router;
