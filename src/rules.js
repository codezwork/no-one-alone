'use strict';
// Who may see and help with which need, and how far "nearby" reaches.
// Every rule here is enforced on the server; the app only mirrors it.

const PROFESSIONS = [
  { id: 'doctor', label: 'Doctor (general physician)', requestable: true },
  { id: 'nurse', label: 'Nurse', requestable: true },
  { id: 'pharmacist', label: 'Pharmacist', requestable: true },
  { id: 'counsellor', label: 'Counsellor', requestable: true },
  { id: 'electrician', label: 'Electrician', requestable: true },
  { id: 'plumber', label: 'Plumber', requestable: true },
  { id: 'mechanic', label: 'Mechanic', requestable: true },
  { id: 'carpenter', label: 'Carpenter', requestable: true },
  { id: 'driver', label: 'Driver', requestable: true },
  { id: 'teacher', label: 'Teacher', requestable: true },
  { id: 'lawyer', label: 'Lawyer', requestable: true },
  { id: 'cook', label: 'Cook', requestable: true },
  { id: 'student', label: 'Student', requestable: false },
  { id: 'homemaker', label: 'Homemaker', requestable: false },
  { id: 'other', label: 'Something else', requestable: false }
];

const GENERAL_HELP = [
  { id: 'child', label: 'Look after a child' },
  { id: 'elder', label: 'Sit with an elderly person' },
  { id: 'meal', label: 'Cook or share a meal' },
  { id: 'deliver', label: 'Carry or deliver something' },
  { id: 'checkin', label: 'Check in on someone' },
  { id: 'other', label: 'Something else' }
];

const TRADE_CATEGORIES = [
  { id: 'food', label: 'Food and water' },
  { id: 'medicine', label: 'Medicine and first aid' },
  { id: 'baby', label: 'Baby care' },
  { id: 'clothing', label: 'Clothing and bedding' },
  { id: 'kitchen', label: 'Kitchen and utensils' },
  { id: 'power', label: 'Torches, batteries, power banks' },
  { id: 'tools', label: 'Tools' },
  { id: 'other', label: 'Other essentials' }
];

const GENDERS = ['female', 'male', 'other'];
const MARITAL = ['married', 'unmarried'];

const MIN_SIGNUP_AGE = 13;
const MAX_AGE = 110;
const HELPER_MIN_AGE = 18;        // nobody under 18 is sent to help anyone
const GENERAL_HELP_MIN_AGE = 24;  // general help (children, elders, meals...) is for 24+
const SENSITIVE_MIN_VIEWER_AGE = 25;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 10;
const DEFAULT_RADIUS_KM = 4;     // everyone starts at 4 km and can change it in settings
const NEED_LIFETIME_MS = 24 * 60 * 60 * 1000;
const REPORTS_TO_HIDE = 3;

const professionIds = new Set(PROFESSIONS.map((p) => p.id));
const requestableIds = new Set(PROFESSIONS.filter((p) => p.requestable).map((p) => p.id));
const generalIds = new Set(GENERAL_HELP.map((g) => g.id));
const tradeIds = new Set(TRADE_CATEGORIES.map((c) => c.id));

const toRad = (d) => (d * Math.PI) / 180;

