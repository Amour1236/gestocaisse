// ─── SANITIZATION MIDDLEWARE ─────────────────────────────────────────────────
// Protection contre injections XSS, NoSQL injection, prototypes pollution

const deepSanitize = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Détection de patterns dangereux
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(obj)) return '';
    if (/javascript\s*:/gi.test(obj)) return obj.replace(/javascript\s*:/gi, '');
    if (/on\w+\s*=\s*["']/gi.test(obj)) return obj.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    // Bloque les clés de pollution prototype
    if (Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
        Object.prototype.hasOwnProperty.call(obj, 'constructor') ||
        Object.prototype.hasOwnProperty.call(obj, 'prototype')) {
      return {};
    }
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('$') || k.startsWith('__')) continue;
      cleaned[k] = deepSanitize(v);
    }
    return cleaned;
  }
  return obj;
};

const sanitize = (req, res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  if (req.params) req.params = deepSanitize(req.params);
  next();
};

module.exports = { sanitize, deepSanitize };
