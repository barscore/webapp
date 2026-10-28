import axios from 'axios';
import { supabase } from './supabase.js';
import { assertSafeApiPath } from './apiPath.js';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
// A bare host ("rabarbackend.vercel.app", no scheme) would be treated by
// axios as a RELATIVE path and every call would silently hit the frontend's
// own static server instead of the API. Force an absolute URL.
if (!/^https?:\/\//i.test(baseURL)) baseURL = `https://${baseURL}`;
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
  // Prima del token: un path manipolato non deve partire, tanto meno firmato.
  assertSafeApiPath(config.url);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Self-heal a stale session. A 401 on a request that DID carry a token means
// the locally cached session no longer verifies on the backend (key rotation,
// deleted user, clock drift). Left alone, every authenticated hook keeps
// firing doomed calls and the console fills with 401s. Try one refresh and
// retry; if the session can't be refreshed, sign out so the app cleanly falls
// back to the signed-out experience.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || !config?.headers?.Authorization || config._retried) {
      throw error;
    }
    config._retried = true;
    refreshing ??= supabase.auth
      .refreshSession()
      .finally(() => {
        refreshing = null;
      });
    const { data, error: refreshErr } = await refreshing;
    if (refreshErr || !data?.session) {
      await supabase.auth.signOut();
      throw error;
    }
    return api(config);
  },
);

// --- API helpers ---
export const barsApi = {
  list: (params) => api.get('/bars', { params }).then((r) => expectArray(r.data.bars, 'bars')),
  get: (id) => api.get(`/bars/${id}`).then((r) => r.data.bar),
  // Find-or-create the DB bar backing an OpenStreetMap place, so ratings can
  // attach to it. Returns the full bar (with real uuid + summary).
  resolve: (payload) => api.post('/bars/resolve', payload).then((r) => r.data.bar),
  updateFreeDrinks: (id, payload) => api.patch(`/bars/${id}/free-drinks`, payload).then((r) => r.data),
  freeDrinks: (params) => api.get('/bars/free-drinks', { params }).then((r) => expectArray(r.data.bars, 'bars')),
};

// Free OSM-backed discovery (Overpass + Nominatim, proxied by the backend).
export const placesApi = {
  // `stale`: the backend answered with what it had (our own table, or nothing)
  // while OpenStreetMap is still loading the area — ask again shortly.
  nearby: (params, config) =>
    api.get('/places/nearby', { params, ...config }).then((r) => ({
      places: expectArray(r.data.places, 'nearby'),
      stale: r.data.stale === true,
    })),
  // Places and addresses as you type (`kind`: area | address | place).
  // lat/lng only rank nearer hits first.
  search: (q, near) =>
    api
      .get('/places/search', { params: { q, lat: near?.[0], lng: near?.[1] } })
      .then((r) => expectArray(r.data.results, 'search')),
  // Global bar search (whole planet), enriched with ratings. Optional lat/lng
  // only sets distance_km on the results.
  searchBars: (params) => api.get('/places/bars', { params }).then((r) => expectArray(r.data.places, 'searchBars')),
};

// Zone events, added by hand for venues. Read is public; writes are admin/mod.
export const eventsApi = {
  nearby: (params) => api.get('/events', { params }).then((r) => r.data.events),
  get: (id) => api.get(`/events/${id}`).then((r) => r.data.event),
  create: (payload) => api.post('/events', payload).then((r) => r.data.event),
  update: (id, payload) => api.put(`/events/${id}`, payload).then((r) => r.data.event),
  remove: (id) => api.delete(`/events/${id}`).then((r) => r.data),
  prs: (id) => api.get(`/events/${id}/prs`).then((r) => r.data.prs),
  join: (id) => api.post(`/events/${id}/join`).then((r) => r.data),
  leave: (id) => api.delete(`/events/${id}/join`).then((r) => r.data),
  approvePr: (id, prId) => api.post(`/events/${id}/prs/${prId}/approve`).then((r) => r.data),
  removePr: (id, prId) => api.delete(`/events/${id}/prs/${prId}`).then((r) => r.data),
};

// Account-scoped saved bars. Requires an authenticated session.
export const bookmarksApi = {
  list: () =>
    api.get('/bookmarks').then((r) => ({
      bar_ids: expectArray(r.data.bar_ids, 'bookmarkIds'),
      bars: expectArray(r.data.bars ?? [], 'bookmarkBars'),
    })),
  add: (barId) => api.post(`/bookmarks/${barId}`).then((r) => r.data),
  remove: (barId) => api.delete(`/bookmarks/${barId}`).then((r) => r.data),
};

