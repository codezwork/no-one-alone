import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/lib/rules.ts';

const base = { lat: 13.0012, lng: 80.2565 };
const at = (km) => ({ lat: base.lat + km / 111.32, lng: base.lng });
const person = (o) => ({ id: o.id || 'u', radius_km: 4, ...at(o.km || 0), ...o });

test('distance: 1 km north is about 1 km', () => {
  assert.ok(Math.abs(R.distanceKm(base, at(1)) - 1) < 0.01);
});

test('professional needs go only to the matching profession', () => {
  const need = { poster_id: 'p', kind: 'professional', profession: 'doctor', sensitive: 0, ...base };
  assert.equal(R.canHelp(person({ age: 40, gender: 'male', marital: 'married', profession: 'doctor' }), need).ok, true);
  assert.equal(R.canHelp(person({ age: 30, gender: 'female', marital: 'married', profession: 'nurse' }), need).reason, 'profession');
});

test('general help is limited to people aged 24 and over', () => {
  const need = { poster_id: 'p', kind: 'general', category: 'child', sensitive: 0, ...base };
  assert.equal(R.canHelp(person({ age: 24, gender: 'female', marital: 'unmarried', profession: 'student' }), need).ok, true);
  assert.equal(R.canHelp(person({ age: 23, gender: 'female', marital: 'unmarried', profession: 'student' }), need).reason, 'under_24');
  assert.equal(R.canHelp(person({ age: 17, gender: 'male', marital: 'unmarried', profession: 'doctor' }),
    { ...need, kind: 'professional', profession: 'doctor' }).reason, 'under_18');
});

test('needs from teenage girls are sensitive', () => {
  assert.equal(R.isSensitivePoster({ gender: 'female', age: 16 }), true);
  assert.equal(R.isSensitivePoster({ gender: 'female', age: 19 }), true);
  assert.equal(R.isSensitivePoster({ gender: 'female', age: 20 }), false);
  assert.equal(R.isSensitivePoster({ gender: 'male', age: 16 }), false);
});

test('unmarried or very young men never see sensitive needs', () => {
  const need = { poster_id: 'p', kind: 'general', category: 'meal', sensitive: 1, ...base };
  const see = (o) => R.canHelp(person({ profession: 'other', ...o }), need).ok;
  assert.equal(see({ age: 30, gender: 'male', marital: 'unmarried' }), false);
  assert.equal(see({ age: 24, gender: 'male', marital: 'married' }), false);
  assert.equal(see({ age: 30, gender: 'other', marital: 'unmarried' }), false);
  assert.equal(see({ age: 32, gender: 'male', marital: 'married' }), true);
  assert.equal(see({ age: 25, gender: 'female', marital: 'unmarried' }), true);
});

test('feed visibility respects the radius', () => {
  const need = { poster_id: 'p', kind: 'professional', profession: 'doctor', sensitive: 0, status: 'open', ...base };
  const near = person({ id: 'a', age: 40, gender: 'male', marital: 'married', profession: 'doctor', km: 3.5 });
  const near3 = { ...near, radius_km: 3 };
  assert.equal(R.canSeeNeed(near, need), true);
  assert.equal(R.canSeeNeed(near3, need), false);
});

test('trade listings are visible to everyone in range, regardless of profile', () => {
  const listing = { seller_id: 's', status: 'available', ...base };
  assert.equal(R.canSeeListing(person({ id: 'x', age: 15, gender: 'male', marital: 'unmarried', km: 2 }), listing), true);
  assert.equal(R.canSeeListing(person({ id: 'y', age: 50, gender: 'female', marital: 'married', km: 6 }), listing), false);
});

test('typed professions are tidied, and listed ones are recognised', () => {
  assert.equal(R.formatCustomProfession('  civil   engineer '), 'Civil engineer');
  assert.equal(R.formatCustomProfession('IT consultant'), 'IT consultant');
  assert.equal(R.formatCustomProfession('<b>x</b>'), 'Bx/b');
  assert.equal(R.matchProfession('Electrician'), 'electrician');
  assert.equal(R.matchProfession('doctor'), 'doctor');
  assert.equal(R.matchProfession('GP'), 'doctor');
  assert.equal(R.matchProfession('Civil engineer'), null);
});
