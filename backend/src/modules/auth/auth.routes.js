const express = require('express');
const { body } = require('express-validator');
const controller = require('./auth.controller');
const twofaController = require('./twofa.controller');
const ssoController   = require('./sso.controller');
const userRequestsController = require('../user-requests/userRequests.controller');
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

// ── 2FA ────────────────────────────────────────────────────────────────────────
router.get('/2fa/status',   authenticate, twofaController.status);
router.post('/2fa/setup',   authenticate, twofaController.setup);
router.post('/2fa/verify',  authenticate, twofaController.verify);
router.post('/2fa/disable', authenticate, twofaController.disable);
router.post('/2fa/challenge', twofaController.challenge); // no auth — pre-login

// Account request — public, no auth required
router.post('/request-account', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('institution').trim().notEmpty().withMessage('Institution is required'),
], userRequestsController.requestAccount);

// ── SSO ────────────────────────────────────────────────────────────────────────
router.get('/sso/status',               ssoController.ssoStatus);
router.get('/sso/google',               ssoController.googleAuthUrl);
router.get('/sso/google/callback',      ssoController.googleCallback);
router.get('/sso/microsoft',            ssoController.microsoftAuthUrl);
router.get('/sso/microsoft/callback',   ssoController.microsoftCallback);

module.exports = router;
