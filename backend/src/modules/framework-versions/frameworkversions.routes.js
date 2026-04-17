const express    = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl       = require('./frameworkversions.controller');

const router = express.Router();

router.get('/',
  authenticate,
  ctrl.list
);

router.post('/',
  authenticate,
  authorize('super_admin', 'me_officer'),
  ctrl.create
);

router.post('/:id/approve',
  authenticate,
  authorize('super_admin', 'me_officer'),
  ctrl.approve
);

router.get('/:id/snapshot',
  authenticate,
  ctrl.getSnapshot
);

module.exports = router;
