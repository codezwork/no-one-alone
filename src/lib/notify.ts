import { getSetting, setSetting, type Database } from './db';

let webpush: any = null;
try {
  webpush = require('web-push');
} catch {
  webpush = null;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body?: string | null;
  refType?: string | null;
  refId?: string | null;
}

export interface Notifier {
  attach: (userId: string, res: any) => void;
  emit: (userId: string, event: string, data: any) => void;
  notify: (userId: string, n: NotificationPayload) => Promise<any>;
  settle: () => Promise<void>;
  subscribe: (userId: string, sub: any) => Promise<boolean>;
  unsubscribe: (userId: string, endpoint: string) => Promise<void>;
  publicKey: () => Promise<string | null>;
  streamCount: () => number;
}

export function createNotifier(db: Database, log: (...args: any[]) => void = () => {}): Notifier {
  const streams = new Map<string, Set<any>>();
  let keys: Promise<string | null> | null = null;
  const pending = new Set<Promise<any>>();

  function ensurePush(): Promise<string | null> {
    if (!webpush) return Promise.resolve(null);
    return (
      keys ||
      (keys = (async () => {
        let publicKey = process.env.VAPID_PUBLIC_KEY || (await getSetting(db, 'vapid_public'));
        let privateKey = process.env.VAPID_PRIVATE_KEY || (await getSetting(db, 'vapid_private'));
        if (!publicKey || !privateKey) {
          const fresh = webpush.generateVAPIDKeys();
          publicKey = fresh.publicKey;
          privateKey = fresh.privateKey;
          await setSetting(db, 'vapid_public', publicKey);
          await setSetting(db, 'vapid_private', privateKey);
        }
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:help@neighbours.invalid',
          publicKey,
          privateKey
        );
        return publicKey;
      })().catch((err) => {
        keys = null;
        log('push keys failed', err);
        return null;
      }))
    );
  }

  function attach(userId: string, res: any) {
    if (!streams.has(userId)) streams.set(userId, new Set());
    streams.get(userId)!.add(res);
    res.on('close', () => {
      const set = streams.get(userId);
      if (set) {
        set.delete(res);
        if (!set.size) streams.delete(userId);
      }
    });
  }

  function emit(userId: string, event: string, data: any) {
    const set = streams.get(userId);
    if (!set) return;
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try {
        res.write(chunk);
      } catch {
        /* stream closed */
      }
    }
  }

  async function push(userId: string, payload: any) {
    if (!(await ensurePush())) return;
    const subs = await db.q('SELECT endpoint, keys FROM push_subs WHERE user_id = ?').all(userId);
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: JSON.parse(s.keys) },
          JSON.stringify(payload),
          { TTL: 3600 }
        );
      } catch (err: any) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await db.q('DELETE FROM push_subs WHERE endpoint = ?').run(s.endpoint);
        } else {
          log('push failed', err?.statusCode, err?.body);
        }
      }
    }
  }

  async function notify(userId: string, n: NotificationPayload) {
    const now = Date.now();
    const info = await db
      .q(
        'INSERT INTO notifications(user_id, type, title, body, ref_type, ref_id, created_at) VALUES(?,?,?,?,?,?,?)'
      )
      .run(userId, n.type, n.title, n.body || null, n.refType || null, n.refId || null, now);
    const row = {
      id: Number(info.lastInsertRowid),
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body || null,
      ref_type: n.refType || null,
      ref_id: n.refId || null,
      read: 0,
      created_at: now,
    };
    emit(userId, 'notification', row);
    const url = n.refType === 'need' ? `/?tab=needs&need=${n.refId}` : n.refType === 'listing' ? `/?tab=trade&listing=${n.refId}` : '/?tab=alerts';
    const p = push(userId, {
      title: n.title,
      body: n.body || '',
      url,
      tag: `${n.refType || 'n'}-${n.refId || row.id}`,
    }).catch(() => {});
    pending.add(p);
    p.finally(() => pending.delete(p));
    return row;
  }

  async function settle() {
    while (pending.size) await Promise.all([...pending]);
  }

  async function subscribe(userId: string, sub: any): Promise<boolean> {
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return false;
    if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return false;
    await db
      .q(
        'INSERT INTO push_subs(endpoint, user_id, keys, created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys'
      )
      .run(sub.endpoint, userId, JSON.stringify({ p256dh: sub.keys.p256dh, auth: sub.keys.auth }), Date.now());
    return true;
  }

  async function unsubscribe(userId: string, endpoint: string): Promise<void> {
    await db.q('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').run(String(endpoint || ''), userId);
  }

  return {
    attach,
    emit,
    notify,
    settle,
    subscribe,
    unsubscribe,
    publicKey: ensurePush,
    streamCount: () => streams.size,
  };
}
