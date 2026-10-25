'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  marital TEXT NOT NULL,
  profession TEXT NOT NULL,
  profession_custom TEXT,          -- what someone typed when they chose "Something else"
  photo TEXT,
  lat REAL, lng REAL, location_at INTEGER, location_manual INTEGER NOT NULL DEFAULT 0,
  radius_km REAL NOT NULL DEFAULT 4,
  helped INTEGER NOT NULL DEFAULT 0,
  thanks INTEGER NOT NULL DEFAULT 0,
  sample INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_loc ON users(lat, lng);

CREATE TABLE IF NOT EXISTS needs (
  id TEXT PRIMARY KEY,
  poster_id TEXT NOT NULL,
  kind TEXT NOT NULL,              -- professional | general
  profession TEXT,                 -- for professional needs
  category TEXT,                   -- for general needs
  title TEXT NOT NULL,
  details TEXT,
  landmark TEXT,                   -- public hint, e.g. "near the temple tank"
  address TEXT,                    -- private: only the poster and the helper see it
  alone INTEGER NOT NULL DEFAULT 0,
  sensitive INTEGER NOT NULL DEFAULT 0,
  lat REAL NOT NULL, lng REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | taken | resolved | cancelled | expired | hidden
  helper_id TEXT,
  created_at INTEGER NOT NULL,
  taken_at INTEGER, resolved_at INTEGER, closed_at INTEGER,
  expires_at INTEGER NOT NULL,
  thanked INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  sample INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS needs_status ON needs(status);
CREATE INDEX IF NOT EXISTS needs_loc ON needs(lat, lng);

-- Everyone who was alerted about a need, so they hear when it is taken and resolved.
CREATE TABLE IF NOT EXISTS need_audience (
  need_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY (need_id, user_id)
);

CREATE TABLE IF NOT EXISTS need_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  need_id TEXT NOT NULL, type TEXT NOT NULL, actor_id TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS need_events_need ON need_events(need_id);

-- thread = 'need:<id>' or 'listing:<id>:<buyerId>'
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread TEXT NOT NULL, sender_id TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages(thread);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  item_condition TEXT,
  price INTEGER,                   -- rupees; NULL means free
  description TEXT,
  photo TEXT,
  lat REAL NOT NULL, lng REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',  -- available | reserved | sold | withdrawn | hidden
  buyer_id TEXT,
  created_at INTEGER NOT NULL, sold_at INTEGER,
  reports INTEGER NOT NULL DEFAULT 0,
  sample INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS listings_loc ON listings(lat, lng);

CREATE TABLE IF NOT EXISTS listing_requests (
  listing_id TEXT NOT NULL, buyer_id TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL,
  PRIMARY KEY (listing_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  ref_type TEXT, ref_id TEXT, read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, keys TEXT NOT NULL, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  ref_type TEXT NOT NULL, ref_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT, created_at INTEGER NOT NULL,
  PRIMARY KEY (ref_type, ref_id, user_id)
);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/**
 * Opens the database. In production this is a Turso (libSQL) database reached over HTTP,
 * which suits Vercel's short-lived functions; locally it is a SQLite file; tests use memory.
 *   TURSO_DATABASE_URL=libsql://<db>.turso.io  TURSO_AUTH_TOKEN=<token>
 * Returns a small async API: q(sql).get/all/run(...args), batch(statements), exec(sql).
 */
function open(target) {
  // ':memory:' (the tests) always stays local, even when Turso is configured.
  const url = target === ':memory:' ? ':memory:' : process.env.TURSO_DATABASE_URL || 'file:' + target;
  const local = url === ':memory:' || url.startsWith('file:');
  if (url.startsWith('file:')) fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  if (local && process.env.VERCEL) console.warn('TURSO_DATABASE_URL is not set: data will be lost when this instance stops.');
  // A remote database only needs the HTTP client, which skips the native SQLite binary and starts faster.
  const { createClient } = require(local ? '@libsql/client' : '@libsql/client/web');
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  const where = local ? (url === ':memory:' ? 'in memory' : url.slice(5)) : url.replace(/^libsql:\/\//, '');

  const plain = (rs) => rs.rows.map((row) => Object.fromEntries(rs.columns.map((c) => [c, row[c]])));
  let ready = null;
  const init = () => ready || (ready = (async () => {
    await client.executeMultiple(SCHEMA);
    // Databases created before typed professions existed get the column added in place.
    const cols = plain(await client.execute('PRAGMA table_info(users)'));
    if (!cols.some((c) => c.name === 'profession_custom')) await client.execute('ALTER TABLE users ADD COLUMN profession_custom TEXT');
  })().catch((err) => { ready = null; throw err; }));

  const run = async (sql, args) => { await init(); return client.execute({ sql, args: args.map((a) => (a === undefined ? null : a)) }); };
  const q = (sql) => ({
    get: async (...args) => plain(await run(sql, args))[0],
    all: async (...args) => plain(await run(sql, args)),
    run: async (...args) => { const rs = await run(sql, args); return { changes: rs.rowsAffected, lastInsertRowid: Number(rs.lastInsertRowid ?? 0) }; }
  });
  /** Several writes that succeed or fail together. */
  const batch = async (stmts) => { await init(); return client.batch(stmts.map(([sql, args]) => ({ sql, args })), 'write'); };
  return { q, batch, ready: init, where, remote: !local, close: () => client.close() };
}

const newId = (prefix) => prefix + '_' + crypto.randomBytes(9).toString('base64url');
const newToken = () => crypto.randomBytes(24).toString('base64url');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

async function getSetting(db, key) {
  const row = await db.q('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
async function setSetting(db, key, value) {
  await db.q('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

module.exports = { open, newId, newToken, hashToken, getSetting, setSetting };
