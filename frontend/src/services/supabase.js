import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // Don't crash the whole app (createClient throws on empty url). Warn loudly;
  // auth features stay disabled until the env vars are set.
  console.error(
    'Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in frontend/.env, poi riavvia `npm run dev`.',
  );
}

// Browser client: persists the session and auto-refreshes tokens. Reads OAuth
// redirect results from the URL automatically (detectSessionInUrl). Falls back
// to a harmless placeholder when unconfigured so the public UI still renders.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
