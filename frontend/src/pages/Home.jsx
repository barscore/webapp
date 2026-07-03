import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Map from '../components/Map.jsx';
import BarRow from '../components/BarRow.jsx';
import EventRow from '../components/EventRow.jsx';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import NavTabs from '../components/NavTabs.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Toast from '../components/Toast.jsx';
import SuggestModal from '../components/SuggestModal.jsx';

// Lazy: BarSheet pulls in recharts (radar chart, ~350KB min) — loading it on
// first bar tap keeps the landing bundle small.
const BarSheet = lazy(() => import('../components/BarSheet.jsx'));
import { placesApi, eventsApi, meApi } from '../services/api.js';
import { barKey } from '../utils/score.js';
import { openUntil23 } from '../utils/hours.js';
import { useAuth } from '../hooks/useAuth.js';
import { useBookmarks } from '../hooks/useBookmarks.js';
import { useSheetDrag, useIsMobile } from '../hooks/useSheetDrag.js';

// Snap heights (dvh) for the mobile sheet: collapsed / expanded / fullscreen.
const SHEET_STOPS = [44, 84, 100];

const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_LAT) || 45.4654;
const DEFAULT_LNG = Number(import.meta.env.VITE_DEFAULT_LNG) || 9.1859;
const DEFAULT_ZOOM = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 14;

// Instant-paint cache: last nearby result per rounded coord+radius, in
// localStorage. Overpass is slow, so we show the previous result immediately and
// refresh in the background — the user sees bars in ~0ms on repeat visits.
// `v3` schema version: bump when the nearby payload changes (e.g. nightclubs
// added) so stale localStorage entries without the new POIs are ignored.
const nearbyKey = (lat, lng, r) => `rabar:nearby:v3:${lat.toFixed(2)},${lng.toFixed(2)},${r}`;
function readNearbyCache(lat, lng, r) {
  try {
    return JSON.parse(localStorage.getItem(nearbyKey(lat, lng, r)));
  } catch {
    return null;
  }
}
function writeNearbyCache(lat, lng, r, data) {
  try {
    localStorage.setItem(nearbyKey(lat, lng, r), JSON.stringify(data));
  } catch {
    /* quota/full — ignore */
  }
}

const TITLES = { vicini: 'Vicino a me', salvati: 'Salvati', eventi: 'Eventi', cerca: 'Cerca' };

// Circular glass control used top-right (account + repositioning).
function GlassButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ember-bg/70 text-ember-cream shadow-lg backdrop-blur-md transition hover:text-ember-primary active:scale-95"
    >
      {children}
    </button>
  );
}

