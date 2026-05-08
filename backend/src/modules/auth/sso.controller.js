/**
 * SSO — OAuth2 (Google + Microsoft) without passport
 * Env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, MICROSOFT_REDIRECT_URI
 */
const axios  = require('axios');
const crypto = require('crypto');
const dayjs  = require('dayjs');
const prisma = require('../../config/db');
const { signAccess, signRefresh } = require('../../config/jwt');

const APP_URL = () => process.env.APP_URL || 'https://localhost:5443';

// ── State store (in-memory, short-lived) ──────────────────────────────────────
const states = new Map();
function genState() { const s = crypto.randomBytes(16).toString('hex'); states.set(s, Date.now()); return s; }
function checkState(s) {
  const ts = states.get(s);
  states.delete(s);
  return ts && (Date.now() - ts) < 5 * 60 * 1000;
}

// ── Shared token issuance ──────────────────────────────────────────────────────
async function issueTokensForUser(user, res) {
  const payload = { id: user.id, email: user.email, role: user.role, institutionId: user.institutionId };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh({ id: user.id });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: dayjs().add(7, 'day').toDate() },
  });
  // Redirect to frontend with tokens in query string (SPA handles them)
  const redirect = `${APP_URL()}/#/sso-callback?access=${accessToken}&refresh=${refreshToken}`;
  res.redirect(redirect);
}

// ── Google ─────────────────────────────────────────────────────────────────────
function googleAuthUrl(req, res) {
  const clientId   = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${APP_URL()}/api/auth/sso/google/callback`;
  if (!clientId) return res.status(400).json({ error: 'Google SSO not configured' });
  const state = genState();
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=openid%20email%20profile&state=${state}&access_type=offline`;
  res.redirect(url);
}

async function googleCallback(req, res) {
  const { code, state } = req.query;
  if (!checkState(state)) return res.status(400).json({ error: 'Invalid state' });

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI || `${APP_URL()}/api/auth/sso/google/callback`;

  try {
    // Exchange code for token
    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' },
    });
    const { access_token } = tokenResp.data;

    // Get user profile
    const profileResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { id: ssoId, email, name } = profileResp.data;

    // Find or create user
    let user = await prisma.user.findFirst({ where: { OR: [{ ssoId, ssoProvider: 'google' }, { email }] } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, passwordHash: crypto.randomBytes(32).toString('hex'), role: 'viewer', ssoProvider: 'google', ssoId },
      });
    } else if (!user.ssoId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { ssoProvider: 'google', ssoId } });
    }
    if (!user.isActive) return res.status(401).send('Account is inactive');
    await issueTokensForUser(user, res);
  } catch (err) {
    console.error('[SSO Google]', err.message);
    res.redirect(`${APP_URL()}/#/login?error=sso_failed`);
  }
}

// ── Microsoft ──────────────────────────────────────────────────────────────────
function microsoftAuthUrl(req, res) {
  const clientId  = process.env.MICROSOFT_CLIENT_ID;
  const tenantId  = process.env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${APP_URL()}/api/auth/sso/microsoft/callback`;
  if (!clientId) return res.status(400).json({ error: 'Microsoft SSO not configured' });
  const state = genState();
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=openid%20email%20profile&state=${state}`;
  res.redirect(url);
}

async function microsoftCallback(req, res) {
  const { code, state } = req.query;
  if (!checkState(state)) return res.status(400).json({ error: 'Invalid state' });

  const clientId     = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId     = process.env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri  = process.env.MICROSOFT_REDIRECT_URI || `${APP_URL()}/api/auth/sso/microsoft/callback`;

  try {
    const tokenResp = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const { access_token } = tokenResp.data;

    const profileResp = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { id: ssoId, mail, displayName } = profileResp.data;
    const email = mail || profileResp.data.userPrincipalName;

    let user = await prisma.user.findFirst({ where: { OR: [{ ssoId, ssoProvider: 'microsoft' }, { email }] } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: displayName || email, passwordHash: crypto.randomBytes(32).toString('hex'), role: 'viewer', ssoProvider: 'microsoft', ssoId },
      });
    } else if (!user.ssoId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { ssoProvider: 'microsoft', ssoId } });
    }
    if (!user.isActive) return res.status(401).send('Account is inactive');
    await issueTokensForUser(user, res);
  } catch (err) {
    console.error('[SSO Microsoft]', err.message);
    res.redirect(`${APP_URL()}/#/login?error=sso_failed`);
  }
}

// SSO config status
function ssoStatus(req, res) {
  res.json({
    google: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID ? '••••' + process.env.GOOGLE_CLIENT_ID.slice(-4) : null,
    },
    microsoft: {
      configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      tenantId: process.env.MICROSOFT_TENANT_ID || null,
    },
  });
}

module.exports = { googleAuthUrl, googleCallback, microsoftAuthUrl, microsoftCallback, ssoStatus };
