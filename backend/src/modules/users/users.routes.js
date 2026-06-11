const express = require('express');
const { body } = require('express-validator');
const controller = require('./users.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'me_officer'), controller.list);
router.get('/:id', controller.getOne);

router.post('/', authorize('super_admin', 'admin'), [
  body('name').notEmpty().withMessage('Name is required'),
  // email is auto-generated server-side from name — NOT sent by the client
  body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/).withMessage('Password must include an uppercase letter, a number, and a special character'),
  body('role').isIn(['super_admin', 'admin', 'me_officer', 'data_collector', 'viewer']),
  body('personalEmail').optional({ checkFalsy: true }).isEmail().withMessage('Personal email must be a valid email address'),
], controller.create);

router.patch('/:id', authorize('super_admin', 'admin'), controller.update);
router.patch('/:id/reset-password', authorize('super_admin', 'admin'), controller.resetPassword);
router.patch('/:id/toggle-active', authorize('super_admin', 'admin'), controller.toggleActive);

module.exports = router;
