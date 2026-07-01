import axios from 'axios';
import { supabase } from './supabase.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({ baseURL });

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
  list: (params) => api.get('/bars', { params }).then((r) => r.data.bars),
  get: (id) => api.get(`/bars/${id}`).then((r) => r.data.bar),
  // Find-or-create the DB bar backing an OpenStreetMap place, so ratings can
  // attach to it. Returns the full bar (with real uuid + summary).
  resolve: (payload) => api.post('/bars/resolve', payload).then((r) => r.data.bar),
};

// Free OSM-backed discovery (Overpass + Nominatim, proxied by the backend).
export const placesApi = {
  nearby: (params, config) =>
    api.get('/places/nearby', { params, ...config }).then((r) => r.data.places),
  search: (q) => api.get('/places/search', { params: { q } }).then((r) => r.data.results),
  // Global bar search (whole planet), enriched with ratings. Optional lat/lng
  // only sets distance_km on the results.
  searchBars: (params) => api.get('/places/bars', { params }).then((r) => r.data.places),
};

// Zone events, added by hand for venues. Read is public; writes are admin/mod.
export const eventsApi = {
  nearby: (params) => api.get('/events', { params }).then((r) => r.data.events),
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
  ratings: () => api.get('/me/ratings').then((r) => r.data.ratings),
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
