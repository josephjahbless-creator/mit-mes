const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN         || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ── Startup validation — fail fast if secrets are missing or too weak ─────────
if (!ACCESS_SECRET  || ACCESS_SECRET.length  < 64) throw new Error('JWT_SECRET must be at least 64 characters');
if (!REFRESH_SECRET || REFRESH_SECRET.length < 64) throw new Error('JWT_REFRESH_SECRET must be at least 64 characters');

const SIGN_OPTS   = { algorithm: 'HS256' };
const VERIFY_OPTS = { algorithms: ['HS256'] };  // blocks algorithm:none attacks

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { ...SIGN_OPTS, expiresIn: ACCESS_EXPIRES });
}

function signRefresh(payload) {
  // Add a random jti so every refresh token is unique even when two logins land
  // in the same second — otherwise identical {id}+iat produced an identical token
  // string and collided on the unique `token` column (P2002 -> 409 on login).
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, REFRESH_SECRET, { ...SIGN_OPTS, expiresIn: REFRESH_EXPIRES });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET, VERIFY_OPTS);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET, VERIFY_OPTS);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
