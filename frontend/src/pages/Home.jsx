import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Map from '../components/Map.jsx';
import BarRow from '../components/BarRow.jsx';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import NavTabs from '../components/NavTabs.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Toast from '../components/Toast.jsx';
import BarSheet from '../components/BarSheet.jsx';
import { placesApi } from '../services/api.js';
import { barKey } from '../utils/score.js';
import { useAuth } from '../hooks/useAuth.js';
import { useBookmarks } from '../hooks/useBookmarks.js';
import { useSheetDrag } from '../hooks/useSheetDrag.js';

// Snap heights (dvh) for the mobile sheet: collapsed / expanded / fullscreen.
const SHEET_STOPS = [44, 84, 100];

const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_LAT) || 45.4654;
const DEFAULT_LNG = Number(import.meta.env.VITE_DEFAULT_LNG) || 9.1859;
const DEFAULT_ZOOM = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 14;

// Instant-paint cache: last nearby result per rounded coord+radius, in
// localStorage. Overpass is slow, so we show the previous result immediately and
// refresh in the background — the user sees bars in ~0ms on repeat visits.
// `v2` schema version: bump when the nearby payload changes (e.g. nightclubs
// added) so stale localStorage entries without the new POIs are ignored.
const nearbyKey = (lat, lng, r) => `rabar:nearby:v2:${lat.toFixed(2)},${lng.toFixed(2)},${r}`;
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

const TITLES = { vicini: 'Vicino a me', salvati: 'Salvati', cerca: 'Cerca' };

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

// Inner content of the sheet / desktop panel. Module-level so the search input
// keeps focus across re-renders.
function SheetBody({ tab, list, loading, error, query, setQuery, radius, setRadius, onReload, onWiden, onExplore, onSelect }) {
  return (
    <>
      {tab === 'cerca' ? (
        <div className="mb-3 space-y-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <Icon name="search" size={18} className="text-ember-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca un bar…"
              autoFocus
              className="w-full bg-transparent text-sm text-ember-cream outline-none placeholder:text-ember-muted"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Pulisci ricerca" className="text-ember-muted hover:text-ember-cream">
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 px-1 text-xs text-ember-muted">
            <Icon name="funnel" size={14} className="text-ember-primary" />
            Raggio {radius} km
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setRadius((r) => Math.max(1, r - 1))}
                aria-label="Riduci raggio"
                className="rounded-full bg-white/5 p-1.5 text-ember-cream hover:bg-white/10"
              >
                <Icon name="minus" size={14} />
              </button>
              <button
                onClick={() => setRadius((r) => Math.min(20, r + 1))}
                aria-label="Aumenta raggio"
                className="rounded-full bg-white/5 p-1.5 text-ember-cream hover:bg-white/10"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-2 px-1">
          <Icon name={tab === 'salvati' ? 'bookmark' : 'locate'} size={14} className="text-ember-primary" />
          <span className="font-display text-xs font-bold uppercase tracking-wide text-ember-muted">
            {TITLES[tab]}
          </span>
          <span className="text-xs text-ember-muted">· {list.length}</span>
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
        ) : tab === 'cerca' && query ? (
          <EmptyState title="Nessun risultato" hint={`Nessun bar trovato per “${query}”.`} pin="grigio" />
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
  const { isAuthenticated, user, logout } = useAuth();
  const { has, count, savedBars } = useBookmarks();

  const [center, setCenter] = useState([DEFAULT_LAT, DEFAULT_LNG]);
  const [userPos, setUserPos] = useState(null);
  const [radius, setRadius] = useState(2);
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('vicini');
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    height: sheetH,
    dragging,
    setHeight: setSheetH,
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
    // All bars come straight from OpenStreetMap (Overpass), enriched server-side
    // with community ratings (avg_overall/total_ratings) and distance.
    placesApi
      .nearby({ lat: center[0], lng: center[1], radius_km: radius })
      .then((data) => {
        if (cancelled) return;
        setBars(data);
        writeNearbyCache(center[0], center[1], radius, data);
      })
      .catch(() => {
        // Keep showing stale cache on failure; only error when we have nothing.
        if (!cancelled && !cached?.length) setError('Impossibile caricare i bar');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [center, radius, reloadKey]);

  // Close the account menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const visible = useMemo(() => {
    let list = bars;
    // Saved bars come from the account (all of them, even outside the radius);
    // signed-out users fall back to filtering the nearby set by local ids.
    if (tab === 'salvati') list = isAuthenticated ? savedBars : list.filter((b) => has(b.id));
    const q = query.trim().toLowerCase();
    if (tab === 'cerca' && q) list = list.filter((b) => b.name?.toLowerCase().includes(q));
    return [...list].sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
  }, [bars, tab, query, has, isAuthenticated, savedBars]);

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

  function onSelect(bar) {
    setSelected(bar);
    if (bar?.lat != null && bar?.lng != null) setFocus([bar.lat, bar.lng]);
  }

  function closeSheet() {
    setSelected(null);
    setFocus(null);
  }

  const sheetProps = {
    tab,
    list: visible,
    loading,
    error,
    query,
    setQuery,
    radius,
    setRadius,
    onReload: () => setReloadKey((k) => k + 1),
    onWiden: () => setRadius((r) => Math.min(20, r + 3)),
    onExplore: () => setTab('vicini'),
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
            <div className="absolute right-0 z-[1400] mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-ember-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5 text-sm text-ember-cream">
                <Icon name="user" size={16} className="text-ember-primary" />@{user.username}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ember-cream hover:bg-white/5"
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
      <div className="pointer-events-none absolute left-5 top-24 bottom-6 z-[1100] hidden w-[372px] flex-col gap-3 md:flex">
        <NavTabs
          className="pointer-events-auto"
          variant="rail"
          tab={tab}
          onTab={onTab}
          savedCount={count}
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
        className={`absolute z-[1100] flex flex-col overflow-hidden border border-white/10 bg-[#0f1116]/95 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl md:hidden ${
          sheetFull ? 'inset-0 rounded-none' : 'inset-x-3 bottom-3 rounded-3xl'
        }`}
        style={{
          height: sheetFull ? undefined : `${sheetH}dvh`,
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
        <BarSheet
          seed={selected}
          onClose={closeSheet}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