// Account-scoped self data. Requires an authenticated session.
export const meApi = {
  profile: () => api.get('/me').then((r) => r.data.profile),
  updateProfile: (data) => api.patch('/me', data).then((r) => r.data.profile),
  applyPromo: (promo) => api.post('/me/promo', { promo }).then((r) => r.data),
  /** Pass d'ingresso firmato e a scadenza: `{ pass, expires_at, ttl_s }`. */
  entryPass: () => api.get('/me/entry-pass').then((r) => r.data),
  bars: () => api.get('/me/bars').then((r) => expectArray(r.data.bars, 'meBars')),
  ratings: () => api.get('/me/ratings').then((r) => expectArray(r.data.ratings, 'meRatings')),
  deleteAccount: () => api.delete('/me').then((r) => r.data),
  // Portabilità (art. 20 GDPR). Il backend manda un Content-Disposition, ma
  // axios legge comunque il corpo invece di lasciar scaricare il browser: il
  // salvataggio va innescato a mano da un object URL. Revocato subito dopo,
  // altrimenti il blob resta in memoria fino al reload.
  exportData: async () => {
    const res = await api.get('/me/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rabar-dati.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// Immagini pubbliche: foto profilo e copertine degli eventi. Il browser
// ridimensiona e converte in JPEG (lato lungo `maxSide`), il backend firma
// l'upload URL, qui si fa il PUT. Restituisce path e URL pubblico.
export async function uploadImage(file, kind, maxSide) {
  const blob = await resizeImage(file, maxSide);
  const { data } = await api.post('/me/uploads/image', { kind, ext: 'jpg' });
  const u = data.upload;
  const res = await fetch(u.url, { method: 'PUT', headers: { 'content-type': u.content_type }, body: blob });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return { path: u.path, url: u.public_url };
}

/** Un'immagine qualsiasi (anche HEIC dove il browser la sa leggere) → JPEG ridotto. */
async function resizeImage(file, maxSide) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize'))), 'image/jpeg', 0.85),
  );
}

export const avatarApi = {
  // Carica e conferma: la foto passa dalla moderazione prima di diventare pubblica.
  set: async (file) => {
    const { path } = await uploadImage(file, 'avatar', 512);
    return api.put('/me/avatar', { path }).then((r) => r.data.profile);
  },
  remove: () => api.delete('/me/avatar').then((r) => r.data),
};

// Allegati di verifica (rivendicazione bar, richiesta PR/organizzatore).
export const PROOF_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'];
export const PROOF_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';
export const PROOF_MAX_FILES = 3;
export const PROOF_MAX_BYTES = 8 * 1024 * 1024;

const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

/**
 * Carica i file di prova e restituisce i path da mandare col form.
 * Il bucket è privato: il backend firma un upload URL per ogni file (path sotto
 * la cartella dell'utente), qui si fa solo il PUT dei byte. Nessuna credenziale
 * dello storage tocca il browser.
 */
export async function uploadProofs(files) {
  const { data } = await api.post('/me/uploads/proof', {
    files: [...files].map((f) => ({ ext: extOf(f.name) })),
  });
  const uploads = expectArray(data.uploads, 'proofUploads');
  await Promise.all(
    uploads.map(async (u, i) => {
      const res = await fetch(u.url, {
        method: 'PUT',
        headers: { 'content-type': u.content_type },
        body: files[i],
      });
      if (!res.ok) throw new Error(`upload ${res.status}`);
    }),
  );
  return uploads.map((u) => u.path);
}

// Public ice-cube leaderboard (all users, ranked).
export const leaderboardApi = {
  list: () => api.get('/leaderboard').then((r) => expectArray(r.data.leaderboard, 'leaderboard')),
};

// Public user profiles: profile popup (leaderboard / riconoscimenti) + credits.
export const usersApi = {
  publicProfile: (id) => api.get(`/users/${id}`).then((r) => r.data.profile),
  credits: () => api.get('/users/credits').then((r) => r.data),
};

// "Segnala il tuo bar" — public (works signed-out). La moderazione è nel
// pannello staff (repo `admin/`).
export const suggestionsApi = {
  create: (payload) => api.post('/suggestions', payload).then((r) => r.data.suggestion),
};

// Generic "segnala" reports from the account menu — create requires auth.
export const reportsApi = {
  create: (payload) => api.post('/reports', payload).then((r) => r.data.report),
};

// Drinks catalog + per-bar votes + proposals. Catalog/rankings are public;
// voting requires auth; suggest works signed-out (like suggestions).
export const drinksApi = {
  list: (params) =>
    api.get('/drinks', { params }).then((r) => ({
      ...r.data,
      drinks: expectArray(r.data.drinks, 'drinks'),
    })),
  get: (id) => api.get(`/drinks/${id}`).then((r) => r.data.drink),
  // Ranking: the bars that make this drink best.
  topBars: (id, params) =>
    api.get(`/drinks/${id}/bars`, { params }).then((r) => ({
      ...r.data,
      bars: expectArray(r.data.bars, 'drinkBars'),
    })),
  // The best drinks at a bar.
  forBar: (barId, params) =>
    api.get(`/bars/${barId}/drinks`, { params }).then((r) => ({
      ...r.data,
      drinks: expectArray(r.data.drinks, 'barDrinks'),
    })),
  // Upsert: same call creates and updates the caller's vote.
  vote: (id, payload) => api.post(`/drinks/${id}/votes`, payload).then((r) => r.data.vote),
  removeVote: (id, barId) => api.delete(`/drinks/${id}/votes/${barId}`).then((r) => r.data),
  myVotes: (params) =>
    api.get('/me/drink-votes', { params }).then((r) => expectArray(r.data.votes, 'myDrinkVotes')),
  suggest: (payload) => api.post('/drinks/suggestions', payload).then((r) => r.data.suggestion),
};

// Account organizzatore: richiesta upgrade (form 3 domande), claim bar,
// eventi propri. Tutte richiedono sessione.
export const organizerApi = {
  myRequest: () => api.get('/me/organizer-request').then((r) => r.data.request),
  submitRequest: (payload) =>
    api.post('/me/organizer-request', payload).then((r) => r.data.request),
  myClaims: () => api.get('/me/claims').then((r) => expectArray(r.data.claims, 'claims')),
  myEvents: () => api.get('/me/events').then((r) => expectArray(r.data.events, 'myEvents')),
  claimBar: (barId, payload) =>
    api.post(`/bars/${barId}/claim`, payload).then((r) => r.data.claim),
  redeemDrink: (token, barId) =>
    api.post('/bars/redeem-drink', { token, bar_id: barId }).then((r) => r.data),
  verifyPartyEntry: (pass) => api.post('/events/verify-entry', { pass }).then((r) => r.data),
};

// Follow di eventi/organizzatori. PUT/DELETE idempotenti (toggle ottimistico).
export const followsApi = {
  list: () => api.get('/me/follows').then((r) => expectArray(r.data.follows, 'follows')),
  follow: (target) => api.put('/follows', target).then((r) => r.data),
  unfollow: (target) => api.delete('/follows', { data: target }).then((r) => r.data),
};

// Inbox notifiche in-app (campanella).
export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  markRead: (payload) => api.post('/notifications/read', payload).then((r) => r.data),
};

