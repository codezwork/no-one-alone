// Safety, profession routing, distance calculation, and visibility rules
export interface Profession {
  id: string;
  label: string;
  requestable: boolean;
}

export interface GeneralHelpCategory {
  id: string;
  label: string;
}

export interface TradeCategory {
  id: string;
  label: string;
}

export const PROFESSIONS: Profession[] = [
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
  { id: 'other', label: 'Something else', requestable: false },
];

export const GENERAL_HELP: GeneralHelpCategory[] = [
  { id: 'child', label: 'Look after a child' },
  { id: 'elder', label: 'Sit with an elderly person' },
  { id: 'meal', label: 'Cook or share a meal' },
  { id: 'deliver', label: 'Carry or deliver something' },
  { id: 'checkin', label: 'Check in on someone' },
  { id: 'other', label: 'Something else' },
];

export const TRADE_CATEGORIES: TradeCategory[] = [
  { id: 'food', label: 'Food and water' },
  { id: 'medicine', label: 'Medicine and first aid' },
  { id: 'baby', label: 'Baby care' },
  { id: 'clothing', label: 'Clothing and bedding' },
  { id: 'kitchen', label: 'Kitchen and utensils' },
  { id: 'power', label: 'Torches, batteries, power banks' },
  { id: 'tools', label: 'Tools' },
  { id: 'other', label: 'Other essentials' },
];

export const GENDERS = ['female', 'male', 'other'] as const;
export const MARITAL = ['married', 'unmarried'] as const;

export const MIN_SIGNUP_AGE = 13;
export const MAX_AGE = 110;
export const HELPER_MIN_AGE = 18;
export const GENERAL_HELP_MIN_AGE = 24;
export const SENSITIVE_MIN_VIEWER_AGE = 25;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 10;
export const DEFAULT_RADIUS_KM = 4;
export const NEED_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const REPORTS_TO_HIDE = 3;

export const professionIds = new Set(PROFESSIONS.map((p) => p.id));
export const requestableIds = new Set(PROFESSIONS.filter((p) => p.requestable).map((p) => p.id));
export const generalIds = new Set(GENERAL_HELP.map((g) => g.id));
export const tradeIds = new Set(TRADE_CATEGORIES.map((c) => c.id));

const toRad = (d: number) => (d * Math.PI) / 180;

export function formatCustomProfession(text?: string | null): string {
  const clean = String(text ?? '')
    .replace(/[^\p{L}\p{N} &/.,()'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
}

export const PROFESSION_ALIASES: Record<string, string> = {
  gp: 'doctor',
  physician: 'doctor',
  'general physician': 'doctor',
  mbbs: 'doctor',
  chemist: 'pharmacist',
  housewife: 'homemaker',
  'house wife': 'homemaker',
  homemaker: 'homemaker',
  'staff nurse': 'nurse',
  'auto driver': 'driver',
};

export function matchProfession(text?: string | null): string | null {
  const t = String(text || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  if (PROFESSION_ALIASES[t]) return PROFESSION_ALIASES[t];
  const hit = PROFESSIONS.find(
    (p) =>
      p.id !== 'other' &&
      [p.id, p.label.toLowerCase(), p.label.toLowerCase().replace(/\s*\(.*\)/, '')].includes(t)
  );
  return hit ? hit.id : null;
}

export interface Point {
  lat: number;
  lng: number;
}

export function hasLocation(p?: any): boolean {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

export function distanceKm(a?: any, b?: any): number {
  if (!hasLocation(a) || !hasLocation(b)) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function boundingBox(p: Point, km: number) {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(0.01, Math.cos(toRad(p.lat))));
  return {
    minLat: p.lat - dLat,
    maxLat: p.lat + dLat,
    minLng: p.lng - dLng,
    maxLng: p.lng + dLng,
  };
}

export function isSensitivePoster(user: { gender: string; age: number }): boolean {
  return user.gender === 'female' && user.age >= MIN_SIGNUP_AGE && user.age <= 19;
}

export function blockedFromSensitive(viewer: { gender: string; marital: string; age: number }): boolean {
  return viewer.gender !== 'female' && (viewer.marital !== 'married' || viewer.age < SENSITIVE_MIN_VIEWER_AGE);
}

export function canHelp(viewer: any, need: any): { ok: boolean; reason?: string } {
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

export function inRange(viewer: any, point: any): boolean {
  return distanceKm(viewer, point) <= (viewer.radius_km || DEFAULT_RADIUS_KM) + 1e-9;
}

export function canSeeNeed(viewer: any, need: any): boolean {
  if (need.poster_id === viewer.id || need.helper_id === viewer.id) return true;
  if (need.status === 'hidden') return false;
  return canHelp(viewer, need).ok && inRange(viewer, need);
}

export function canSeeListing(viewer: any, listing: any): boolean {
  if (listing.seller_id === viewer.id) return true;
  if (listing.status === 'hidden' || listing.status === 'withdrawn') return false;
  return inRange(viewer, listing);
}

export const REFUSAL_TEXT: Record<string, string> = {
  own: 'This is your own request.',
  under_18: 'You need to be 18 or older to help.',
  under_24: 'General help is open to people aged 24 and over.',
  profession: 'This request is for a different profession.',
  safety: 'This request is limited to a restricted group of helpers for safety.',
  kind: 'This request can’t be taken.',
  missing: 'This request can’t be taken.',
};
