const express = require('express');
const { list, lock, unlock, check } = require('./periodlocks.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

// Note: /check/:fiscalYear/:period must be registered before /:id-style routes
// to avoid conflicts, but none exist here so order is straightforward.
router.get('/',                              authenticate,                                      list);
router.get('/check/:fiscalYear/:period',     authenticate,                                      check);
router.post('/lock',                         authenticate, authorize('super_admin', 'me_officer'), lock);
router.post('/unlock',                       authenticate, authorize('super_admin'),               unlock);

module.exports = router;
