// Turso (libSQL) database connection helper for Next.js App Router
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient as createWebClient, type Client as WebClient } from '@libsql/client/web';
import { createClient as createNodeClient, type Client as NodeClient } from '@libsql/client';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  marital TEXT NOT NULL,
  profession TEXT NOT NULL,
  profession_custom TEXT,
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
  kind TEXT NOT NULL,
  profession TEXT,
  category TEXT,
  title TEXT NOT NULL,
  details TEXT,
  landmark TEXT,
  address TEXT,
  alone INTEGER NOT NULL DEFAULT 0,
  sensitive INTEGER NOT NULL DEFAULT 0,
  lat REAL NOT NULL, lng REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
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

CREATE TABLE IF NOT EXISTS need_audience (
  need_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY (need_id, user_id)
);

CREATE TABLE IF NOT EXISTS need_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  need_id TEXT NOT NULL, type TEXT NOT NULL, actor_id TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS need_events_need ON need_events(need_id);

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
  price INTEGER,
  description TEXT,
  photo TEXT,
  lat REAL NOT NULL, lng REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
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

export type Database = {
  q: (sql: string) => {
    get: (...args: any[]) => Promise<any>;
    all: (...args: any[]) => Promise<any[]>;
    run: (...args: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
  };
  batch: (stmts: [string, any[]][]) => Promise<any>;
  ready: () => Promise<void>;
  where: string;
  remote: boolean;
  close: () => void;
};

let globalDb: Database | null = null;

export function openDb(target?: string): Database {
  const url = target === ':memory:'
    ? ':memory:'
    : process.env.TURSO_DATABASE_URL || 'file:' + (target || path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'neighbours.db'));
  
  const local = url === ':memory:' || url.startsWith('file:');
  if (url.startsWith('file:')) {
    try {
      fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
    } catch { /* directory exists */ }
  }

  const client: WebClient | NodeClient = local
    ? createNodeClient({ url })
    : createWebClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

  const where = local ? (url === ':memory:' ? 'in memory' : url.slice(5)) : url.replace(/^libsql:\/\//, '');

  const plain = (rs: any) =>
    rs.rows.map((row: any) =>
      Object.fromEntries(rs.columns.map((c: string) => [c, row[c]]))
    );

  let ready: Promise<void> | null = null;
  const init = () =>
    ready ||
    (ready = (async () => {
      await client.executeMultiple(SCHEMA);
      const cols = plain(await client.execute('PRAGMA table_info(users)'));
      if (!cols.some((c: any) => c.name === 'profession_custom')) {
        await client.execute('ALTER TABLE users ADD COLUMN profession_custom TEXT');
      }
    })().catch((err) => {
      ready = null;
      throw err;
    }));

  const run = async (sql: string, args: any[]) => {
    await init();
    return client.execute({
      sql,
      args: args.map((a) => (a === undefined ? null : a)),
    });
  };

  const q = (sql: string) => ({
    get: async (...args: any[]) => plain(await run(sql, args))[0],
    all: async (...args: any[]) => plain(await run(sql, args)),
    run: async (...args: any[]) => {
      const rs = await run(sql, args);
      return {
        changes: rs.rowsAffected,
        lastInsertRowid: Number(rs.lastInsertRowid ?? 0),
      };
    },
  });

  const batch = async (stmts: [string, any[]][]) => {
    await init();
    return (client as any).batch(
      stmts.map(([sql, args]) => ({ sql, args: args.map((a) => (a === undefined ? null : a)) })),
      'write'
    );
  };

  return {
    q,
    batch,
    ready: init,
    where,
    remote: !local,
    close: () => client.close(),
  };
}

export function getDb(): Database {
  if (!globalDb) {
    globalDb = openDb();
  }
  return globalDb;
}

export const newId = (prefix: string) => prefix + '_' + crypto.randomBytes(9).toString('base64url');
export const newToken = () => crypto.randomBytes(24).toString('base64url');
export const hashToken = (t: string) => crypto.createHash('sha256').update(String(t)).digest('hex');

export async function getSetting(db: Database, key: string): Promise<string | null> {
  const row = await db.q('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db
    .q('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}
