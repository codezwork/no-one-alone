'use strict';
// End-to-end checks of the Validation list, through the real HTTP API.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

const base = { lat: 13.0012, lng: 80.2565 };
const north = (km) => ({ lat: base.lat + km / 111.32, lng: base.lng });

let app, url;
const users = {};

async function call(method, path, token, body) {
  const res = await fetch(url + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
}
const as = (name) => users[name].token;
const notes = async (name) => (await call('GET', '/api/notifications', as(name))).body.items;
const feed = async (name) => (await call('GET', '/api/needs', as(name))).body;

async function signup(name, profile, km) {
  const r = await call('POST', '/api/signup', null, { name, ...profile, ...north(km) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  users[name] = r.body;
}

test.before(async () => {
  app = createApp({ dbFile: ':memory:', log: () => {} });
  await new Promise((r) => app.server.listen(0, r));
  url = 'http://localhost:' + app.server.address().port;
  await signup('Asha', { age: 34, gender: 'female', marital: 'married', profession: 'homemaker' }, 0);
  await signup('Ravi Doctor', { age: 40, gender: 'male', marital: 'married', profession: 'doctor' }, 2);
  await signup('Farida Doctor', { age: 45, gender: 'female', marital: 'married', profession: 'doctor' }, 6);
  await signup('Nalini Nurse', { age: 29, gender: 'female', marital: 'unmarried', profession: 'nurse' }, 1);
  await signup('Arun Young', { age: 22, gender: 'male', marital: 'unmarried', profession: 'student' }, 1);
  await signup('Karan Single', { age: 30, gender: 'male', marital: 'unmarried', profession: 'other', professionOther: 'Software engineer' }, 1);
  await signup('Mohan Married', { age: 32, gender: 'male', marital: 'married', profession: 'driver' }, 1);
  await signup('Divya Teacher', { age: 25, gender: 'female', marital: 'unmarried', profession: 'teacher' }, 1.5);
  await signup('Priya Teen', { age: 16, gender: 'female', marital: 'unmarried', profession: 'student' }, 0.3);
  await signup('Far Away', { age: 40, gender: 'male', marital: 'married', profession: 'mechanic' }, 6);
});
test.after(() => new Promise((r) => app.server.close(r)));

test('signup refuses under-13s and needs all profile fields', async () => {
  const kid = await call('POST', '/api/signup', null, { name: 'Kid', age: 11, gender: 'male', marital: 'unmarried', profession: 'student' });
  assert.equal(kid.status, 400);
  assert.equal(kid.body.error.code, 'too_young');
  const missing = await call('POST', '/api/signup', null, { name: 'No Gender', age: 30, marital: 'married', profession: 'other' });
  assert.equal(missing.body.error.code, 'bad_gender');
});

let doctorNeed;
test('professional needs alert only matching professionals within range', async () => {
  const r = await call('POST', '/api/needs', as('Asha'), { kind: 'professional', profession: 'doctor', title: 'Fever in a 2-year-old', address: 'Flat 3B, Lotus Apartments', ...base });
  assert.equal(r.status, 200);
  doctorNeed = r.body.need;
  assert.equal(r.body.alerted, 1, 'only the doctor 2 km away is alerted');
  assert.ok((await feed('Ravi Doctor')).open.some((n) => n.id === doctorNeed.id));
  assert.ok(!(await feed('Nalini Nurse')).open.some((n) => n.id === doctorNeed.id), 'a nurse does not get a doctor request');
  assert.ok(!(await feed('Farida Doctor')).open.some((n) => n.id === doctorNeed.id), 'a doctor 6 km away is out of range');
  assert.ok((await notes('Ravi Doctor')).some((n) => n.type === 'need_new' && n.ref_id === doctorNeed.id));
  const viewerCopy = (await call('GET', `/api/needs/${doctorNeed.id}`, as('Ravi Doctor'))).body.need;
  assert.equal(viewerCopy.address, null, 'the private address stays hidden until someone takes the request');
});

test('moving into range alerts a matching professional', async () => {
  const r = await call('POST', '/api/me/location', as('Farida Doctor'), north(1.5));
  assert.equal(r.body.alerted, 1);
  assert.ok((await notes('Farida Doctor')).some((n) => n.type === 'need_new' && n.ref_id === doctorNeed.id));
});

let childNeed;
test('general help reaches only people aged 24 and over', async () => {
  const r = await call('POST', '/api/needs', as('Asha'), { kind: 'general', category: 'child', title: 'Sit with my son for 2 hours', ...base });
  childNeed = r.body.need;
  // Ravi 40, Farida 45 (moved to 1.5 km), Nalini 29, Karan 30, Mohan 32, Divya 25. Not Arun (22) or Priya (16).
  assert.equal(r.body.alerted, 6);
  assert.ok(!(await feed('Arun Young')).open.some((n) => n.id === childNeed.id));
  const take = await call('POST', `/api/needs/${childNeed.id}/take`, as('Arun Young'));
  assert.ok([403, 404].includes(take.status), 'a 22-year-old cannot take general help');
});

test('sensitive needs from teenage girls are hidden from unmarried and young men', async () => {
  const r = await call('POST', '/api/needs', as('Priya Teen'), { kind: 'general', category: 'meal', title: 'I am alone and have no food', alone: true, ...north(0.3) });
  const need = r.body.need;
  assert.equal(need.restricted, true);
  for (const name of ['Karan Single', 'Arun Young']) {
    assert.ok(!(await feed(name)).open.some((n) => n.id === need.id), `${name} must not see it`);
    assert.equal((await call('GET', `/api/needs/${need.id}`, as(name))).status, 404, `${name} cannot open it`);
    assert.ok(!(await notes(name)).some((n) => n.ref_id === need.id), `${name} must not be notified`);
  }
  for (const name of ['Mohan Married', 'Divya Teacher', 'Asha']) {
    assert.ok((await feed(name)).open.some((n) => n.id === need.id), `${name} should see it`);
  }
});

test('the need tracker notifies every party when a request is taken and resolved', async () => {
  const take = await call('POST', `/api/needs/${childNeed.id}/take`, as('Mohan Married'));
  assert.equal(take.status, 200);
  assert.equal(take.body.need.address !== undefined, true);
  assert.ok((await notes('Asha')).some((n) => n.type === 'need_taken' && n.ref_id === childNeed.id), 'poster hears who is coming');
  assert.ok((await notes('Divya Teacher')).some((n) => n.type === 'need_taken_other' && n.ref_id === childNeed.id), 'neighbours hear it is taken');
  const twice = await call('POST', `/api/needs/${childNeed.id}/take`, as('Divya Teacher'));
  assert.equal(twice.status, 409, 'a taken request cannot be taken again');

  const done = await call('POST', `/api/needs/${childNeed.id}/resolve`, as('Mohan Married'));
  assert.equal(done.body.need.status, 'resolved');
  assert.ok((await notes('Asha')).some((n) => n.type === 'need_resolved' && n.ref_id === childNeed.id), 'poster is told');
  for (const name of ['Divya Teacher', 'Karan Single', 'Nalini Nurse', 'Ravi Doctor', 'Farida Doctor']) {
    assert.ok((await notes(name)).some((n) => n.type === 'need_resolved_other' && n.ref_id === childNeed.id), `${name} is told it was resolved`);
  }
  const thanks = await call('POST', `/api/needs/${childNeed.id}/thank`, as('Asha'));
  assert.equal(thanks.body.need.thanked, true);
  assert.ok((await notes('Mohan Married')).some((n) => n.type === 'thanks'));
  const mohan = (await call('GET', '/api/me', as('Mohan Married'))).body.user;
  assert.equal(mohan.helped, 1);
  assert.equal(mohan.thanks, 1);
});

test('the helper sees the private address and can chat with the poster', async () => {
  const take = await call('POST', `/api/needs/${doctorNeed.id}/take`, as('Ravi Doctor'));
  assert.equal(take.body.need.address, 'Flat 3B, Lotus Apartments');
  const msg = await call('POST', `/api/needs/${doctorNeed.id}/messages`, as('Ravi Doctor'), { body: 'On my way, 10 minutes.' });
  assert.equal(msg.body.messages.length, 1);
  assert.ok((await notes('Asha')).some((n) => n.type === 'message'));
  const outsider = await call('POST', `/api/needs/${doctorNeed.id}/messages`, as('Divya Teacher'), { body: 'hi' });
  assert.equal(outsider.status, 403);
});

test('trade listings are visible to everyone within the locality, and sales notify both sides', async () => {
  const r = await call('POST', '/api/listings', as('Asha'), { title: 'Steel cutlery set (24 pieces)', category: 'kitchen', price: 150, condition: 'good', ...base });
  const id = r.body.listing.id;
  for (const name of ['Arun Young', 'Priya Teen', 'Karan Single', 'Divya Teacher']) {
    assert.ok((await call('GET', '/api/listings', as(name))).body.nearby.some((l) => l.id === id), `${name} sees it`);
  }
  assert.ok(!(await call('GET', '/api/listings', as('Far Away'))).body.nearby.some((l) => l.id === id), 'out of range');

  await call('POST', `/api/listings/${id}/request`, as('Divya Teacher'), { note: 'Can pick up today' });
  await call('POST', `/api/listings/${id}/request`, as('Karan Single'), {});
  assert.ok((await notes('Asha')).some((n) => n.type === 'listing_request' && n.ref_id === id));
  const accepted = await call('POST', `/api/listings/${id}/accept`, as('Asha'), { buyerId: users['Divya Teacher'].user.id });
  assert.equal(accepted.body.listing.status, 'reserved');
  assert.ok((await notes('Divya Teacher')).some((n) => n.type === 'listing_accepted'));
  assert.ok((await notes('Karan Single')).some((n) => n.type === 'listing_reserved'));
  const sold = await call('POST', `/api/listings/${id}/sold`, as('Asha'));
  assert.equal(sold.body.listing.status, 'sold');
  assert.ok((await notes('Divya Teacher')).some((n) => n.type === 'listing_sold'));
});

test('three reports hide a post', async () => {
  const r = await call('POST', '/api/listings', as('Karan Single'), { title: 'Suspicious offer', category: 'other', free: true, ...north(1) });
  const id = r.body.listing.id;
  for (const name of ['Asha', 'Divya Teacher', 'Mohan Married']) await call('POST', `/api/listings/${id}/report`, as(name), { reason: 'spam' });
  assert.ok(!(await call('GET', '/api/listings', as('Arun Young'))).body.nearby.some((l) => l.id === id));
});

test('"Something else" saves the typed profession, formatted like the listed ones', async () => {
  const r = await call('POST', '/api/signup', null, { name: 'Sanjay Engineer', age: 41, gender: 'male', marital: 'married', profession: 'other', professionOther: '  civil   engineer', ...base });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.profession, 'other');
  assert.equal(r.body.user.professionLabel, 'Civil engineer');
  assert.equal(r.body.user.radiusKm, 4, 'everyone starts at 4 km');
  const listed = await call('POST', '/api/signup', null, { name: 'Typed Electrician', age: 38, gender: 'male', marital: 'married', profession: 'other', professionOther: 'electrician', ...base });
  assert.equal(listed.body.user.profession, 'electrician', 'a typed listed profession still gets matching requests');
  const missing = await call('POST', '/api/signup', null, { name: 'No Detail', age: 30, gender: 'female', marital: 'married', profession: 'other', ...base });
  assert.equal(missing.body.error.code, 'bad_profession_other');
  const noLocation = await call('POST', '/api/signup', null, { name: 'Later Location', age: 30, gender: 'female', marital: 'married', profession: 'teacher' });
  assert.equal(noLocation.status, 200, 'location can be shared after signup');
  assert.equal(noLocation.body.user.lat, null);
});

test('the radius starts at 4 km and can be set from 1 to 10 km in settings', async () => {
  const token = as('Divya Teacher');
  assert.equal((await call('PATCH', '/api/me', token, { radiusKm: 7 })).body.user.radiusKm, 7);
  assert.equal((await call('PATCH', '/api/me', token, { radiusKm: 1 })).body.user.radiusKm, 1);
  assert.equal((await call('PATCH', '/api/me', token, { radiusKm: 11 })).body.error.code, 'bad_radius');
  assert.equal((await call('PATCH', '/api/me', token, { radiusKm: 2.5 })).body.error.code, 'bad_radius');
  assert.equal((await call('PATCH', '/api/me', token, { radiusKm: 4 })).body.user.radiusKm, 4);
});

test('requests expire after 24 hours and the poster is told', async () => {
  let clock = Date.now();
  const timed = createApp({ dbFile: ':memory:', log: () => {}, now: () => clock });
  const { svc } = timed;
  const { user } = svc.signup({ name: 'Old Post', age: 40, gender: 'female', marital: 'married', profession: 'homemaker', ...base });
  const me = timed.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const { need } = svc.postNeed(me, { kind: 'general', category: 'deliver', ...base });
  clock += 25 * 60 * 60 * 1000;
  svc.expireOld();
  assert.equal(svc.getNeed(me, need.id).need.status, 'expired');
  assert.ok(svc.listNotifications(me).items.some((n) => n.type === 'need_expired'));
  timed.server.close();
});
