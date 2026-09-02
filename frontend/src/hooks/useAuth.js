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
      .select('role, plus_until')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
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
