import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import { hasTermsTick, clearTermsTick } from '../services/terms.js';
import { pingActive } from '../services/stats.js';

const AuthContext = createContext(null);

// Maps a Supabase session user to the shape the UI expects.
function toUser(sessionUser) {
  if (!sessionUser) return null;
  const meta = sessionUser.user_metadata || {};
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    username:
      meta.username ||
      meta.full_name ||
      meta.name ||
      sessionUser.email?.split('@')[0] ||
      'utente',
    avatar_url: meta.avatar_url || meta.picture || null,
    // Quando l'utente ha accettato Privacy e Termini — vedi services/terms.js.
    termsAcceptedAt: meta.terms_accepted_at || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  // rabar+ expiry, from the same profile row as the role. Plus = in the future.
  const [plusUntil, setPlusUntil] = useState(null);
  const [isExplorer, setIsExplorer] = useState(false);
  const [freeDrinkToken, setFreeDrinkToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session (also resolves the OAuth redirect hash).
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user));
      setLoading(false);
    });

    // Keep state in sync across login/logout/refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  // App role and rabar+ entitlement live in the profiles table (not the JWT).
  // Load them when the user changes; RLS lets a user read their own row.
  const [plusTick, setPlusTick] = useState(0);
  useEffect(() => {
    if (!user) {
      setRole(null);
      setPlusUntil(null);
      setIsExplorer(false);
      setFreeDrinkToken(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('role, plus_until, is_explorer, free_drink_token')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        // Una lettura FALLITA non vuol dire "utente semplice".
        if (error) {
          console.error('[rabar] lettura del profilo fallita', error);
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data: only, error: err2 }) => {
              if (active && !err2) setRole(only?.role ?? 'user');
            });
          return;
        }
        setRole(data?.role ?? 'user');
        setPlusUntil(data?.plus_until ?? null);
        setIsExplorer(data?.is_explorer ?? false);
        setFreeDrinkToken(data?.free_drink_token ?? null);
      });
    // `role !== null` is the "profile row has landed" signal used by the
    // callers that must not act on a half-loaded session (theme lock, ads).
    return () => {
      active = false;
    };
  }, [user, plusTick]);

  // Email/username password sign-in.
  async function login(loginStr, password) {
    if (loginStr.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginStr, password });
      if (error) throw error;
      return toUser(data.user);
    } else {
      const res = await api.post('/auth/login', { login: loginStr, password });
      const { session } = res.data;
      const { data, error } = await supabase.auth.setSession(session);
      if (error) throw error;
      return toUser(data.user);
    }
  }

  // Email/password sign-up. username is stored in user metadata; the DB trigger
  // copies it into profiles. Il form non parte senza la spunta su Privacy e
  // Termini, quindi l'accettazione nasce insieme all'account.
  async function register(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, terms_accepted_at: new Date().toISOString() } },
    });
    if (error) throw error;
    return toUser(data.user);
  }

  // Registra l'accettazione sull'account. Sta nei metadati utente perché è una
  // dichiarazione dell'utente su se stesso: non apre nessun permesso, e così
  // vale per ogni via d'accesso senza una colonna né una rotta in più.
  async function acceptTerms() {
    const { data, error } = await supabase.auth.updateUser({
      data: { terms_accepted_at: new Date().toISOString() },
    });
    if (error) throw error;
    setUser(toUser(data.user));
  }

  // Chi ha spuntato la casella in Register e poi ha scelto Google torna qui
  // senza metadati (il redirect OAuth non li porta): la spunta lasciata prima
  // di partire diventa l'accettazione, senza chiederla una seconda volta.
  const [savingTick, setSavingTick] = useState(false);
  const userId = user?.id;
  const termsAcceptedAt = user?.termsAcceptedAt;
  useEffect(() => {
    if (!userId || termsAcceptedAt || !hasTermsTick()) return;
    setSavingTick(true);
    clearTermsTick();
    acceptTerms()
      .catch((err) => console.error('[rabar] accettazione dei termini non salvata', err))
      .finally(() => setSavingTick(false));
  }, [userId, termsAcceptedAt]);

  // Utenti attivi del pannello admin: un ping all'avvio e a ogni login
  // (diradato in services/stats.js).
  useEffect(() => {
    pingActive(userId);
  }, [userId]);

  // Google OAuth — redirects to Google, returns to the app.
  // `returnTo` è già normalizzato da useAuthReturn (solo path interni).
  async function loginWithGoogle(returnTo = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + returnTo },
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // Re-read the profile row — used after a rabar+ checkout comes back, so the
  // badge and the unlocked themes appear without a reload.
  const refreshPlus = () => setPlusTick((n) => n + 1);
  if (typeof window !== 'undefined') window.__refreshAuth = refreshPlus;
  
  const isPlus = !!plusUntil && new Date(plusUntil) > new Date();
  // Account senza accettazione registrata: TermsGate lo ferma finché non c'è.
  const termsRequired = !!user && !user.termsAcceptedAt && !savingTick && !hasTermsTick();

  const value = {
    user: user ? { ...user, role, plus: isPlus, is_explorer: isExplorer, free_drink_token: freeDrinkToken } : null,
    role,
    loading,
    // The profile row (role + rabar+) lands after the session: callers that
    // must not act on a half-loaded session (theme lock, ads) wait for this.
    profileReady: !loading && (!user || role !== null),
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    // Staff = chi entra nel pannello: i moderatori vedono solo i tab di moderazione.
    isStaff: role === 'admin' || role === 'moderator',
    isPlus,
    plusUntil,
    isExplorer,
    freeDrinkToken,
    refreshPlus,
    termsRequired,
    acceptTerms,
    login,
    register,
    loginWithGoogle,
    logout,
  };
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
