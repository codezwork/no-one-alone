'use strict';
// Adds sample neighbours, requests and items around a point, for demos and testing.
// Everything it creates is tagged "Sample" in the app.
//   npm run seed -- <lat> <lng>        e.g. npm run seed -- 13.0012 80.2565 (Adyar, Chennai)
const { createApp } = require('../server');

const lat = Number(process.argv[2] || 13.0012);
const lng = Number(process.argv[3] || 80.2565);
if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
  console.error('Usage: npm run seed -- <lat> <lng>');
  process.exit(1);
}
const at = (northKm, eastKm) => ({ lat: lat + northKm / 111.32, lng: lng + eastKm / (111.32 * Math.cos((lat * Math.PI) / 180)) });

const { svc, db, server } = createApp({ log: () => {} });
const row = (id) => db.q('SELECT * FROM users WHERE id = ?').get(id);
async function main() {
const people = [
  ['Lakshmi R.', 38, 'female', 'married', 'teacher', 0.4, 0.2],
  ['Dr. Farida H.', 45, 'female', 'married', 'doctor', 1.2, -0.5],
  ['Selvam K.', 41, 'male', 'married', 'driver', -0.8, 0.6],
  ['Nalini S.', 29, 'female', 'unmarried', 'nurse', 0.9, 1.1],
  ['Kamala A.', 72, 'female', 'married', 'homemaker', -0.3, -0.4],
  ['Joseph M.', 52, 'male', 'married', 'electrician', 1.8, 0.9]
];
const made = {};
for (const [name, age, gender, marital, profession, n, e] of people) {
  const { token, user } = await svc.signup({ name, age, gender, marital, profession, sample: true, ...at(n, e) });
  made[profession] = { token, user: await row(user.id) };
  console.log(`${(name + ' (' + profession + ')').padEnd(30)} recovery code: ${token}`);
}

await svc.postNeed(made.homemaker.user, { kind: 'professional', profession: 'electrician', title: 'Power socket sparking after the flood water', details: 'Ground floor. Mains switched off for now.', landmark: 'Behind the ration shop', sample: true, ...at(-0.3, -0.4) });
await svc.postNeed(made.homemaker.user, { kind: 'general', category: 'deliver', title: 'Need someone to bring drinking water cans', details: 'Two 20 L cans from the relief centre. I can’t carry them.', sample: true, ...at(-0.3, -0.4) });
await svc.postNeed(made.teacher.user, { kind: 'general', category: 'child', title: 'Sit with two children for an hour', details: 'Ages 4 and 7. I have to queue at the relief centre.', sample: true, ...at(0.4, 0.2) });
const done = await svc.postNeed(made.driver.user, { kind: 'professional', profession: 'doctor', title: 'Check on my father’s breathing', sample: true, ...at(-0.8, 0.6) });
await svc.takeNeed(made.doctor.user, done.need.id);
await svc.resolveNeed(made.doctor.user, done.need.id);

await svc.postListing(made.homemaker.user, { title: 'Steel cutlery set, 24 pieces', category: 'kitchen', condition: 'good', price: 150, description: 'Clean and complete. Pickup near the ration shop.', sample: true, ...at(-0.3, -0.4) });
await svc.postListing(made.teacher.user, { title: 'Two torches with batteries', category: 'power', condition: 'new', free: true, description: 'Free for anyone without power.', sample: true, ...at(0.4, 0.2) });
await svc.postListing(made.nurse.user, { title: 'Oral rehydration salts, 10 packets', category: 'medicine', condition: 'new', price: 60, sample: true, ...at(0.9, 1.1) });

console.log(`\nSample data added around ${lat.toFixed(4)}, ${lng.toFixed(4)}. Sign in with any code above to see the app as that person.`);
}

main().then(() => server.close(), (err) => { console.error(err); server.close(); process.exitCode = 1; });
