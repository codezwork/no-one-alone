'use strict';
// Neighbours by No One Alone: local help and trade during calamities.
// Plain Node (22.13+) HTTP server with SQLite storage; one dependency (web-push).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const R = require('./src/rules');
const { open } = require('./src/db');
const { createNotifier } = require('./src/notify');
const { createService, AppError } = require('./src/service');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const LEAFLET = path.join(ROOT, 'node_modules', 'leaflet', 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(self), camera=(self)',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

/** Per-person write limits so one account can't flood a neighbourhood. */
function createLimiter() {
  const hits = new Map();
  const LIMITS = { signup: [60, 3600e3], need: [10, 3600e3], listing: [20, 3600e3], message: [60, 600e3], write: [240, 600e3], location: [120, 600e3] };
  setInterval(() => hits.clear(), 3600e3).unref();
  return (key, kind) => {
    const [max, windowMs] = LIMITS[kind];
    const k = `${kind}:${key}`;
    const t = Date.now();
    const list = (hits.get(k) || []).filter((x) => t - x < windowMs);
    if (list.length >= max) throw new AppError(429, 'rate_limited', 'You’re doing that very often. Please wait a few minutes and try again.');
    list.push(t);
    hits.set(k, list);
  };
}

function readBody(req, limit = 1_000_000) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch { /* fallback to stream */ }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new AppError(413, 'too_large', 'That upload is too large.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new AppError(400, 'bad_json', 'The request could not be read.')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...headers });
  res.end(data);
}

function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, SECURITY_HEADERS); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache,
      ...SECURITY_HEADERS
    });
    fs.createReadStream(file).pipe(res);
  });
}

