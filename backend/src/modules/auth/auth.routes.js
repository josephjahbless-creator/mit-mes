const express = require('express');
const { body } = require('express-validator');
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], controller.login);

router.post('/refresh', controller.refresh);

router.post('/logout', authenticate, controller.logout);

router.get('/me', authenticate, controller.me);

// Self-service: change own password (must know current password)
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], controller.changePassword);

// Forgot password — send reset email
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], controller.forgotPassword);

// Reset password via token from email
router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], controller.resetPassword);

module.exports = router;
