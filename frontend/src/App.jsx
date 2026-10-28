import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { supabase } from './services/supabase.js';
import Home from './pages/Home.jsx';
import BanBanner from './components/BanBanner.jsx';
import TutorialSplash from './components/TutorialSplash.jsx';
import InstallHint from './components/InstallHint.jsx';
import { adsenseLoaded, loadAdsense } from './services/adsense.js';
import { gpcOptOut } from './services/consent.js';
import { setMonetization, useMonetization } from './services/monetization.js';
import { termsGateOpen } from './services/terms.js';
import { enforcePlusTheme } from './hooks/useTheme.js';
import { rememberAuthReturn, takePendingAuthReturn } from './hooks/useAuthReturn.js';

import ExplorerPromoModal from './components/ExplorerPromoModal.jsx';

// Route-level code splitting: only Home (the landing map) ships in the initial
// bundle; every other page loads on first navigation. Keeps heavy deps out of
// the critical path.
const BarDetail = lazy(() => import('./pages/BarDetail.jsx'));
const DrinkDetail = lazy(() => import('./pages/DrinkDetail.jsx'));
const EventDetail = lazy(() => import('./pages/EventDetail.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const MyRatings = lazy(() => import('./pages/MyRatings.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Tos = lazy(() => import('./pages/Tos.jsx'));
const Credits = lazy(() => import('./pages/Credits.jsx'));
const Maintenance = lazy(() => import('./pages/Maintenance.jsx'));
const BoostResult = lazy(() => import('./pages/BoostResult.jsx'));
const Plus = lazy(() => import('./pages/Plus.jsx'));
const Redeem = lazy(() => import('./pages/Redeem.jsx'));
const PartyEntry = lazy(() => import('./pages/PartyEntry.jsx'));
const ContentPage = lazy(() => import('./pages/ContentPage.jsx'));
const Cities = lazy(() => import('./pages/Cities.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
// Serve a pochi account, una volta sola: fuori dal bundle iniziale.
const TermsGate = lazy(() => import('./components/TermsGate.jsx'));

// Same list as CONTENT_SLUGS in content/pages.js — not imported from there so
// the page copy stays out of the initial bundle.
const CONTENT_SLUGS = ['come-funziona', 'faq', 'chi-siamo', 'contatti'];

// Blank dark screen while a lazy page chunk downloads (matches the app bg, so
// no white flash).
const Fallback = <div className="h-[100dvh] w-full bg-ember-bg" />;

export default function App() {
  const { isAdmin, role, isAuthenticated, loading, isPlus, user, profileReady, termsRequired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [maint, setMaint] = useState(null);
  const monetization = useMonetization();

  // Da dove si arriva a /login e /register: serve per riportarci l'utente a
  // login fatto. Le due pagine di auth non si memorizzano da sole.
  useEffect(() => {
    rememberAuthReturn(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Rientro da Google: se Supabase ha scartato il redirectTo e ci ha lasciati
  // in home, si va dove si era partiti (vedi useAuthReturn.js).
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = takePendingAuthReturn();
    if (pending && pending !== location.pathname + location.search) navigate(pending, { replace: true });
    // Solo all'arrivo della sessione, non a ogni navigazione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promo = params.get('promo');
    if (promo) {
      localStorage.setItem('rabar_promo', promo);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user && role !== null) {
      const stored = localStorage.getItem('rabar_promo');
      if (stored) {
        // Delay: the DB trigger that creates the profile row after signUp may
        // not have finished yet. Without this the POST /me/promo query finds
        // no row and silently does nothing.
        const timer = setTimeout(() => {
          import('./services/api.js').then(({ meApi }) => {
            meApi.applyPromo(stored).then((res) => {
              console.log('[rabar] promo applicata con successo');
              localStorage.removeItem('rabar_promo');
              if (res.is_new && !res.has_token) {
                localStorage.setItem('show_explorer_promo', '1');
              }
              window.location.reload();
            }).catch((err) => {
              console.error('[rabar] errore applicazione promo:', err);
              // Retry on next load
            });
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, role]);

  // AdSense. The script carries Google's consent message and holds every ad
  // request until the user answers it (see consent.js), so loading it is what
  // asks for consent — there is no banner of ours in front of it.
  // Acted on only once the profile is there (profileReady), or a subscriber
  // would get one frame of ads and a theme reset on every load.
  // rabar+ and a GPC signal skip the loader entirely: no script, not just no
  // visible units. Same with monetization switched off from the admin panel,
  // and until app_settings has said it is on (services/monetization.js).
  useEffect(() => {
    if (!profileReady || isPlus || !monetization || gpcOptOut()) return;
    loadAdsense();
  }, [profileReady, isPlus, monetization]);

  // Switched off while this tab already runs the script: Auto Ads keep filling
  // the page and a script can't be unloaded, so the page starts over without it.
  useEffect(() => {
    if (!monetization && adsenseLoaded()) window.location.reload();
  }, [monetization]);

  // Themes beyond the default are a rabar+ perk: when the subscription lapses
  // (or never existed) the app falls back to the default palette.
  useEffect(() => {
    if (profileReady) enforcePlusTheme(isPlus);
  }, [profileReady, isPlus]);

  // Poll the maintenance/beta/monetization switches on every navigation so a
  // non-admin user gets locked out (and released) without a manual reload.
  // `*` rather than a column list: a column whose migration hasn't run yet
  // would fail the whole select and silently drop the lock screens with it.
  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        // A failed read keeps the last answer: monetization starts off
        // (services/monetization.js) and a network blip must not flip it.
        if (!active || !data) return;
        setMonetization(data.monetization_enabled);
        setMaint(data);
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Lock screens. /login always stays open so a privileged user can sign in;
  // /privacy + /tos stay reachable too (legal notices must be public even
  // while the app is locked).
  // The role loads async after the session — wait for it before gating, or a
  // signed-in betatester would flash the lock screen on every load.
  const roleReady = !isAuthenticated || role !== null;
  const canBeta = isAdmin || role === 'moderator' || role === 'betatester';
  const alwaysOpen = ['/login', '/privacy', '/tos', '/contatti'].includes(location.pathname);
  if (!loading && roleReady && !alwaysOpen) {
    // Maintenance: only admins pass (the switch lives in the separate staff panel).
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
      {/* Home only: a first-visit modal over a bar page, a city or the FAQ
          hides the very content the visitor (or a reviewer) came for. */}
      {location.pathname === '/' && <TutorialSplash />}
      <ExplorerPromoModal />
      <InstallHint />
      {termsGateOpen(termsRequired, location.pathname) && (
        <Suspense fallback={null}>
          <TermsGate />
        </Suspense>
      )}
      <Suspense fallback={Fallback}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bar/:id" element={<BarDetail />} />
        <Route path="/drink/:id" element={<DrinkDetail />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/impostazioni" element={<Settings />} />
        <Route path="/le-tue-valutazioni" element={<MyRatings />} />
        <Route path="/classifica" element={<Leaderboard />} />
        <Route path="/boost/esito" element={<BoostResult />} />
        <Route path="/plus" element={<Plus />} />
        <Route path="/redeem" element={<Redeem />} />
        <Route path="/party-entry" element={<PartyEntry />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/tos" element={<Tos />} />
        <Route path="/riconoscimenti" element={<Credits />} />
        {CONTENT_SLUGS.map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<ContentPage slug={slug} />} />
        ))}
        <Route path="/citta" element={<Cities />} />
        <Route path="/citta/:slug" element={<Cities />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}
