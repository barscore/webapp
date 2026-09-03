import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

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
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  // rabar+ expiry, from the same profile row as the role. Plus = in the future.
  const [plusUntil, setPlusUntil] = useState(null);
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
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      // Niente lista di colonne, di proposito: qui dentro c'e' il RUOLO, cioe'
      // l'autorizzazione, e non deve dipendere da un extra a pagamento. Con
      // `role, plus_until` bastava che add_plus.sql non fosse ancora girato
      // (PostgREST 42703) per far fallire tutta la select e lasciare un admin
      // senza pannello sulla propria app. La riga e' quella dell'utente,
      // gia' leggibile da lui.
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        // Una lettura FALLITA non vuol dire "utente semplice". Trattarla come
        // tale declassava chiunque a `user`: con profiles.plus_until ancora
        // assente dal DB (PostgREST 42703) un admin si vedeva la schermata
        // "attendi l'approvazione di un moderatore" sulla propria app. Qui il
        // ruolo resta indeciso — `role === null` e' il segnale che i gate
        // aspettano, e nessuno agisce su una supposizione.
        if (error) {
          console.error('[rabar] lettura del profilo fallita', error);
          return;
        }
        setRole(data?.role ?? 'user');
        setPlusUntil(data?.plus_until ?? null);
      });
    // `role !== null` is the "profile row has landed" signal used by the
    // callers that must not act on a half-loaded session (theme lock, ads).
    return () => {
      active = false;
    };
  }, [user, plusTick]);

  // Email/password sign-in.
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toUser(data.user);
  }

  // Email/password sign-up. username is stored in user metadata; the DB trigger
  // copies it into profiles.
  async function register(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return toUser(data.user);
  }

  // Google OAuth — redirects to Google, returns to the app.
  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
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

  const isPlus = !!plusUntil && new Date(plusUntil) > new Date();

  const value = {
    user: user ? { ...user, role, plus: isPlus } : null,
    role,
    loading,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isPlus,
    plusUntil,
    refreshPlus,
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
