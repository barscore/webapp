import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { supabase } from './services/supabase.js';
import Home from './pages/Home.jsx';
import BanBanner from './components/BanBanner.jsx';

// Route-level code splitting: only Home (the landing map) ships in the initial
// bundle; every other page loads on first navigation. Keeps heavy deps out of
// the critical path — recharts in particular only loads when a bar detail (or
// the admin panel) is opened.
const BarDetail = lazy(() => import('./pages/BarDetail.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const MyRatings = lazy(() => import('./pages/MyRatings.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Tos = lazy(() => import('./pages/Tos.jsx'));
const Maintenance = lazy(() => import('./pages/Maintenance.jsx'));

// Blank dark screen while a lazy page chunk downloads (matches the app bg, so
// no white flash).
const Fallback = <div className="h-[100dvh] w-full bg-ember-bg" />;

export default function App() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null); // { maintenance_mode, maintenance_reason, maintenance_eta }

  // Poll the maintenance switch on every navigation so a non-admin user gets
  // locked out (and released) without a manual reload.
  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_reason, maintenance_eta')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (data) return setMaint(data);
        // Fallback: if the reason/eta columns aren't there yet, still read the
        // switch alone so the screen isn't silently skipped.
        if (error) {
          supabase
            .from('app_settings')
            .select('maintenance_mode')
            .eq('id', 1)
            .maybeSingle()
            .then(({ data: d }) => {
              if (active && d) setMaint(d);
            });
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Block non-admins during maintenance. /login stays open so an admin can sign
  // in; admins reach everything (incl. /admin to flip it back off).
  if (!loading && maint?.maintenance_mode && !isAdmin && location.pathname !== '/login') {
    return (
      <Suspense fallback={Fallback}>
        <Maintenance reason={maint.maintenance_reason} eta={maint.maintenance_eta} />
      </Suspense>
    );
  }

  return (
    <>
      <BanBanner />
      <Suspense fallback={Fallback}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bar/:id" element={<BarDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/impostazioni" element={<Settings />} />
        <Route path="/le-tue-valutazioni" element={<MyRatings />} />
        <Route path="/classifica" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/tos" element={<Tos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