// Search input. On mobile it lives inside the sheet (cerca tab);
// on desktop it's a persistent bar above the nav rail.
function SearchPanel({ query, setQuery, autoFocus = false }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <Icon name="search" size={18} className="text-ember-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca un bar…"
        autoFocus={autoFocus}
        className="w-full bg-transparent text-sm text-ember-cream outline-none placeholder:text-ember-muted"
      />
      {query && (
        <button onClick={() => setQuery('')} aria-label="Pulisci ricerca" className="text-ember-muted hover:text-ember-cream">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

// Radius stepper — only in the "Vicino a me" section.
function RadiusControl({ radius, setRadius }) {
  return (
    <div className="flex items-center gap-3 px-1 text-xs text-ember-muted">
      <Icon name="funnel" size={14} className="text-ember-primary" />
      <span className="whitespace-nowrap tabular-nums">Raggio {radius} km</span>
      <input
        type="range"
        min="1"
        max="100"
        step="1"
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        aria-label="Raggio di ricerca in km"
        className="ml-auto w-32 accent-ember-primary"
      />
    </div>
  );
}

// Toggle: show only bars rated by the community (drop the unrated).
function RatedFilter({ ratedOnly, setRatedOnly }) {
  return (
    <button
      type="button"
      onClick={() => setRatedOnly((v) => !v)}
      aria-pressed={ratedOnly}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        ratedOnly
          ? 'border-ember-primary/60 bg-ember-primary/10 text-ember-primary'
          : 'border-white/10 text-ember-muted hover:text-ember-cream'
      }`}
    >
      <Icon name={ratedOnly ? 'check' : 'star'} size={13} /> Solo valutati
    </button>
  );
}

// Inner content of the sheet / desktop panel. Module-level so the search input
// keeps focus across re-renders.
function SheetBody({ tab, list, loading, searchActive, error, query, setQuery, radius, setRadius, ratedOnly, setRatedOnly, onReload, onWiden, onExplore, onSelect, onSuggest, events, eventsLoading, eventsError }) {
  // Eventi tab: zone events, soonest first. Separate data path (no map pins,
  // no bar rows) so it doesn't share the bars list flow below.
  if (tab === 'eventi') {
    return (
      <>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Icon name="bell" size={14} className="text-ember-primary" />
          <span className="font-display text-xs font-bold uppercase tracking-wide text-ember-muted">
            {TITLES.eventi}
          </span>
          <span className="text-xs text-ember-muted">· {events.length}</span>
        </div>

        {eventsLoading && (
          <p className="flex items-center gap-2 px-1 py-3 text-sm text-ember-muted">
            <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
          </p>
        )}

        {eventsError && !eventsLoading && (
          <div className="rounded-2xl border border-ember-accent/30 bg-white/[0.03] p-4 text-center">
            <p className="text-ember-accent">{eventsError}</p>
            <button
              onClick={onReload}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ember-primary px-4 py-2 font-semibold text-ember-bg"
            >
              <Icon name="reload" size={16} /> Riprova
            </button>
          </div>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <EmptyState
            title="Nessun evento"
            hint="Nessun evento in programma qui intorno. Prova ad allargare l'area."
            ctaLabel="Allarga area"
            ctaIcon="funnel"
            onCta={onWiden}
            pin="arancione"
          />
        )}

        {!eventsLoading && events.length > 0 && (
          <div className="space-y-2 pb-1">
            {events.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {tab === 'cerca' ? (
        <div className="mb-3">
          <SearchPanel query={query} setQuery={setQuery} autoFocus />
        </div>
      ) : (
        <div className="mb-2 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Icon name={searchActive ? 'search' : tab === 'salvati' ? 'bookmark' : 'locate'} size={14} className="text-ember-primary" />
            <span className="font-display text-xs font-bold uppercase tracking-wide text-ember-muted">
              {searchActive ? 'Risultati' : TITLES[tab]}
            </span>
            <span className="text-xs text-ember-muted">· {list.length}</span>
          </div>
          {tab === 'vicini' && !searchActive && (
            <>
              <RadiusControl radius={radius} setRadius={setRadius} />
              <div className="px-1">
                <RatedFilter ratedOnly={ratedOnly} setRatedOnly={setRatedOnly} />
              </div>
            </>
          )}
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 px-1 py-3 text-sm text-ember-muted">
          <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
        </p>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-ember-accent/30 bg-white/[0.03] p-4 text-center">
          <p className="text-ember-accent">{error}</p>
          <button
            onClick={onReload}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ember-primary px-4 py-2 font-semibold text-ember-bg"
          >
            <Icon name="reload" size={16} /> Riprova
          </button>
        </div>
      )}

      {!loading && !error && list.length === 0 && (
        tab === 'salvati' ? (
          <EmptyState
            title="Nessun bar salvato"
            hint="Apri un bar e tocca il segnalibro per ritrovarlo qui."
            ctaLabel="Esplora vicini"
            ctaIcon="locate"
            onCta={onExplore}
            pin="arancione"
          />
        ) : searchActive ? (
          <EmptyState
            title="Nessun risultato"
            hint="Non trovi il tuo bar di fiducia? Avvisaci e lo aggiungiamo alla mappa."
            ctaLabel="Avvisaci"
            ctaIcon="pin"
            onCta={onSuggest}
            pin="grigio"
          />
        ) : (
          <EmptyState
            title="Zona ancora vuota"
            hint="Nessun bar qui intorno. Prova ad allargare la ricerca."
            ctaLabel="Allarga area"
            ctaIcon="funnel"
            onCta={onWiden}
          />
        )
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-2 pb-1">
          {list.map((bar) => (
            <BarRow key={barKey(bar)} bar={bar} onSelect={onSelect} />
          ))}
        </div>
      )}
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { has, count, savedBars } = useBookmarks();
  const isMobile = useIsMobile();

  const [center, setCenter] = useState([DEFAULT_LAT, DEFAULT_LNG]);
  const [userPos, setUserPos] = useState(null);
  const [radius, setRadius] = useState(2);
  const [ratedOnly, setRatedOnly] = useState(false);
  const [profile, setProfile] = useState(null);
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [tab, setTab] = useState('vicini');
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const {
    height: sheetH,
    dragging,
    setHeight: setSheetH,
    sheetRef,
    grabberProps,
    contentProps,
  } = useSheetDrag(SHEET_STOPS, SHEET_STOPS[0]);
  const sheetFull = sheetH >= 99;
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);

  const accountRef = useRef(null);

  // Center on the user's location when available. Geolocation only works in a
  // secure context (HTTPS or localhost) — on iOS Safari/PWA over plain HTTP the
  // call fails silently, so we keep the default center as a fallback.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setCenter(p);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  // Load bars whenever center / radius / manual reload changes.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    // Instant paint: show last cached result for this area right away, so the
    // user never stares at a spinner while Overpass churns. Still refresh below.
    const cached = readNearbyCache(center[0], center[1], radius);
    if (cached?.length) {
      setBars(cached);
      setLoading(false); // have something to show; refresh silently
    } else {
      setLoading(true);
    }
    setError('');
    // Debounce: rapid radius +/- clicks (or map drags) must not each fire an
    // Overpass query — public mirrors rate-limit (429) heavy concurrent calls,
    // self-inflicting the "Impossibile caricare i bar" error. Wait for the value
    // to settle, then fire ONE request and abort it if superseded.
    const t = setTimeout(() => {
      // All bars come straight from OpenStreetMap (Overpass), enriched server-side
      // with community ratings (avg_overall/total_ratings) and distance.
      placesApi
        .nearby(
          { lat: center[0], lng: center[1], radius_km: radius },
          { signal: controller.signal },
        )
        .then((data) => {
          if (cancelled) return;
          setBars(data);
          writeNearbyCache(center[0], center[1], radius, data);
        })
        .catch((err) => {
          // Ignore aborts (superseded request); keep stale cache on real failure,
          // only surface an error when we have nothing to show.
          if (cancelled || err.code === 'ERR_CANCELED') return;
          if (!cached?.length) setError('Impossibile caricare i bar');
        })
        .finally(() => !cancelled && setLoading(false));
    }, 350);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [center, radius, reloadKey]);

  // Load zone events when the Eventi tab is active (and on area/reload change).
  // Lazy: no request until the user opens the tab.
  useEffect(() => {
    if (tab !== 'eventi') return;
    let cancelled = false;
    setEventsLoading(true);
    setEventsError('');
    eventsApi
      .nearby({ lat: center[0], lng: center[1], radius_km: radius })
      .then((data) => !cancelled && setEvents(data))
      .catch(() => !cancelled && setEventsError('Impossibile caricare gli eventi'))
      .finally(() => !cancelled && setEventsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, center, radius, reloadKey]);

  // Load the caller's profile (username, ice cubes, ratings…) for the account
  // card. Refetch on reloadKey so ice cubes update right after a new rating.
  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    meApi
      .profile()
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, reloadKey]);

  // Close the account menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // Search is global (whole planet). Active on the mobile cerca tab, or the
  // always-visible desktop search bar.
  const searchActive = query.trim().length >= 2 && (!isMobile || tab === 'cerca');

  const visible = useMemo(() => {
    // Global search: show the server-side worldwide results, not the nearby set.
    if (searchActive) {
      return [...searchResults].sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    }
    let list = bars;
    // Saved bars come from the account (all of them, even outside the radius);
    // signed-out users fall back to filtering the nearby set by local ids.
    if (tab === 'salvati') list = isAuthenticated ? savedBars : list.filter((b) => has(b.id));
    // Only show bars open at least until 23:00 local time. Venues whose
    // opening_hours are missing/unknown are kept (see openUntil23).
    list = list.filter((b) => openUntil23(b.opening_hours));
    // Optional filter: only bars rated by the community (drop the unrated).
    if (ratedOnly) list = list.filter((b) => (b.total_ratings ?? 0) > 0);
    return [...list].sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
  }, [searchActive, searchResults, bars, tab, has, isAuthenticated, savedBars, ratedOnly]);

  // Fire the global bar search (debounced) whenever the query changes.
  useEffect(() => {
    if (!searchActive) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    const q = query.trim();
    let cancelled = false;
    setSearchLoading(true);
    setSearchError('');
    const t = setTimeout(() => {
      placesApi
        .searchBars({ q, lat: center[0], lng: center[1] })
        .then((data) => {
          if (cancelled) return;
          setSearchResults(data);
          if (!data.length) setSearchError('');
        })
        .catch((e) => {
          if (cancelled) return;
          console.error('[ricerca bar] fallita:', e);
          setSearchResults([]);
          setSearchError(`Ricerca non riuscita: ${e.response?.status || ''} ${e.message}`);
        })
        .finally(() => !cancelled && setSearchLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchActive, query, center]);

  function locateMe() {
    if (!navigator.geolocation) return setToast({ msg: 'Geolocalizzazione non disponibile', icon: 'info' });
    if (!window.isSecureContext) {
      return setToast({ msg: 'Posizione disponibile solo su HTTPS', icon: 'info' });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setCenter(p);
        setToast({ msg: 'Posizione aggiornata', icon: 'locate' });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Permesso posizione negato'
            : 'Posizione non disponibile';
        setToast({ msg, icon: 'info' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function onTab(id) {
    setTab(id);
    setSheetH((h) => (h < 84 ? 84 : h));
  }

  // Stable identities so the memoized Map / BarRow don't re-render (all the
  // markers with them) on every unrelated Home state change.
  const onSelect = useCallback((bar) => {
    setSelected(bar);
    if (bar?.lat != null && bar?.lng != null) setFocus([bar.lat, bar.lng]);
  }, []);

  const closeSheet = useCallback(() => {
    setSelected(null);
    setFocus(null);
  }, []);

  const sheetProps = {
    tab,
    list: visible,
    loading: searchActive ? searchLoading : loading,
    searchActive,
    error: searchActive ? searchError : error,
    events,
    eventsLoading,
    eventsError,
    query,
    setQuery,
    radius,
    setRadius,
    ratedOnly,
    setRatedOnly,
    onReload: () => setReloadKey((k) => k + 1),
    onWiden: () => setRadius((r) => Math.min(100, r + 3)),
    onExplore: () => setTab('vicini'),
    onSuggest: () => setSuggestOpen(true),
    onSelect,
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0e1626]">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <Map
          bars={visible}
          center={center}
          zoom={DEFAULT_ZOOM}
          userPos={userPos}
          selectedKey={selected ? barKey(selected) : null}
          focus={focus}
          onSelect={onSelect}
        />
      </div>

      {/* Legibility gradient behind the top controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-32 bg-gradient-to-b from-black/60 via-black/25 to-transparent" />

      {/* Logo — top left (fades out when the mobile sheet is fullscreen) */}
      <div
        className={`absolute left-4 top-4 z-[1200] drop-shadow-lg transition-all duration-300 ease-out ${
          sheetFull ? 'max-md:pointer-events-none max-md:-translate-y-6 max-md:opacity-0' : ''
        }`}
      >
        <Link to="/" aria-label="rabar home">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Account + repositioning — top right (fades out when sheet is fullscreen) */}
      <div
        className={`absolute right-4 top-4 z-[1300] flex flex-col items-end gap-2 transition-all duration-300 ease-out ${
          sheetFull ? 'max-md:pointer-events-none max-md:-translate-y-6 max-md:opacity-0' : ''
        }`}
      >
        <div ref={accountRef} className="relative">
          <GlassButton
            label={isAuthenticated ? 'Account' : 'Accedi'}
            onClick={() => (isAuthenticated ? setMenuOpen((o) => !o) : navigate('/login'))}
          >
            <Icon name="user" size={22} />
          </GlassButton>
          {menuOpen && isAuthenticated && (
            <div className="absolute right-0 z-[1400] mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ember-card shadow-xl">
              {/* Own profile card — no need to open Impostazioni to see this. */}
              <div className="border-b border-white/5 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ember-cream">
                  <Icon name="user" size={16} className="text-ember-primary" />@{user.username}
                </div>
                {profile?.email && (
                  <div className="mt-1 truncate text-xs text-ember-muted">{profile.email}</div>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-ember-muted">
                  <span className="flex items-center gap-1">
                    <Icon name="review" size={13} className="text-ember-primary" />
                    {profile ? profile.ratings_count : '…'} valutazioni
                  </span>
                  {profile?.created_at && (
                    <span>dal {new Date(profile.created_at).toLocaleDateString('it-IT')}</span>
                  )}
                </div>
                {/* Ice cubes → tap to open the leaderboard. */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/classifica');
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm text-ember-cream transition hover:border-ember-primary/50"
                >
                  <img src="/icons/ice.png" alt="" width={18} height={18} className="shrink-0 object-contain" />
                  <span className="font-display font-bold tabular-nums">
                    {profile ? profile.ice_cubes : '…'}
                  </span>
                  <span className="text-xs text-ember-muted">ice cubes</span>
                  <Icon name="arrow-left" size={13} className="ml-auto rotate-180 text-ember-muted" />
                </button>
              </div>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left text-sm font-semibold text-ember-primary hover:bg-white/5"
                >
                  <Icon name="filters" size={16} className="text-ember-primary" /> Pannello admin
                </Link>
              )}
              <Link
                to="/impostazioni"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ember-cream hover:bg-white/5"
              >
                <Icon name="filters" size={16} className="text-ember-primary" /> Impostazioni
              </Link>
              <Link
                to="/le-tue-valutazioni"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left text-sm text-ember-cream hover:bg-white/5"
              >
                <Icon name="star" size={16} className="text-ember-primary" /> Le tue valutazioni
              </Link>
              <div className="flex items-center gap-3 border-t border-white/5 px-3 py-2 text-xs text-ember-muted">
                <Link to="/privacy" onClick={() => setMenuOpen(false)} className="hover:text-ember-primary">
                  Privacy
                </Link>
                <span className="text-white/15">·</span>
                <Link to="/tos" onClick={() => setMenuOpen(false)} className="hover:text-ember-primary">
                  Termini
                </Link>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2.5 text-left text-sm text-ember-cream hover:bg-white/5"
              >
                <Icon name="arrow-left" size={16} /> Esci
              </button>
            </div>
          )}
        </div>
        <GlassButton label="La mia posizione" onClick={locateMe}>
          <Icon name="locate" size={22} />
        </GlassButton>
      </div>

      {/* Desktop: floating tab menu (left) + list panel below it */}
      <div className="pointer-events-none absolute left-5 top-24 bottom-6 z-[1100] hidden w-[440px] flex-col gap-3 md:flex">
        <div className="pointer-events-auto rounded-3xl border border-white/10 bg-ember-bg/80 p-3 shadow-xl backdrop-blur">
          <SearchPanel query={query} setQuery={setQuery} />
        </div>
        <NavTabs
          className="pointer-events-auto"
          variant="rail"
          tab={tab}
          onTab={onTab}
          savedCount={count}
          exclude={['cerca']}
        />
        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f1116]/90 shadow-2xl backdrop-blur-xl">
          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <SheetBody {...sheetProps} />
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet with tab bar. Drag the grabber to resize;
          it snaps to collapsed / expanded / fullscreen. */}
      <section
        ref={sheetRef}
        className={`absolute z-[1100] flex flex-col overflow-hidden border border-white/10 bg-[#0f1116] shadow-[0_10px_40px_rgba(0,0,0,0.55)] md:hidden ${
          sheetFull ? 'inset-x-0 bottom-0 rounded-none' : 'inset-x-3 bottom-3 rounded-3xl'
        }`}
        style={{
          // Always bottom-anchored with an explicit height (never inset-0):
          // the imperative drag writes `height` directly, so the sheet must
          // grow/shrink from the bottom even while the full-screen classes are
          // still applied.
          height: `${sheetH}dvh`,
          transition: dragging ? 'none' : 'height 0.28s ease',
        }}
      >
        <div
          {...grabberProps}
          role="separator"
          aria-label="Trascina per ridimensionare"
          className="flex w-full touch-none justify-center pb-1 pt-2.5"
        >
          <span className="h-1.5 w-10 rounded-full bg-white/25" />
        </div>
        <div {...contentProps} className="no-scrollbar flex-1 touch-none overflow-y-auto px-4 pb-2">
          <SheetBody {...sheetProps} />
        </div>
        <div className="border-t border-white/5 px-3 pb-3 pt-2">
          <NavTabs variant="bar" tab={tab} onTab={onTab} savedCount={count} />
        </div>
      </section>

      {selected && (
        <Suspense fallback={null}>
          <BarSheet
            seed={selected}
            onClose={closeSheet}
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        </Suspense>
      )}

      {suggestOpen && (
        <SuggestModal
          initialName={query.trim()}
          coords={center}
          onClose={() => setSuggestOpen(false)}
          onSent={() => setToast({ msg: 'Grazie! Segnalazione inviata', icon: 'check' })}
        />
      )}

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
