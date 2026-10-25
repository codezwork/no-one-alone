'use strict';
const R = require('./rules');
const { newId, newToken, hashToken, statements, tx } = require('./db');

class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new AppError(status, code, message); };

const oneLine = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const multiLine = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'Someone';
const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null);
const label = (list, id) => (list.find((x) => x.id === id) || {}).label || '';
const MAX_RADIUS = R.MAX_RADIUS_KM;
const professionLabel = (u) => (u.profession === 'other' && u.profession_custom ? u.profession_custom : label(R.PROFESSIONS, u.profession));
const DAY = 24 * 60 * 60 * 1000;

function validPhoto(p) {
  if (p == null || p === '') return null;
  if (typeof p !== 'string' || p.length > 400000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p)) {
    fail(400, 'bad_photo', 'Photos must be JPEG, PNG or WebP images under 300 KB.');
  }
  return p;
}
function validLocation(body) {
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    fail(400, 'bad_location', 'That location isn’t valid. Turn on location or pick your spot on the map.');
  }
  return { lat, lng };
}

function createService(db, notifier, opts = {}) {
  const q = statements(db);
  const now = opts.now || (() => Date.now());

  // ---------------------------------------------------------------- users
  function profileInput(body, partial) {
    const out = {};
    if (!partial || body.name !== undefined) {
      out.name = oneLine(body.name, 60);
      if (out.name.length < 2) fail(400, 'bad_name', 'Please enter your name.');
    }
    if (!partial || body.age !== undefined) {
      const age = Number(body.age);
      if (!Number.isInteger(age) || age > R.MAX_AGE) fail(400, 'bad_age', 'Please enter your age in years.');
      if (age < R.MIN_SIGNUP_AGE) fail(400, 'too_young', `You need to be ${R.MIN_SIGNUP_AGE} or older to use Neighbours. Ask an adult to post for you, or call 1098 (CHILDLINE).`);
      out.age = age;
    }
    if (!partial || body.gender !== undefined) {
      if (!R.GENDERS.includes(body.gender)) fail(400, 'bad_gender', 'Please choose a gender.');
      out.gender = body.gender;
    }
    if (!partial || body.marital !== undefined) {
      if (!R.MARITAL.includes(body.marital)) fail(400, 'bad_marital', 'Please choose married or unmarried.');
      out.marital = body.marital;
    }
    if (!partial || body.profession !== undefined) {
      if (!R.professionIds.has(body.profession)) fail(400, 'bad_profession', 'Please choose a profession.');
      out.profession = body.profession;
      out.profession_custom = null;
      if (body.profession === 'other') {
        const custom = R.formatCustomProfession(body.professionOther);
        if (custom.length < 2) fail(400, 'bad_profession_other', 'Tell us what you do, in a few words.');
        const listed = R.matchProfession(custom);
        if (listed) out.profession = listed; else out.profession_custom = custom;
      }
    }
    if (body.photo !== undefined) out.photo = validPhoto(body.photo);
    if (body.radiusKm !== undefined) {
      const r = Number(body.radiusKm);
      if (!Number.isInteger(r) || r < R.MIN_RADIUS_KM || r > R.MAX_RADIUS_KM) fail(400, 'bad_radius', `Choose a radius between ${R.MIN_RADIUS_KM} and ${R.MAX_RADIUS_KM} km.`);
      out.radius_km = r;
    }
    return out;
  }

  const getUser = (id) => q('SELECT * FROM users WHERE id = ?').get(id);

  function me(u) {
    return {
      id: u.id, name: u.name, age: u.age, gender: u.gender, marital: u.marital, profession: u.profession,
      professionLabel: professionLabel(u), professionOther: u.profession_custom || null, photo: u.photo || null,
      lat: u.lat, lng: u.lng, locationAt: u.location_at, locationManual: !!u.location_manual,
      radiusKm: u.radius_km, helped: u.helped, thanks: u.thanks, createdAt: u.created_at,
      canOfferGeneralHelp: u.age >= R.GENERAL_HELP_MIN_AGE, canHelp: u.age >= R.HELPER_MIN_AGE
    };
  }

  function signup(body) {
    const p = profileInput(body || {}, false);
    const token = newToken();
    const id = newId('u');
    q(`INSERT INTO users(id, token_hash, name, age, gender, marital, profession, profession_custom, photo, radius_km, sample, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, hashToken(token), p.name, p.age, p.gender, p.marital, p.profession, p.profession_custom,
      p.photo ?? null, p.radius_km ?? R.DEFAULT_RADIUS_KM, body.sample ? 1 : 0, now());
    if (body.lat != null && body.lng != null) updateLocation(getUser(id), body);
    return { token, user: me(getUser(id)) };
  }

  function signin(code) {
    const u = q('SELECT * FROM users WHERE token_hash = ?').get(hashToken(oneLine(code, 200)));
    if (!u) fail(401, 'bad_code', 'That recovery code doesn’t match an account. Check it and try again.');
    return { token: oneLine(code, 200), user: me(u) };
  }

  function auth(token) {
    if (!token) return null;
    return q('SELECT * FROM users WHERE token_hash = ?').get(hashToken(token)) || null;
  }

  function updateProfile(user, body) {
    const p = profileInput(body || {}, true);
    const keys = Object.keys(p);
    if (keys.length) {
      q(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => p[k]), user.id);
    }
    const fresh = getUser(user.id);
    if (p.radius_km !== undefined || p.profession !== undefined || p.age !== undefined) alertNewlyInRange(fresh);
    return me(fresh);
  }

  function deleteAccount(user) {
    tx(db, () => {
      const t = now();
      q("UPDATE needs SET status = 'cancelled', closed_at = ? WHERE poster_id = ? AND status IN ('open','taken')").run(t, user.id);
      q("UPDATE needs SET status = 'open', helper_id = NULL, taken_at = NULL WHERE helper_id = ? AND status = 'taken'").run(user.id);
      q("UPDATE listings SET status = 'withdrawn' WHERE seller_id = ? AND status IN ('available','reserved')").run(user.id);
      q("UPDATE listings SET status = 'available', buyer_id = NULL WHERE buyer_id = ? AND status = 'reserved'").run(user.id);
      q('DELETE FROM listing_requests WHERE buyer_id = ?').run(user.id);
      q('DELETE FROM notifications WHERE user_id = ?').run(user.id);
      q('DELETE FROM push_subs WHERE user_id = ?').run(user.id);
      q('DELETE FROM need_audience WHERE user_id = ?').run(user.id);
      q('DELETE FROM users WHERE id = ?').run(user.id);
    });
    return { ok: true };
  }

  /** Save a new position and alert the person about open needs that are now in range. */
  function updateLocation(user, body) {
    const loc = validLocation(body || {});
    q('UPDATE users SET lat = ?, lng = ?, location_at = ?, location_manual = ? WHERE id = ?')
      .run(loc.lat, loc.lng, now(), body.manual ? 1 : 0, user.id);
    const fresh = getUser(user.id);
    const alerted = alertNewlyInRange(fresh);
    return { user: me(fresh), alerted };
  }

  function alertNewlyInRange(user) {
    if (!R.hasLocation(user)) return 0;
    const box = R.boundingBox(user, user.radius_km || R.DEFAULT_RADIUS_KM);
    const rows = q(`SELECT n.* FROM needs n
      WHERE n.status = 'open' AND n.expires_at > ? AND n.lat BETWEEN ? AND ? AND n.lng BETWEEN ? AND ?
      AND NOT EXISTS (SELECT 1 FROM need_audience a WHERE a.need_id = n.id AND a.user_id = ?)`)
      .all(now(), box.minLat, box.maxLat, box.minLng, box.maxLng, user.id);
    let count = 0;
    for (const need of rows) {
      if (!R.canHelp(user, need).ok || !R.inRange(user, need)) continue;
      addAudience(need, user);
      count++;
    }
    return count;
  }

  // ---------------------------------------------------------------- needs
  const needRow = (id) => q('SELECT * FROM needs WHERE id = ?').get(String(id));
  const event = (needId, type, actorId) => q('INSERT INTO need_events(need_id, type, actor_id, created_at) VALUES(?,?,?,?)').run(needId, type, actorId || null, now());
  const audienceIds = (needId) => q('SELECT user_id FROM need_audience WHERE need_id = ?').all(needId).map((r) => r.user_id);
  const inAudience = (needId, userId) => !!q('SELECT 1 AS x FROM need_audience WHERE need_id = ? AND user_id = ?').get(needId, userId);

  function needHeadline(need) {
    return need.kind === 'professional'
      ? `${label(R.PROFESSIONS, need.profession)} needed nearby`
      : `Help needed nearby: ${label(R.GENERAL_HELP, need.category).toLowerCase()}`;
  }

  function addAudience(need, user) {
    q('INSERT OR IGNORE INTO need_audience(need_id, user_id, created_at) VALUES(?,?,?)').run(need.id, user.id, now());
    const d = round1(R.distanceKm(user, need));
    notifier.notify(user.id, { type: 'need_new', title: needHeadline(need), body: `${need.title} · ${d} km from you`, refType: 'need', refId: need.id });
  }

  /** People who should be alerted about a need: in range, and allowed by the routing and safety rules. */
  function eligibleNearby(need, exclude) {
    const box = R.boundingBox(need, MAX_RADIUS);
    return q('SELECT * FROM users WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?')
      .all(box.minLat, box.maxLat, box.minLng, box.maxLng)
      .filter((u) => !exclude.has(u.id) && R.canHelp(u, need).ok && R.inRange(u, need));
  }

  function expireOld() {
    const t = now();
    const rows = q("SELECT id, poster_id, title FROM needs WHERE status = 'open' AND expires_at < ?").all(t);
    for (const r of rows) {
      q("UPDATE needs SET status = 'expired', closed_at = ? WHERE id = ? AND status = 'open'").run(t, r.id);
      event(r.id, 'expired', null);
      notifier.notify(r.poster_id, { type: 'need_expired', title: 'Your request expired',
        body: `Nobody took “${r.title}” within 24 hours. Post it again if you still need help.`, refType: 'need', refId: r.id });
    }
  }

  function needInput(user, body) {
    const kind = body.kind;
    if (kind !== 'professional' && kind !== 'general') fail(400, 'bad_kind', 'Choose a professional or general help.');
    const out = { kind, profession: null, category: null };
    if (kind === 'professional') {
      if (!R.requestableIds.has(body.profession)) fail(400, 'bad_profession', 'Choose which professional you need.');
      out.profession = body.profession;
    } else {
      if (!R.generalIds.has(body.category)) fail(400, 'bad_category', 'Choose what kind of help you need.');
      out.category = body.category;
    }
    out.title = oneLine(body.title, 80) || (kind === 'professional' ? `Need a ${label(R.PROFESSIONS, out.profession).toLowerCase()}` : label(R.GENERAL_HELP, out.category));
    out.details = multiLine(body.details, 600);
    out.landmark = oneLine(body.landmark, 80);
    out.address = multiLine(body.address, 200);
    out.alone = body.alone ? 1 : 0;
    const loc = body.lat != null && body.lng != null ? validLocation(body) : (R.hasLocation(user) ? { lat: user.lat, lng: user.lng } : null);
    if (!loc) fail(400, 'no_location', 'Turn on location or pick your spot on the map before posting.');
    out.lat = loc.lat; out.lng = loc.lng;
    return out;
  }

  function previewAudience(user, body) {
    const n = needInput(user, { ...body, title: body.title || 'preview' });
    const pseudo = { id: '_preview', poster_id: user.id, ...n, sensitive: R.isSensitivePoster(user) ? 1 : 0 };
    return { count: eligibleNearby(pseudo, new Set([user.id])).length, sensitive: !!pseudo.sensitive };
  }

  function postNeed(user, body) {
    const n = needInput(user, body || {});
    const id = newId('n');
    const t = now();
    const sensitive = R.isSensitivePoster(user) ? 1 : 0;
    q(`INSERT INTO needs(id, poster_id, kind, profession, category, title, details, landmark, address, alone, sensitive, lat, lng, created_at, expires_at, sample)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, user.id, n.kind, n.profession, n.category, n.title, n.details, n.landmark,
      n.address, n.alone, sensitive, n.lat, n.lng, t, t + R.NEED_LIFETIME_MS, body.sample ? 1 : 0);
    event(id, 'posted', user.id);
    const need = needRow(id);
    const audience = eligibleNearby(need, new Set([user.id]));
    for (const u of audience) addAudience(need, u);
    return { need: needView(user, need), alerted: audience.length };
  }

  function person(id, withPhoto) {
    if (!id) return null;
    const u = getUser(id);
    if (!u) return { id, firstName: 'Someone', photo: null, professionLabel: '' };
    return { id: u.id, firstName: firstName(u.name), photo: withPhoto ? (u.photo || null) : null, professionLabel: professionLabel(u) };
  }

  function needView(viewer, need) {
    const role = need.poster_id === viewer.id ? 'poster' : need.helper_id === viewer.id ? 'helper' : 'viewer';
    const party = role !== 'viewer';
    const check = R.canHelp(viewer, need);
    return {
      id: need.id, kind: need.kind, profession: need.profession, professionLabel: label(R.PROFESSIONS, need.profession),
      category: need.category, categoryLabel: label(R.GENERAL_HELP, need.category),
      title: need.title, details: need.details, landmark: need.landmark,
      address: party ? need.address : null,
      alone: !!need.alone, restricted: !!need.sensitive,
      status: need.status, distanceKm: round1(R.distanceKm(viewer, need)),
      createdAt: need.created_at, takenAt: need.taken_at, resolvedAt: need.resolved_at, closedAt: need.closed_at, expiresAt: need.expires_at,
      thanked: !!need.thanked, sample: !!need.sample,
      poster: person(need.poster_id, party),
      helper: person(need.helper_id, true),
      role,
      canTake: need.status === 'open' && check.ok && R.inRange(viewer, need),
      refusal: check.ok ? (R.inRange(viewer, need) ? null : 'This request is outside your area.') : R.REFUSAL_TEXT[check.reason],
      alertedCount: role === 'poster' ? audienceIds(need.id).length : undefined
    };
  }

  function canViewNeed(user, need) {
    return need.poster_id === user.id || need.helper_id === user.id || inAudience(need.id, user.id) || R.canSeeNeed(user, need);
  }

  function getNeed(user, id) {
    expireOld();
    const need = needRow(id);
    if (!need || !canViewNeed(user, need) || (need.status === 'hidden' && need.poster_id !== user.id)) fail(404, 'not_found', 'This request isn’t available.');
    const view = needView(user, need);
    const events = q('SELECT type, actor_id, created_at FROM need_events WHERE need_id = ? ORDER BY id').all(need.id)
      .map((e) => ({ type: e.type, at: e.created_at, actor: e.actor_id ? person(e.actor_id, false).firstName : null }));
    const messages = view.role === 'viewer' ? [] : threadMessages(`need:${need.id}`, user);
    return { need: view, events, messages };
  }

  function listNeeds(user) {
    expireOld();
    const mine = q('SELECT * FROM needs WHERE poster_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 50').all(user.id, now() - 30 * DAY);
    const helping = q("SELECT * FROM needs WHERE helper_id = ? AND (status = 'taken' OR resolved_at > ?) ORDER BY taken_at DESC LIMIT 50").all(user.id, now() - 7 * DAY);
    let open = [];
    let community = [];
    if (R.hasLocation(user)) {
      const box = R.boundingBox(user, user.radius_km || R.DEFAULT_RADIUS_KM);
      open = q("SELECT * FROM needs WHERE status = 'open' AND poster_id != ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?")
        .all(user.id, box.minLat, box.maxLat, box.minLng, box.maxLng)
        .filter((n) => R.canSeeNeed(user, n))
        .sort((a, b) => R.distanceKm(user, a) - R.distanceKm(user, b));
    }
    // Needs this person was alerted about that someone has since taken or resolved: the street's thank-you board.
    community = q(`SELECT n.* FROM needs n JOIN need_audience a ON a.need_id = n.id
      WHERE a.user_id = ? AND n.status IN ('taken','resolved') AND n.helper_id IS NOT NULL AND n.helper_id != ?
      AND COALESCE(n.resolved_at, n.taken_at) > ? ORDER BY COALESCE(n.resolved_at, n.taken_at) DESC LIMIT 30`)
      .all(user.id, user.id, now() - DAY);
    return {
      mine: mine.map((n) => needView(user, n)),
      helping: helping.map((n) => needView(user, n)),
      open: open.map((n) => needView(user, n)),
      community: community.map((n) => needView(user, n)),
      stats: communityStats(user)
    };
  }

  function communityStats(user) {
    if (!R.hasLocation(user)) return { metToday: 0, helpersNearby: 0 };
    const box = R.boundingBox(user, user.radius_km || R.DEFAULT_RADIUS_KM);
    const met = q("SELECT lat, lng FROM needs WHERE status = 'resolved' AND resolved_at > ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?")
      .all(now() - DAY, box.minLat, box.maxLat, box.minLng, box.maxLng).filter((n) => R.inRange(user, n)).length;
    const helpers = q('SELECT lat, lng FROM users WHERE id != ? AND age >= ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?')
      .all(user.id, R.HELPER_MIN_AGE, box.minLat, box.maxLat, box.minLng, box.maxLng).filter((u) => R.inRange(user, u)).length;
    return { metToday: met, helpersNearby: helpers };
  }

  function refreshNeed(need) {
    const ids = new Set([need.poster_id, need.helper_id, ...audienceIds(need.id)].filter(Boolean));
    for (const id of ids) notifier.emit(id, 'refresh', { refType: 'need', refId: need.id });
  }

  function takeNeed(user, id) {
    expireOld();
    const need = needRow(id);
    if (!need || !canViewNeed(user, need)) fail(404, 'not_found', 'This request isn’t available.');
    const check = R.canHelp(user, need);
    if (!check.ok) fail(403, check.reason, R.REFUSAL_TEXT[check.reason]);
    if (!R.inRange(user, need)) fail(403, 'out_of_range', 'This request is outside your area.');
    const t = now();
    const res = q("UPDATE needs SET status = 'taken', helper_id = ?, taken_at = ? WHERE id = ? AND status = 'open'").run(user.id, t, need.id);
    if (res.changes !== 1) {
      const cur = needRow(need.id);
      fail(409, 'not_open', cur.status === 'taken' ? `${person(cur.helper_id).firstName} has already taken this.` : 'This request is no longer open.');
    }
    event(need.id, 'taken', user.id);
    const fresh = needRow(need.id);
    const helper = firstName(user.name);
    notifier.notify(need.poster_id, { type: 'need_taken', title: `${helper} is coming to help`, body: `${need.title}. Share your address and any details in the chat.`, refType: 'need', refId: need.id });
    for (const uid of audienceIds(need.id)) {
      if (uid === user.id) continue;
      notifier.notify(uid, { type: 'need_taken_other', title: `Taken care of by ${helper}`, body: `${need.title}. Thank you, ${helper}.`, refType: 'need', refId: need.id });
    }
    refreshNeed(fresh);
    return getNeed(user, need.id);
  }

  function releaseNeed(user, id) {
    const need = needRow(id);
    if (!need || need.helper_id !== user.id || need.status !== 'taken') fail(409, 'not_helper', 'You aren’t helping with this request.');
    q("UPDATE needs SET status = 'open', helper_id = NULL, taken_at = NULL WHERE id = ?").run(need.id);
    event(need.id, 'released', user.id);
    const helper = firstName(user.name);
    notifier.notify(need.poster_id, { type: 'need_released', title: `${helper} can’t make it`, body: `Your request “${need.title}” is open again and nearby helpers can see it.`, refType: 'need', refId: need.id });
    for (const uid of audienceIds(need.id)) {
      if (uid === user.id) continue;
      notifier.notify(uid, { type: 'need_reopened', title: 'Open again: someone still needs help', body: need.title, refType: 'need', refId: need.id });
    }
    refreshNeed(needRow(need.id));
    return getNeed(user, need.id);
  }

  function resolveNeed(user, id) {
    const need = needRow(id);
    if (!need) fail(404, 'not_found', 'This request isn’t available.');
    const isPoster = need.poster_id === user.id, isHelper = need.helper_id === user.id;
    if (!isPoster && !isHelper) fail(403, 'not_party', 'Only the person who asked or their helper can mark this resolved.');
    if (!(need.status === 'taken' || (need.status === 'open' && isPoster))) fail(409, 'not_active', 'This request is already closed.');
    const t = now();
    q("UPDATE needs SET status = 'resolved', resolved_at = ?, closed_at = ? WHERE id = ?").run(t, t, need.id);
    if (need.helper_id) q('UPDATE users SET helped = helped + 1 WHERE id = ?').run(need.helper_id);
    event(need.id, 'resolved', user.id);
    const helperName = need.helper_id ? person(need.helper_id).firstName : null;
    if (isHelper) {
      notifier.notify(need.poster_id, { type: 'need_resolved', title: `${helperName} marked your request resolved`, body: `${need.title}. You can thank ${helperName} from the request.`, refType: 'need', refId: need.id });
    } else if (need.helper_id) {
      notifier.notify(need.helper_id, { type: 'need_resolved', title: 'Resolved. Thank you for helping', body: `${firstName(user.name)} marked “${need.title}” resolved.`, refType: 'need', refId: need.id });
    }
    for (const uid of audienceIds(need.id)) {
      if (uid === need.helper_id || uid === need.poster_id) continue;
      notifier.notify(uid, { type: 'need_resolved_other', title: helperName ? `Resolved, thanks to ${helperName}` : 'Resolved: no longer needed',
        body: need.title, refType: 'need', refId: need.id });
    }
    refreshNeed(needRow(need.id));
    return getNeed(user, need.id);
  }

  function cancelNeed(user, id) {
    const need = needRow(id);
    if (!need || need.poster_id !== user.id) fail(403, 'not_poster', 'Only the person who asked can cancel this request.');
    if (!['open', 'taken'].includes(need.status)) fail(409, 'not_active', 'This request is already closed.');
    q("UPDATE needs SET status = 'cancelled', closed_at = ? WHERE id = ?").run(now(), need.id);
    event(need.id, 'cancelled', user.id);
    for (const uid of new Set([need.helper_id, ...audienceIds(need.id)].filter(Boolean))) {
      notifier.notify(uid, { type: 'need_cancelled', title: 'No longer needed', body: `${firstName(user.name)} cancelled “${need.title}”.`, refType: 'need', refId: need.id });
    }
    refreshNeed(needRow(need.id));
    return getNeed(user, need.id);
  }

  function thankHelper(user, id) {
    const need = needRow(id);
    if (!need || need.poster_id !== user.id) fail(403, 'not_poster', 'Only the person who asked can send thanks.');
    if (need.status !== 'resolved' || !need.helper_id) fail(409, 'not_resolved', 'You can thank your helper once the request is resolved.');
    if (need.thanked) return getNeed(user, need.id);
    q('UPDATE needs SET thanked = 1 WHERE id = ?').run(need.id);
    q('UPDATE users SET thanks = thanks + 1 WHERE id = ?').run(need.helper_id);
    event(need.id, 'thanked', user.id);
    notifier.notify(need.helper_id, { type: 'thanks', title: `${firstName(user.name)} thanked you`, body: `For helping with “${need.title}”.`, refType: 'need', refId: need.id });
    refreshNeed(needRow(need.id));
    return getNeed(user, need.id);
  }

  function postNeedMessage(user, id, body) {
    const need = needRow(id);
    if (!need || (need.poster_id !== user.id && need.helper_id !== user.id)) fail(403, 'not_party', 'Only the person who asked and their helper can chat here.');
    if (!need.helper_id) fail(409, 'no_helper', 'You can chat once someone takes the request.');
    const text = multiLine(body && body.body, 1000);
    if (!text) fail(400, 'empty', 'Write a message first.');
    q('INSERT INTO messages(thread, sender_id, body, created_at) VALUES(?,?,?,?)').run(`need:${need.id}`, user.id, text, now());
    const other = need.poster_id === user.id ? need.helper_id : need.poster_id;
    notifier.notify(other, { type: 'message', title: `Message from ${firstName(user.name)}`, body: text.slice(0, 140), refType: 'need', refId: need.id });
    notifier.emit(user.id, 'refresh', { refType: 'need', refId: need.id });
    return getNeed(user, need.id);
  }

  function threadMessages(thread, viewer) {
    return q('SELECT sender_id, body, created_at FROM messages WHERE thread = ? ORDER BY id').all(thread)
      .map((m) => ({ mine: m.sender_id === viewer.id, from: person(m.sender_id).firstName, body: m.body, at: m.created_at }));
  }

  // ---------------------------------------------------------------- reports
  function report(user, refType, id, reason) {
    const table = refType === 'need' ? 'needs' : refType === 'listing' ? 'listings' : null;
    if (!table) fail(400, 'bad_ref', 'Unknown item.');
    const row = q(`SELECT * FROM ${table} WHERE id = ?`).get(String(id));
    const owner = row && (row.poster_id || row.seller_id);
    if (!row || owner === user.id) fail(404, 'not_found', 'This item isn’t available.');
    const ins = q('INSERT OR IGNORE INTO reports(ref_type, ref_id, user_id, reason, created_at) VALUES(?,?,?,?,?)').run(refType, row.id, user.id, oneLine(reason, 200), now());
    if (ins.changes === 1) {
      q(`UPDATE ${table} SET reports = reports + 1 WHERE id = ?`).run(row.id);
      const fresh = q(`SELECT * FROM ${table} WHERE id = ?`).get(row.id);
      if (fresh.reports >= R.REPORTS_TO_HIDE && !['hidden', 'resolved', 'sold', 'cancelled', 'expired', 'withdrawn'].includes(fresh.status)) {
        q(`UPDATE ${table} SET status = 'hidden' WHERE id = ?`).run(row.id);
        notifier.notify(owner, { type: 'hidden', title: 'Your post was hidden', body: `Several neighbours reported “${row.title}”, so it is no longer shown.`, refType, refId: row.id });
      }
    }
    return { ok: true };
  }

  // ---------------------------------------------------------------- trade
  const listingRow = (id) => q('SELECT * FROM listings WHERE id = ?').get(String(id));

  function listingInput(user, body) {
    const title = oneLine(body.title, 80);
    if (title.length < 2) fail(400, 'bad_title', 'Say what you are offering.');
    if (!R.tradeIds.has(body.category)) fail(400, 'bad_category', 'Choose a category.');
    const condition = ['new', 'good', 'used'].includes(body.condition) ? body.condition : 'good';
    let price = null;
    if (!body.free) {
      price = Number(body.price);
      if (!Number.isInteger(price) || price < 1 || price > 100000) fail(400, 'bad_price', 'Enter a price in rupees, or mark it free.');
    }
    const loc = body.lat != null && body.lng != null ? validLocation(body) : (R.hasLocation(user) ? { lat: user.lat, lng: user.lng } : null);
    if (!loc) fail(400, 'no_location', 'Turn on location or pick your spot on the map before listing.');
    return { title, category: body.category, condition, price, description: multiLine(body.description, 500), photo: validPhoto(body.photo), ...loc };
  }

  function postListing(user, body) {
    const l = listingInput(user, body || {});
    const id = newId('l');
    q(`INSERT INTO listings(id, seller_id, title, category, item_condition, price, description, photo, lat, lng, created_at, sample)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, user.id, l.title, l.category, l.condition, l.price, l.description, l.photo, l.lat, l.lng, now(), body.sample ? 1 : 0);
    return getListing(user, id);
  }

  function listingView(viewer, l) {
    const role = l.seller_id === viewer.id ? 'seller' : l.buyer_id === viewer.id ? 'buyer' : 'viewer';
    const myRequest = role !== 'seller' && !!q('SELECT 1 AS x FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').get(l.id, viewer.id);
    return {
      id: l.id, title: l.title, category: l.category, categoryLabel: label(R.TRADE_CATEGORIES, l.category), condition: l.item_condition,
      price: l.price, free: l.price == null, description: l.description, photo: l.photo || null, status: l.status,
      distanceKm: round1(R.distanceKm(viewer, l)), createdAt: l.created_at, soldAt: l.sold_at, sample: !!l.sample,
      seller: person(l.seller_id, true), buyer: role !== 'viewer' ? person(l.buyer_id, false) : null,
      role, myRequest,
      requestCount: role === 'seller' ? q('SELECT COUNT(*) AS c FROM listing_requests WHERE listing_id = ?').get(l.id).c : undefined
    };
  }

  function listListings(user) {
    let nearby = [];
    if (R.hasLocation(user)) {
      const box = R.boundingBox(user, user.radius_km || R.DEFAULT_RADIUS_KM);
      nearby = q("SELECT * FROM listings WHERE status IN ('available','reserved') AND seller_id != ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?")
        .all(user.id, box.minLat, box.maxLat, box.minLng, box.maxLng)
        .filter((l) => R.canSeeListing(user, l))
        .sort((a, b) => (a.status === b.status ? R.distanceKm(user, a) - R.distanceKm(user, b) : a.status === 'available' ? -1 : 1));
    }
    const mine = q("SELECT * FROM listings WHERE seller_id = ? AND status != 'withdrawn' ORDER BY created_at DESC LIMIT 50").all(user.id);
    const requested = q(`SELECT l.* FROM listings l JOIN listing_requests r ON r.listing_id = l.id
      WHERE r.buyer_id = ? AND l.status IN ('available','reserved','sold') ORDER BY r.created_at DESC LIMIT 50`).all(user.id);
    return { nearby: nearby.map((l) => listingView(user, l)), mine: mine.map((l) => listingView(user, l)), requested: requested.map((l) => listingView(user, l)) };
  }

  function canViewListing(user, l) {
    return l.seller_id === user.id || l.buyer_id === user.id ||
      !!q('SELECT 1 AS x FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').get(l.id, user.id) || R.canSeeListing(user, l);
  }

  function getListing(user, id) {
    const l = listingRow(id);
    if (!l || !canViewListing(user, l) || (['hidden', 'withdrawn'].includes(l.status) && l.seller_id !== user.id)) fail(404, 'not_found', 'This listing isn’t available.');
    const view = listingView(user, l);
    let requests = [];
    let threads = [];
    if (view.role === 'seller') {
      requests = q('SELECT buyer_id, note, created_at FROM listing_requests WHERE listing_id = ? ORDER BY created_at').all(l.id)
        .map((r) => ({ buyer: person(r.buyer_id, false), note: r.note, at: r.created_at, accepted: r.buyer_id === l.buyer_id }));
      threads = requests.map((r) => ({ buyer: r.buyer, messages: threadMessages(`listing:${l.id}:${r.buyer.id}`, user) }));
    } else if (view.myRequest || view.role === 'buyer') {
      threads = [{ buyer: person(user.id, false), messages: threadMessages(`listing:${l.id}:${user.id}`, user) }];
    }
    return { listing: view, requests, threads };
  }

  function refreshListing(l, extra = []) {
    const ids = new Set([l.seller_id, l.buyer_id, ...extra,
      ...q('SELECT buyer_id FROM listing_requests WHERE listing_id = ?').all(l.id).map((r) => r.buyer_id)].filter(Boolean));
    for (const id of ids) notifier.emit(id, 'refresh', { refType: 'listing', refId: l.id });
  }

  function requestListing(user, id, body) {
    const l = listingRow(id);
    if (!l || !R.canSeeListing(user, l) || l.seller_id === user.id) fail(404, 'not_found', 'This listing isn’t available.');
    if (l.status !== 'available') fail(409, 'not_available', 'This item is no longer available.');
    const note = oneLine(body && body.note, 200);
    const ins = q('INSERT OR IGNORE INTO listing_requests(listing_id, buyer_id, note, created_at) VALUES(?,?,?,?)').run(l.id, user.id, note, now());
    if (ins.changes === 1) {
      notifier.notify(l.seller_id, { type: 'listing_request', title: `${firstName(user.name)} wants your ${l.title}`, body: note || 'Open the listing to accept and arrange pickup.', refType: 'listing', refId: l.id });
    }
    refreshListing(l);
    return getListing(user, l.id);
  }

  function withdrawRequest(user, id) {
    const l = listingRow(id);
    if (!l) fail(404, 'not_found', 'This listing isn’t available.');
    q('DELETE FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').run(l.id, user.id);
    if (l.buyer_id === user.id && l.status === 'reserved') {
      q("UPDATE listings SET status = 'available', buyer_id = NULL WHERE id = ?").run(l.id);
      notifier.notify(l.seller_id, { type: 'listing_released', title: `${firstName(user.name)} no longer needs your ${l.title}`, body: 'It is available again.', refType: 'listing', refId: l.id });
    }
    refreshListing(listingRow(l.id), [user.id]);
    return { ok: true };
  }

  function sellerListing(user, id) {
    const l = listingRow(id);
    if (!l || l.seller_id !== user.id) fail(403, 'not_seller', 'Only the seller can do that.');
    return l;
  }

  function acceptRequest(user, id, body) {
    const l = sellerListing(user, id);
    if (l.status !== 'available') fail(409, 'not_available', 'This item is already reserved or sold.');
    const buyerId = String((body && body.buyerId) || '');
    if (!q('SELECT 1 AS x FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').get(l.id, buyerId)) fail(404, 'no_request', 'That person hasn’t asked for this item.');
    q("UPDATE listings SET status = 'reserved', buyer_id = ? WHERE id = ?").run(buyerId, l.id);
    notifier.notify(buyerId, { type: 'listing_accepted', title: `${firstName(user.name)} saved the ${l.title} for you`, body: 'Use the chat to agree a pickup time and place.', refType: 'listing', refId: l.id });
    for (const r of q('SELECT buyer_id FROM listing_requests WHERE listing_id = ? AND buyer_id != ?').all(l.id, buyerId)) {
      notifier.notify(r.buyer_id, { type: 'listing_reserved', title: `${l.title} was reserved for someone else`, body: 'You will hear if it becomes available again.', refType: 'listing', refId: l.id });
    }
    refreshListing(listingRow(l.id));
    return getListing(user, l.id);
  }

  function releaseReservation(user, id) {
    const l = sellerListing(user, id);
    if (l.status !== 'reserved') fail(409, 'not_reserved', 'This item isn’t reserved.');
    const buyer = l.buyer_id;
    q("UPDATE listings SET status = 'available', buyer_id = NULL WHERE id = ?").run(l.id);
    q('DELETE FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').run(l.id, buyer);
    if (buyer) notifier.notify(buyer, { type: 'listing_released', title: `${l.title} is no longer reserved for you`, body: 'The seller made it available again.', refType: 'listing', refId: l.id });
    for (const r of q('SELECT buyer_id FROM listing_requests WHERE listing_id = ?').all(l.id)) {
      notifier.notify(r.buyer_id, { type: 'listing_available', title: `${l.title} is available again`, body: 'Open it to ask the seller.', refType: 'listing', refId: l.id });
    }
    refreshListing(listingRow(l.id), [buyer]);
    return getListing(user, l.id);
  }

  function markSold(user, id) {
    const l = sellerListing(user, id);
    if (l.status !== 'reserved') fail(409, 'not_reserved', 'Reserve it for someone before marking it handed over.');
    q("UPDATE listings SET status = 'sold', sold_at = ? WHERE id = ?").run(now(), l.id);
    notifier.notify(l.buyer_id, { type: 'listing_sold', title: `You have the ${l.title}`, body: `${firstName(user.name)} marked it handed over.`, refType: 'listing', refId: l.id });
    refreshListing(listingRow(l.id));
    return getListing(user, l.id);
  }

  function withdrawListing(user, id) {
    const l = sellerListing(user, id);
    if (l.status === 'sold') fail(409, 'sold', 'This item has already been handed over.');
    q("UPDATE listings SET status = 'withdrawn' WHERE id = ?").run(l.id);
    for (const r of q('SELECT buyer_id FROM listing_requests WHERE listing_id = ?').all(l.id)) {
      notifier.notify(r.buyer_id, { type: 'listing_withdrawn', title: `${l.title} is no longer offered`, body: 'The seller took it down.', refType: 'listing', refId: l.id });
    }
    refreshListing(l);
    return { ok: true };
  }

  function postListingMessage(user, id, body) {
    const l = listingRow(id);
    if (!l) fail(404, 'not_found', 'This listing isn’t available.');
    let buyerId;
    if (l.seller_id === user.id) {
      buyerId = String((body && body.buyerId) || '');
      if (!q('SELECT 1 AS x FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').get(l.id, buyerId)) fail(404, 'no_request', 'That person hasn’t asked for this item.');
    } else {
      if (!q('SELECT 1 AS x FROM listing_requests WHERE listing_id = ? AND buyer_id = ?').get(l.id, user.id)) fail(403, 'no_request', 'Ask for the item before messaging the seller.');
      buyerId = user.id;
    }
    const text = multiLine(body && body.body, 1000);
    if (!text) fail(400, 'empty', 'Write a message first.');
    q('INSERT INTO messages(thread, sender_id, body, created_at) VALUES(?,?,?,?)').run(`listing:${l.id}:${buyerId}`, user.id, text, now());
    const other = user.id === l.seller_id ? buyerId : l.seller_id;
    notifier.notify(other, { type: 'message', title: `Message from ${firstName(user.name)}`, body: text.slice(0, 140), refType: 'listing', refId: l.id });
    notifier.emit(user.id, 'refresh', { refType: 'listing', refId: l.id });
    return getListing(user, l.id);
  }

  // ---------------------------------------------------------------- notifications
  function listNotifications(user) {
    const items = q('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(user.id);
    const unread = q('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(user.id).c;
    return { items, unread };
  }
  function markRead(user, body) {
    if (body && Array.isArray(body.ids) && body.ids.length) {
      const ids = body.ids.map(Number).filter(Number.isInteger).slice(0, 200);
      for (const id of ids) q('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, user.id);
    } else {
      q('UPDATE notifications SET read = 1 WHERE user_id = ?').run(user.id);
    }
    return listNotifications(user);
  }

  return {
    AppError, signup, signin, auth, me, updateProfile, deleteAccount, updateLocation,
    previewAudience, postNeed, listNeeds, getNeed, takeNeed, releaseNeed, resolveNeed, cancelNeed, thankHelper, postNeedMessage,
    report, postListing, listListings, getListing, requestListing, withdrawRequest, acceptRequest, releaseReservation, markSold,
    withdrawListing, postListingMessage, listNotifications, markRead, expireOld
  };
}

module.exports = { createService, AppError };
