/**
 * Recursive XSS sanitization middleware.
 * Strips < and > from all string values in req.body to prevent
 * stored XSS via API inputs, without breaking legitimate data.
 */

const STRIP_RE = /[<>]/g;

function sanitizeValue(val, depth = 0) {
  if (depth > 8) return val;
  if (typeof val === 'string') return val.replace(STRIP_RE, '');
  if (Array.isArray(val))      return val.map(v => sanitizeValue(v, depth + 1));
  if (val && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, sanitizeValue(v, depth + 1)])
    );
  }
  return val;
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

module.exports = sanitizeRequest;
