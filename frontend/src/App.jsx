import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { supabase } from './services/supabase.js';
import Home from './pages/Home.jsx';
import BanBanner from './components/BanBanner.jsx';
import TutorialSplash from './components/TutorialSplash.jsx';
import InstallHint from './components/InstallHint.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import { loadAdsense, adsenseLoaded } from './services/adsense.js';
import { consentGranted, onConsentChange } from './services/consent.js';

// Route-level code splitting: only Home (the landing map) ships in the initial
// bundle; every other page loads on first navigation. Keeps heavy deps out of
// the critical path.
const BarDetail = lazy(() => import('./pages/BarDetail.jsx'));
const DrinkDetail = lazy(() => import('./pages/DrinkDetail.jsx'));
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
  const { isAdmin, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null); // { maintenance_mode, maintenance_reason, maintenance_eta, beta_mode }

  // AdSense strictly after consent (EU ePrivacy prior-blocking): no ad script,
  // no ad requests, no ad cookies until the user hits "Accetta". A revoke after
  // the script is already in the page needs a reload to actually drop it.
  useEffect(() => {
    if (consentGranted()) loadAdsense();
    return onConsentChange(() => {
      if (consentGranted()) loadAdsense();
      else if (adsenseLoaded()) window.location.reload();
    });
  }, []);

  // Poll the maintenance/beta switches on every navigation so a non-admin user
  // gets locked out (and released) without a manual reload.
  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_reason, maintenance_eta, beta_mode')
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

  // Lock screens. /login always stays open so a privileged user can sign in.
  // The role loads async after the session — wait for it before gating, or a
  // signed-in betatester would flash the lock screen on every load.
  const roleReady = !isAuthenticated || role !== null;
  const canBeta = isAdmin || role === 'moderator' || role === 'betatester';
  if (!loading && roleReady && location.pathname !== '/login') {
    // Maintenance: only admins pass (incl. /admin to flip it back off).
    if (maint?.maintenance_mode && !isAdmin) {
      return (
        <Suspense fallback={Fallback}>
          <Maintenance reason={maint.maintenance_reason} eta={maint.maintenance_eta} />
        </Suspense>
      );
    }
    // Beta program: admin/moderator/betatester pass, everyone else is locked
    // out (backend rejects their writes too — 503 BETA). A signed-in user has
    // an account waiting for promotion, so they get the "attendi l'approvazione
    // di un moderatore" variant instead of the generic lock. /register stays
    // reachable (unlike under maintenance) so people can sign up and land in
    // the pending state.
    if (maint?.beta_mode && !canBeta && !(location.pathname === '/register' && !isAuthenticated)) {
      return (
        <Suspense fallback={Fallback}>
          <Maintenance beta pending={isAuthenticated} />
        </Suspense>
      );
    }
  }

  return (
    <>
      <BanBanner />
      <TutorialSplash />
      <InstallHint />
      <CookieBanner />
      <Suspense fallback={Fallback}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bar/:id" element={<BarDetail />} />
        <Route path="/drink/:id" element={<DrinkDetail />} />
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