function createApp({ dbFile = process.env.DB_FILE || path.join(process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : path.join(ROOT, 'data')), 'neighbours.db'), log = console.log, now } = {}) {
  const db = open(dbFile);
  const notifier = createNotifier(db, log);
  const svc = createService(db, notifier, { now });
  const limit = createLimiter();

  const meta = () => ({
    professions: R.PROFESSIONS, generalHelp: R.GENERAL_HELP, tradeCategories: R.TRADE_CATEGORIES,
    rules: {
      minSignupAge: R.MIN_SIGNUP_AGE, helperMinAge: R.HELPER_MIN_AGE, generalHelpMinAge: R.GENERAL_HELP_MIN_AGE,
      sensitiveMinViewerAge: R.SENSITIVE_MIN_VIEWER_AGE, minRadiusKm: R.MIN_RADIUS_KM, maxRadiusKm: R.MAX_RADIUS_KM, defaultRadiusKm: R.DEFAULT_RADIUS_KM
    },
    vapidPublicKey: notifier.publicKey()
  });

  // [method, pattern, handler(ctx), options]; `:id` segments become ctx.params.id
  const routes = [
    ['GET', '/api/health', () => ({ ok: true }), { public: true }],
    ['GET', '/api/meta', () => meta(), { public: true }],
    ['POST', '/api/signup', (c) => { limit(c.ip, 'signup'); return svc.signup(c.body); }, { public: true }],
    ['POST', '/api/signin', (c) => { limit(c.ip, 'signup'); return svc.signin(c.body.code); }, { public: true }],
    ['GET', '/api/me', (c) => ({ user: svc.me(c.user) })],
    ['PATCH', '/api/me', (c) => ({ user: svc.updateProfile(c.user, c.body) })],
    ['DELETE', '/api/me', (c) => svc.deleteAccount(c.user)],
    ['POST', '/api/me/location', (c) => { limit(c.user.id, 'location'); return svc.updateLocation(c.user, c.body); }],

    ['GET', '/api/needs', (c) => svc.listNeeds(c.user)],
    ['POST', '/api/needs/preview', (c) => svc.previewAudience(c.user, c.body)],
    ['POST', '/api/needs', (c) => { limit(c.user.id, 'need'); return svc.postNeed(c.user, c.body); }],
    ['GET', '/api/needs/:id', (c) => svc.getNeed(c.user, c.params.id)],
    ['POST', '/api/needs/:id/take', (c) => svc.takeNeed(c.user, c.params.id)],
    ['POST', '/api/needs/:id/release', (c) => svc.releaseNeed(c.user, c.params.id)],
    ['POST', '/api/needs/:id/resolve', (c) => svc.resolveNeed(c.user, c.params.id)],
    ['POST', '/api/needs/:id/cancel', (c) => svc.cancelNeed(c.user, c.params.id)],
    ['POST', '/api/needs/:id/thank', (c) => svc.thankHelper(c.user, c.params.id)],
    ['POST', '/api/needs/:id/messages', (c) => { limit(c.user.id, 'message'); return svc.postNeedMessage(c.user, c.params.id, c.body); }],
    ['POST', '/api/needs/:id/report', (c) => svc.report(c.user, 'need', c.params.id, c.body.reason)],

    ['GET', '/api/listings', (c) => svc.listListings(c.user)],
    ['POST', '/api/listings', (c) => { limit(c.user.id, 'listing'); return svc.postListing(c.user, c.body); }],
    ['GET', '/api/listings/:id', (c) => svc.getListing(c.user, c.params.id)],
    ['POST', '/api/listings/:id/request', (c) => svc.requestListing(c.user, c.params.id, c.body)],
    ['DELETE', '/api/listings/:id/request', (c) => svc.withdrawRequest(c.user, c.params.id)],
    ['POST', '/api/listings/:id/accept', (c) => svc.acceptRequest(c.user, c.params.id, c.body)],
    ['POST', '/api/listings/:id/release', (c) => svc.releaseReservation(c.user, c.params.id)],
    ['POST', '/api/listings/:id/sold', (c) => svc.markSold(c.user, c.params.id)],
    ['POST', '/api/listings/:id/withdraw', (c) => svc.withdrawListing(c.user, c.params.id)],
    ['POST', '/api/listings/:id/messages', (c) => { limit(c.user.id, 'message'); return svc.postListingMessage(c.user, c.params.id, c.body); }],
    ['POST', '/api/listings/:id/report', (c) => svc.report(c.user, 'listing', c.params.id, c.body.reason)],

    ['GET', '/api/notifications', (c) => svc.listNotifications(c.user)],
    ['POST', '/api/notifications/read', (c) => svc.markRead(c.user, c.body)],
    ['POST', '/api/push/subscribe', (c) => {
      if (!notifier.subscribe(c.user.id, c.body.subscription)) throw new AppError(400, 'bad_subscription', 'This browser’s push subscription could not be saved.');
      return { ok: true };
    }],
    ['POST', '/api/push/unsubscribe', (c) => { notifier.unsubscribe(c.user.id, c.body.endpoint); return { ok: true }; }]
  ].map(([method, pattern, handler, opts = {}]) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([A-Za-z0-9_-]{1,40})'; }) + '$');
    return { method, re, keys, handler, opts };
  });

  function tokenFrom(req, url) {
    const h = req.headers.authorization || '';
    if (h.startsWith('Bearer ')) return h.slice(7).trim();
    return url.searchParams.get('token') || '';
  }

  async function handleApi(req, res, url) {
    if (url.pathname === '/api/stream' && req.method === 'GET') {
      const user = svc.auth(tokenFrom(req, url));
      if (!user) return send(res, 401, { error: { code: 'signed_out', message: 'Please sign in again.' } });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', ...SECURITY_HEADERS });
      res.write(`event: hello\ndata: {}\n\n`);
      notifier.attach(user.id, res);
      return;
    }
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) return send(res, 404, { error: { code: 'not_found', message: 'Not found.' } });
    const m = url.pathname.match(route.re);
    const params = Object.fromEntries(route.keys.map((k, i) => [k, m[i + 1]]));
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'local';
    let user = null;
    if (!route.opts.public) {
      user = svc.auth(tokenFrom(req, url));
      if (!user) return send(res, 401, { error: { code: 'signed_out', message: 'Please sign in again.' } });
      if (req.method !== 'GET') limit(user.id, 'write');
    }
    const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req) : {};
    const out = route.handler({ req, url, params, body: body && typeof body === 'object' ? body : {}, user, ip });
    send(res, 200, out);
  }

  async function handler(req, res) {
    const rawPath = req.headers['x-matched-path'] || req.originalUrl || req.url;
    const url = new URL(rawPath, 'http://localhost');
    try {
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SECURITY_HEADERS); return res.end(); }
      if (url.pathname.startsWith('/vendor/leaflet/')) {
        const rel = path.normalize(url.pathname.slice('/vendor/leaflet/'.length)).replace(/^(\.\.[/\\])+/, '');
        return serveFile(res, path.join(LEAFLET, rel), 'public, max-age=604800');
      }
      const rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
      const file = path.join(PUBLIC, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(PUBLIC)) { res.writeHead(400, SECURITY_HEADERS); return res.end(); }
      const isShell = /\.(html|js|css|webmanifest)$/.test(file) || rel === '/';
      return serveFile(res, fs.existsSync(file) ? file : path.join(PUBLIC, 'index.html'), isShell ? 'no-cache' : 'public, max-age=86400');
    } catch (err) {
      if (err instanceof AppError) return send(res, err.status, { error: { code: err.code, message: err.message } });
      log('error', err);
      return send(res, 500, { error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } });
    }
  }

  const server = http.createServer(handler);
  // Expire stale requests even when nobody is looking at them.
  const timer = setInterval(() => { try { svc.expireOld(); } catch (e) { log('expire failed', e); } }, 60e3);
  timer.unref();
  server.on('close', () => { clearInterval(timer); try { db.close(); } catch { /* already closed */ } });
  return { server, handler, db, svc, notifier };
}

let appInstance = null;
function getApp() {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = getApp();
  server.listen(port, () => console.log(`Neighbours is running on http://localhost:${port}`));
}

const defaultExport = (req, res) => {
  const { handler } = getApp();
  return handler(req, res);
};

defaultExport.createApp = createApp;
module.exports = defaultExport;
