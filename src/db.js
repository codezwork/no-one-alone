'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

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

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec(SCHEMA);
  // Databases created before typed professions existed get the column added in place.
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'profession_custom')) {
    db.exec('ALTER TABLE users ADD COLUMN profession_custom TEXT');
  }
  return db;
}

const newId = (prefix) => prefix + '_' + crypto.randomBytes(9).toString('base64url');
const newToken = () => crypto.randomBytes(24).toString('base64url');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/** Small helper so every statement is prepared once. */
function statements(db) {
  const cache = new Map();
  return (sql) => {
    let st = cache.get(sql);
    if (!st) { st = db.prepare(sql); cache.set(sql, st); }
    return st;
  };
}

/** Run fn inside a transaction. */
function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

module.exports = { open, newId, newToken, hashToken, statements, tx, getSetting, setSetting };