// Registrazione Web Push (toggle in Impostazioni).
export const pushApi = {
  subscribe: (sub) => api.post('/push/subscribe', sub).then((r) => r.data),
  unsubscribe: (endpoint) =>
    api.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data),
};

// Boost sponsorizzati (Stripe Checkout). tiers è pubblico; checkout solo organizer.
export const boostsApi = {
  // { tiers: [...], radius: { min_km, max_km, cents_per_km_per_day } }
  tiers: () =>
    api.get('/boosts/tiers').then((r) => ({
      tiers: expectArray(r.data.tiers, 'tiers'),
      radius: r.data.radius ?? null,
    })),
  checkout: (payload) => api.post('/boosts/checkout', payload).then((r) => r.data.url),
  session: (sid) => api.get(`/boosts/session/${sid}`).then((r) => r.data.order),
};

// rabar+ — abbonamento (badge "+", tutti i temi, niente pubblicità).
// I prezzi arrivano dal server: il client manda solo il piano scelto.
export const plusApi = {
  plans: () => api.get('/plus/plans').then((r) => expectArray(r.data.plans, 'plusPlans')),
  status: () => api.get('/plus/status').then((r) => r.data),
  checkout: (plan) => api.post('/plus/checkout', { plan }).then((r) => r.data.url),
  portal: () => api.post('/plus/portal').then((r) => r.data.url),
};

// Statistiche di un bar: solo per il proprietario e l'admin. `advanced` è
// null finché il bar non ha un boost. La raccolta sta in services/stats.js.
export const statsApi = {
  bar: (barId, days) => api.get(`/stats/bars/${barId}`, { params: { days } }).then((r) => r.data.stats),
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
  // Risposta del proprietario: una sola per recensione, quindi PUT (upsert).
  reply: (barId, rid, risposta) =>
    api.put(`/bars/${barId}/ratings/${rid}/reply`, { risposta }).then((r) => r.data.rating),
  removeReply: (barId, rid) =>
    api.delete(`/bars/${barId}/ratings/${rid}/reply`).then((r) => r.data),
};
