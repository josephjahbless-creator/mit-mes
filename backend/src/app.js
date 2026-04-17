require('dotenv').config();
// Patch Express Router so async route handlers auto-forward errors to next()
// Must come before express is used anywhere
require('express-async-errors');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security headers (hardened Helmet) ────────────────────────────────────────
app.use(helmet({
  hsts:                    { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy:   false,   // SPA handles its own CSP; re-enable with full policy for API-only
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — allow any LAN origin on port 5443 + localhost dev ─────────────────
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '5443');
app.use(cors({
  origin: (origin, cb) => {
    // No origin = same-origin request or non-browser client — always allow
    if (!origin) return cb(null, true);
    // Allow localhost dev server on any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    // Allow any IP/hostname accessing on the HTTPS port (works on any network)
    if (origin === `https://localhost:${HTTPS_PORT}`) return cb(null, true);
    const url = new URL(origin);
    if (url.protocol === 'https:' && parseInt(url.port) === HTTPS_PORT) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    cb(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));  // tightened from 10mb
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Global rate limiters ──────────────────────────────────────────────────────
// General API limiter: 300 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
// Strict limiter for auth endpoints: 10 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login',   authLimiter);
app.use('/api/auth/refresh', authLimiter);

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/institutions', require('./modules/institutions/institutions.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/framework', require('./modules/results-framework/framework.routes'));
app.use('/api/indicators', require('./modules/indicators/indicators.routes'));
app.use('/api/data-entry', require('./modules/data-entry/dataentry.routes'));
app.use('/api/budget', require('./modules/budget/budget.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/analytics', require('./modules/analytics/analytics.routes'));
app.use('/api/reports', require('./modules/reports/reports.routes'));
app.use('/api/uploads', require('./modules/uploads/uploads.routes'));
app.use('/api/projects', require('./modules/projects/projects.routes'));
app.use('/api/integrations', require('./modules/integrations/integrations.routes'));
app.use('/api/period-locks', require('./modules/period-locks/periodlocks.routes'));
app.use('/api/calendar',     require('./modules/reporting-calendar/calendar.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/documents',     require('./modules/documents/documents.routes'));
app.use('/api/framework-versions', require('./modules/framework-versions/frameworkversions.routes'));
app.use('/api/departments',        require('./modules/departments/departments.routes'));
app.use('/api/workplan',           require('./modules/workplan/workplan.routes'));
app.use('/api/helpdesk',           require('./modules/helpdesk/helpdesk.routes'));
// Uploads — require authentication; only serve files to logged-in users
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler — catches JSON parse errors, Prisma errors, and all unhandled errors
app.use((err, req, res, next) => {
  // CORS blocked origin — return 403, not 500
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  // Prisma known errors
  if (err.code) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate entry — a record with this value already exists' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid reference — related record does not exist' });
    if (err.code === 'P2011' || err.code === 'P2012') return res.status(400).json({ error: 'Missing required field' });
    if (err.code === 'P2000') return res.status(400).json({ error: 'Value too long for field' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '5000');

// Try to start HTTPS server with self-signed cert
const certPath = path.join(__dirname, '../certs/cert.pem');
const keyPath  = path.join(__dirname, '../certs/key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath),
  };
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`MIT M&E Backend (HTTPS) running on port ${HTTPS_PORT}`);
  });
  // HTTP → HTTPS redirect
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}` });
    res.end();
  }).listen(PORT, () => {
    console.log(`HTTP redirect running on port ${PORT} → HTTPS ${HTTPS_PORT}`);
  });
} else {
  app.listen(PORT, () => console.log(`MIT M&E Backend running on port ${PORT}`));
}

module.exports = app;
