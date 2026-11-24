/**
 * Passenger feedback storage.
 *
 * Stored in the browser's localStorage so the demo works with no server.
 * The functions below are the only place that touches storage, so swapping in
 * a real backend (Supabase, Firebase, a REST API) means changing this file only.
 */

export const CATEGORIES = [
  { id: 'punctuality', label: 'Punctuality' },
  { id: 'comfort', label: 'Comfort and cleanliness' },
  { id: 'safety', label: 'Safety' },
  { id: 'driver', label: 'Driver and staff' },
  { id: 'fare', label: 'Fare' },
  { id: 'other', label: 'Other' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export interface Feedback {
  id: string;
  routeId: string;
  rating: number;
  category: CategoryId;
  comment: string;
  createdAt: string;
}

export type NewFeedback = Omit<Feedback, 'id' | 'createdAt'>;

const STORAGE_KEY = 'smarttransit.feedback.v1';
export const MAX_COMMENT = 500;

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function store(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function loadFeedback(s: Storage | null = store()): Feedback[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function validateFeedback(f: NewFeedback): string | null {
  if (!f.routeId) return 'Choose the route you travelled on.';
  if (!Number.isInteger(f.rating) || f.rating < 1 || f.rating > 5) return 'Give a rating from 1 to 5 stars.';
  if (!CATEGORIES.some((c) => c.id === f.category)) return 'Choose what your feedback is about.';
  if (f.comment.length > MAX_COMMENT) return `Keep the comment under ${MAX_COMMENT} characters.`;
  return null;
}

export function addFeedback(f: NewFeedback, s: Storage | null = store()): Feedback {
  const error = validateFeedback(f);
  if (error) throw new Error(error);
  const entry: Feedback = {
    ...f,
    comment: f.comment.trim(),
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  if (s) s.setItem(STORAGE_KEY, JSON.stringify([entry, ...loadFeedback(s)]));
  return entry;
}

export interface RouteRating {
  count: number;
  average: number;
}

export function ratingsByRoute(all: Feedback[]): Map<string, RouteRating> {
  const out = new Map<string, RouteRating>();
  for (const f of all) {
    const r = out.get(f.routeId) ?? { count: 0, average: 0 };
    r.average = (r.average * r.count + f.rating) / (r.count + 1);
    r.count += 1;
    out.set(f.routeId, r);
  }
  return out;
}