/** Tidy a profession typed into "Something else" so it reads like the listed ones (e.g. "civil  engineer" → "Civil engineer"). */
function formatCustomProfession(text) {
  const clean = String(text ?? '').replace(/[^\p{L}\p{N} &/.,()'’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
}

const PROFESSION_ALIASES = {
  gp: 'doctor', physician: 'doctor', 'general physician': 'doctor', mbbs: 'doctor', chemist: 'pharmacist',
  housewife: 'homemaker', 'house wife': 'homemaker', homemaker: 'homemaker', 'staff nurse': 'nurse', 'auto driver': 'driver'
};
/** A typed profession that is really a listed one ("electrician", "Doctor") maps to it, so matching requests still reach them. */
function matchProfession(text) {
  const t = String(text || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (PROFESSION_ALIASES[t]) return PROFESSION_ALIASES[t];
  const hit = PROFESSIONS.find((p) => p.id !== 'other' &&
    [p.id, p.label.toLowerCase(), p.label.toLowerCase().replace(/\s*\(.*\)/, '')].includes(t));
  return hit ? hit.id : null;
}

/** Great-circle distance in km between two {lat, lng} points. */
function distanceKm(a, b) {
  if (!hasLocation(a) || !hasLocation(b)) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function hasLocation(p) {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

/** Lat/lng box that contains every point within km of p (cheap SQL prefilter). */
function boundingBox(p, km) {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.01, Math.cos(toRad(p.lat))));
  return { minLat: p.lat - dLat, maxLat: p.lat + dLat, minLng: p.lng - dLng, maxLng: p.lng + dLng };
}

/** Needs posted by teenage girls are sensitive and get the strictest audience. */
function isSensitivePoster(user) {
  return user.gender === 'female' && user.age >= MIN_SIGNUP_AGE && user.age <= 19;
}

/** Men (and anyone not identifying as female) who are unmarried or under 25 never see sensitive needs. */
function blockedFromSensitive(viewer) {
  return viewer.gender !== 'female' && (viewer.marital !== 'married' || viewer.age < SENSITIVE_MIN_VIEWER_AGE);
}

/**
 * Whether `viewer` may be shown and take `need`, ignoring distance.
 * Returns { ok, reason } so the app can explain a refusal.
 */
function canHelp(viewer, need) {
  if (!viewer || !need) return { ok: false, reason: 'missing' };
  if (viewer.id === need.poster_id) return { ok: false, reason: 'own' };
  if (viewer.age < HELPER_MIN_AGE) return { ok: false, reason: 'under_18' };
  if (need.sensitive && blockedFromSensitive(viewer)) return { ok: false, reason: 'safety' };
  if (need.kind === 'professional') {
    return viewer.profession === need.profession ? { ok: true } : { ok: false, reason: 'profession' };
  }
  if (need.kind === 'general') {
    return viewer.age >= GENERAL_HELP_MIN_AGE ? { ok: true } : { ok: false, reason: 'under_24' };
  }
  return { ok: false, reason: 'kind' };
}

/** Within the viewer's chosen radius of a point. */
function inRange(viewer, point) {
  return distanceKm(viewer, point) <= (viewer.radius_km || DEFAULT_RADIUS_KM) + 1e-9;
}

/** Shown in the viewer's feed: their own needs, needs they help with, or open needs they can take nearby. */
function canSeeNeed(viewer, need) {
  if (need.poster_id === viewer.id || need.helper_id === viewer.id) return true;
  if (need.status === 'hidden') return false;
  return canHelp(viewer, need).ok && inRange(viewer, need);
}

/** Trade listings are visible to everyone within their radius. */
function canSeeListing(viewer, listing) {
  if (listing.seller_id === viewer.id) return true;
  if (listing.status === 'hidden' || listing.status === 'withdrawn') return false;
  return inRange(viewer, listing);
}

const REFUSAL_TEXT = {
  own: 'This is your own request.',
  under_18: 'You need to be 18 or older to help.',
  under_24: 'General help is open to people aged 24 and over.',
  profession: 'This request is for a different profession.',
  safety: 'This request is limited to a restricted group of helpers for safety.',
  kind: 'This request can’t be taken.',
  missing: 'This request can’t be taken.'
};

module.exports = {
  PROFESSIONS, GENERAL_HELP, TRADE_CATEGORIES, GENDERS, MARITAL,
  MIN_SIGNUP_AGE, MAX_AGE, HELPER_MIN_AGE, GENERAL_HELP_MIN_AGE, SENSITIVE_MIN_VIEWER_AGE,
  MIN_RADIUS_KM, MAX_RADIUS_KM, DEFAULT_RADIUS_KM, NEED_LIFETIME_MS, REPORTS_TO_HIDE, REFUSAL_TEXT,
  professionIds, requestableIds, generalIds, tradeIds,
  formatCustomProfession, matchProfession, distanceKm, hasLocation, boundingBox, isSensitivePoster, blockedFromSensitive,
  canHelp, inRange, canSeeNeed, canSeeListing
};
