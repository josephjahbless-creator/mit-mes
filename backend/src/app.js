require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('express-async-errors');
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const path          = require('path');
const https         = require('https');
const http          = require('http');
const fs            = require('fs');
const rateLimit     = require('express-rate-limit');
const swaggerUi     = require('swagger-ui-express');
const swaggerSpec   = require('./config/swagger');
const { initSocket } = require('./lib/socket');

const app = express();

// Trust the first proxy hop (localhost.run / any reverse proxy / tunnel)
app.set('trust proxy', 1);

// ── Security headers (hardened Helmet) ────────────────────────────────────────
app.use(helmet({
  hsts:                    { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:", "blob:"],
      connectSrc:  ["'self'", "wss:", "ws:"],
      fontSrc:     ["'self'", "data:"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — explicit allowlist + LAN port access ───────────────────────────────
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '5443');
const ALLOWED_ORIGINS = new Set([
  'https://localhost:5173',
  `https://localhost:${HTTPS_PORT}`,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                   // same-origin / curl
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    try {
      const u = new URL(origin);
      // Allow any HTTPS origin on the configured LAN port (internal network access)
      if (u.protocol === 'https:' && parseInt(u.port) === HTTPS_PORT) return cb(null, true);
      // Allow Cloudflare Tunnel domains (trycloudflare.com quick tunnels + named tunnels)
      if (u.protocol === 'https:' && (
        u.hostname.endsWith('.trycloudflare.com') ||
        u.hostname.endsWith('.cfargotunnel.com') ||
        u.hostname.endsWith('.cloudflareaccess.com')
      )) return cb(null, true);
      // Allow localhost.run tunnel domains
      if (u.protocol === 'https:' && u.hostname.endsWith('.lhr.life')) return cb(null, true);
      // Allow Serveo tunnel domains
      if (u.protocol === 'https:' && (
        u.hostname.endsWith('.serveo.net') ||
        u.hostname.endsWith('.serveousercontent.com')
      )) return cb(null, true);
    } catch {}
    console.warn(`[CORS] Blocked: ${origin}`);
    cb(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));  // tightened from 10mb
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Global audit logging (captures all authenticated mutating requests) ────────
const prismaDb = require('./config/db');
app.use((req, res, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (res.statusCode < 300 && req.user?.id) {
      const pathParts  = req.path.replace(/^\/api\//, '').split('/');
      const tableName  = pathParts[0] || 'unknown';
      const actionMap  = { POST: 'CREATE', PATCH: 'UPDATE', PUT: 'UPDATE', DELETE: 'DELETE' };
      const action     = actionMap[req.method] || req.method;
      const recordId   = body?.id || body?.data?.id || req.params?.id || null;
      prismaDb.auditLog.create({
        data: {
          userId: req.user.id,
          action,
          tableName,
          recordId: recordId ? String(recordId) : null,
          changes: req.method !== 'DELETE' ? (req.body || null) : null,
        },
      }).catch(() => {});
    }
    return originalJson.call(this, body);
  };
  next();
});

// Track login activity for user activity log
app.use((req, res, next) => {
  if (req.method !== 'POST' || !req.path.includes('/auth/login')) return next();
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (res.statusCode === 200 && body?.user?.id) {
      prismaDb.auditLog.create({
        data: {
          userId:    body.user.id,
          action:    'LOGIN',
          tableName: 'users',
          recordId:  body.user.id,
          changes:   { ip: req.ip, userAgent: req.headers['user-agent']?.substring(0, 200) },
        },
      }).catch(() => {});
    }
    return originalJson.call(this, body);
  };
  next();
});

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
app.use('/api/audit-logs',     require('./modules/audit/audit.routes'));
app.use('/api/disaggregation', require('./modules/disaggregation/disaggregation.routes'));
app.use('/api/toc',            require('./modules/theory-of-change/toc.routes'));
// ── New feature modules ───────────────────────────────────────────────────────
app.use('/api/sms',                   require('./modules/sms/sms.routes'));
app.use('/api/email-reports',         require('./modules/email-reports/emailreports.routes'));
app.use('/api/external-integrations', require('./modules/external-integrations/extintegrations.routes'));
app.use('/api/mtef',                  require('./modules/mtef/mtef.routes'));
app.use('/api/iati',                  require('./modules/iati/iati.routes'));
app.use('/api/custom-forms',          require('./modules/custom-forms/customforms.routes'));
app.use('/api/swot',                  require('./modules/swot/swot.routes'));
app.use('/api/user-requests',         require('./modules/user-requests/userRequests.routes'));
app.use('/api/webhooks',              require('./modules/webhooks/webhook.routes'));
app.use('/api/push',                  require('./modules/push/push.routes'));
app.use('/api/insights',              require('./modules/insights/insights.routes'));
// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'MIT M&E API Docs' }));
app.get('/api-spec.json', (req, res) => res.json(swaggerSpec));
// Uploads — require authentication; only serve files to logged-in users
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  // Cache hashed assets forever; never cache index.html
  app.use(express.static(frontendDist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

// Start email report scheduler
const { startScheduler } = require('./modules/email-reports/emailreports.scheduler');
startScheduler();

// Collect allowed origins for Socket.io CORS
const corsOriginList = [...ALLOWED_ORIGINS];

// HTTP server always serves the full app (used by localhost.run tunnel + reverse proxies)
const { getIo } = require('./lib/socket');
const httpServer = http.createServer(app);
initSocket(httpServer, corsOriginList);
httpServer.listen(PORT, () => {
  console.log(`MIT M&E Backend (HTTP) running on port ${PORT}`);
});

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath),
  };
  const httpsServer = https.createServer(sslOptions, app);

  // Share the same Socket.io instance across both servers
  getIo().attach(httpsServer);

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`MIT M&E Backend (HTTPS + WebSocket) running on port ${HTTPS_PORT}`);
  });
}

module.exports = app;
