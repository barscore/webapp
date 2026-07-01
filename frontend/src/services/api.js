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
  nearby: (params) => api.get('/places/nearby', { params }).then((r) => r.data.places),
  search: (q) => api.get('/places/search', { params: { q } }).then((r) => r.data.results),
};

// Account-scoped saved bars. Requires an authenticated session.
export const bookmarksApi = {
  list: () => api.get('/bookmarks').then((r) => r.data),
  add: (barId) => api.post(`/bookmarks/${barId}`).then((r) => r.data),
  remove: (barId) => api.delete(`/bookmarks/${barId}`).then((r) => r.data),
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
