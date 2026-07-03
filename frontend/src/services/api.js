import axios from 'axios';
import { supabase } from './supabase.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  // Vite env vars are baked in at BUILD time: if the hosting build ran without
  // VITE_API_BASE_URL every call goes to localhost and the app looks broken.
  console.warn('[rabar] VITE_API_BASE_URL assente al build — API su', baseURL);
}

export const api = axios.create({ baseURL });

// Guard against a misconfigured VITE_API_BASE_URL pointing at a static host:
// an SPA fallback (serve -s / CDN rewrite) answers any path with index.html,
// HTTP 200 — so `r.data.<list>` comes back undefined and would crash the UI.
// Fail loudly instead: the caller's catch shows its normal error state.
function expectArray(v, what) {
  if (!Array.isArray(v)) {
    throw new Error(`Risposta API non valida per "${what}" — controlla VITE_API_BASE_URL`);
  }
  return v;
}

// Attach the current Supabase access token to every request. supabase-js
// handles persistence + transparent refresh, so we just read the live session.
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// --- API helpers ---
export const barsApi = {
  list: (params) => api.get('/bars', { params }).then((r) => expectArray(r.data.bars, 'bars')),
  get: (id) => api.get(`/bars/${id}`).then((r) => r.data.bar),
  // Find-or-create the DB bar backing an OpenStreetMap place, so ratings can
  // attach to it. Returns the full bar (with real uuid + summary).
  resolve: (payload) => api.post('/bars/resolve', payload).then((r) => r.data.bar),
};

// Free OSM-backed discovery (Overpass + Nominatim, proxied by the backend).
export const placesApi = {
  nearby: (params, config) =>
    api.get('/places/nearby', { params, ...config }).then((r) => expectArray(r.data.places, 'nearby')),
  search: (q) => api.get('/places/search', { params: { q } }).then((r) => expectArray(r.data.results, 'search')),
  // Global bar search (whole planet), enriched with ratings. Optional lat/lng
  // only sets distance_km on the results.
  searchBars: (params) => api.get('/places/bars', { params }).then((r) => expectArray(r.data.places, 'searchBars')),
};

// Zone events, added by hand for venues. Read is public; writes are admin/mod.
export const eventsApi = {
  nearby: (params) => api.get('/events', { params }).then((r) => expectArray(r.data.events, 'events')),
  create: (payload) => api.post('/events', payload).then((r) => r.data.event),
  update: (id, payload) => api.put(`/events/${id}`, payload).then((r) => r.data.event),
  remove: (id) => api.delete(`/events/${id}`).then((r) => r.data),
};

// Account-scoped saved bars. Requires an authenticated session.
export const bookmarksApi = {
  list: () => api.get('/bookmarks').then((r) => r.data),
  add: (barId) => api.post(`/bookmarks/${barId}`).then((r) => r.data),
  remove: (barId) => api.delete(`/bookmarks/${barId}`).then((r) => r.data),
};

// Account-scoped self data. Requires an authenticated session.
export const meApi = {
  profile: () => api.get('/me').then((r) => r.data.profile),
  ratings: () => api.get('/me/ratings').then((r) => expectArray(r.data.ratings, 'meRatings')),
};

// Public ice-cube leaderboard (all users, ranked).
export const leaderboardApi = {
  list: () => api.get('/leaderboard').then((r) => expectArray(r.data.leaderboard, 'leaderboard')),
};

// "Segnala il tuo bar" — create is public (works signed-out); list/moderation
// are staff-only (backend enforces requireRole).
export const suggestionsApi = {
  create: (payload) => api.post('/suggestions', payload).then((r) => r.data.suggestion),
  list: (params) => api.get('/suggestions', { params }).then((r) => r.data),
  setStatus: (id, status) =>
    api.patch(`/suggestions/${id}`, { status }).then((r) => r.data.suggestion),
  remove: (id) => api.delete(`/suggestions/${id}`).then((r) => r.data),
};

// Admin panel. Every call is admin-only (backend enforces requireRole('admin')).
export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data.stats),

  // Users
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  banUser: (id, reason) =>
    api.post(`/admin/users/${id}/ban`, { reason }).then((r) => r.data),
  suspendUser: (id, hours, reason) =>
    api.post(`/admin/users/${id}/suspend`, { hours, reason }).then((r) => r.data),
  unbanUser: (id) => api.post(`/admin/users/${id}/unban`).then((r) => r.data),
  setRole: (id, role) =>
    api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  // Ratings
  ratings: (params) => api.get('/admin/ratings', { params }).then((r) => r.data),
  deleteRating: (id) => api.delete(`/admin/ratings/${id}`).then((r) => r.data),

  // Settings + emergency
  settings: () => api.get('/admin/settings').then((r) => r.data.settings),
  updateSettings: (patch) =>
    api.put('/admin/settings', patch).then((r) => r.data.settings),
  purgeUserRatings: (id) =>
    api.post(`/admin/emergency/purge-user-ratings/${id}`).then((r) => r.data),
};

export const ratingsApi = {
  list: (barId, params) =>
    api.get(`/bars/${barId}/ratings`, { params }).then((r) => r.data),
  create: (barId, payload) =>
    api.post(`/bars/${barId}/ratings`, payload).then((r) => r.data.rating),
  update: (barId, rid, payload) =>
    api.put(`/bars/${barId}/ratings/${rid}`, payload).then((r) => r.data.rating),
  remove: (barId, rid) =>
    api.delete(`/bars/${barId}/ratings/${rid}`).then((r) => r.data),
};
