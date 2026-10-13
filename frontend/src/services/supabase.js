import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

// The two halves of supabase-js this app actually uses — auth and PostgREST —
// wired together the way `createClient` wires them. The full package also
// ships realtime, storage and edge functions, none of which is called from the
// browser: it was the biggest chunk of the first load for a login and two
// selects.
//
// Everything below mirrors SupabaseClient's constructor on purpose. The
// storage key above all: it is where the session lives, and a different one
// would sign every user out on their next visit.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // Don't crash the whole app (the URL below would throw on an empty string).
  // Warn loudly; auth features stay disabled until the env vars are set.
  console.error(
    'Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in frontend/.env, poi riavvia `npm run dev`.',
  );
}

// Falls back to a harmless placeholder when unconfigured so the public UI
// still renders.
const base = new URL(url || 'https://placeholder.supabase.co');
const key = anonKey || 'placeholder-anon-key';

// Persists the session and auto-refreshes tokens. Reads OAuth redirect results
// from the URL automatically (detectSessionInUrl).
const auth = new AuthClient({
  url: new URL('auth/v1', base).href,
  headers: { Authorization: `Bearer ${key}`, apikey: key },
  storageKey: `sb-${base.hostname.split('.')[0]}-auth-token`,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
});

// Every PostgREST call goes out as the signed-in user when there is one — RLS
// decides what they can read — and as the anonymous role otherwise.
async function fetchAsUser(input, init) {
  const { data } = await auth.getSession();
  const headers = new Headers(init?.headers);
  if (!headers.has('apikey')) headers.set('apikey', key);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${data.session?.access_token ?? key}`);
  }
  return fetch(input, { ...init, headers });
}

const rest = new PostgrestClient(new URL('rest/v1', base).href, {
  schema: 'public',
  fetch: fetchAsUser,
});

export const supabase = {
  auth,
  from: (relation) => rest.from(relation),
};
