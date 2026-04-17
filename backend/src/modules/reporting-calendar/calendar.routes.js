const express = require('express');
const { list, create, update, remove, current } = require('./calendar.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

// Note: /current must be registered before /:id to avoid "current" being
// interpreted as an ID parameter.
router.get('/',        authenticate,                                              list);
router.get('/current', authenticate,                                              current);
router.post('/',       authenticate, authorize('super_admin', 'admin', 'me_officer'), create);
router.patch('/:id',   authenticate, authorize('super_admin', 'admin', 'me_officer'), update);
router.delete('/:id',  authenticate, authorize('super_admin'),                        remove);

module.exports = router;
