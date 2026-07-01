import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import RadarChart from './RadarChart.jsx';
import RatingBars from './RatingBars.jsx';
import RatingForm from './RatingForm.jsx';
import Icon from './Icon.jsx';
import Toast from './Toast.jsx';
import EmptyState from './EmptyState.jsx';
import { barsApi, ratingsApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useBookmarks } from '../hooks/useBookmarks.js';
import { useSheetDrag, useIsMobile } from '../hooks/useSheetDrag.js';
import { shareBar } from '../utils/share.js';
import { barKey } from '../utils/score.js';

const PAGE_SIZE = 10;

// Snap heights (dvh) for the mobile bar sheet: as-is / fullscreen.
const BAR_STOPS = [88, 100];

// Same detail data flow as the /bar/:id page, rendered as a bottom sheet that
// slides up over the Home menu. `seed` is the bar from the list/map (may be an
// OSM-only place); it's resolved to a persisted row so ratings can attach.
function parseOsmToken(id) {
  if (!id?.startsWith('osm_')) return null;
  const [, osm_type, osm_node_id] = id.split('_');
  return { osm_type, osm_node_id: Number(osm_node_id) };
}

export default function BarSheet({ seed, onClose, onChanged }) {
  const { isAuthenticated, user } = useAuth();
  const { has, toggle } = useBookmarks();
  const isMobile = useIsMobile();
  const { height, dragging, grabberProps, contentProps } = useSheetDrag(BAR_STOPS, BAR_STOPS[0]);
  const full = isMobile && height >= 99;

  const [bar, setBar] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState(null);

  const key = barKey(seed);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const osm = parseOsmToken(key);
      const barData = osm ? await barsApi.resolve({ ...osm, ...seed }) : await barsApi.get(key);
      const ratingData = await ratingsApi.list(barData.id, { page, limit: PAGE_SIZE });
      setBar(barData);
      setRatings(ratingData.ratings);
      const total = ratingData.total ?? ratingData.pagination?.total;
      setHasMore(total != null ? page * PAGE_SIZE < total : ratingData.ratings.length === PAGE_SIZE);
    } catch {
      setError('Bar non trovato');
    } finally {
      setLoading(false);
    }
  }, [key, page, seed]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset paging when a different bar is opened in the same sheet.
  useEffect(() => {
    setPage(1);
    setShowForm(false);
    setShowInfo(false);
  }, [key]);

  const myRating = ratings.find((r) => r.profiles?.username === user?.username);

  async function submitRating(payload) {
    if (myRating) await ratingsApi.update(bar.id, myRating.id, payload);
    else await ratingsApi.create(bar.id, payload);
    setShowForm(false);
    setPage(1);
    await load();
    onChanged?.();
    setToast({ msg: 'Valutazione salvata', icon: 'check' });
  }

  async function deleteRating() {
    if (!myRating) return;
    await ratingsApi.remove(bar.id, myRating.id);
    setShowForm(false);
    await load();
    onChanged?.();
    setToast({ msg: 'Valutazione eliminata', icon: 'trash' });
  }

  async function onShare() {
    const res = await shareBar(bar);
    if (res === 'copied') setToast({ msg: 'Link copiato', icon: 'link' });
  }

  const summary = bar?.bar_ratings_summary;
  const overall = Number(summary?.avg_overall) || 0;
  const saved = bar ? has(bar.id) : false;
  const tags = bar?.tags || [];

  return (
    <>
      {/* Tap-outside backdrop to dismiss. */}
      <div className="absolute inset-0 z-[1450] bg-black/40" onClick={onClose} aria-hidden />

      <section
        role="dialog"
        aria-modal="true"
        className={`rabar-sheet-in absolute z-[1500] flex flex-col overflow-hidden border border-white/10 bg-[#0f1116]/95 shadow-[0_-10px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
          isMobile
            ? full
              ? 'inset-0 rounded-none'
              : 'inset-x-3 bottom-3 rounded-3xl'
            : 'inset-x-3 bottom-3 top-16 rounded-3xl md:inset-x-auto md:left-5 md:top-24 md:bottom-6 md:w-[372px]'
        }`}
        style={
          isMobile && !full
            ? { height: `${height}dvh`, transition: dragging ? 'none' : 'height 0.25s ease' }
            : undefined
        }
      >
        {/* Grabber (drag to resize / fullscreen) + close */}
        <div className="relative flex items-center justify-center">
          <div
            {...(isMobile ? grabberProps : {})}
            role="separator"
            aria-label="Trascina per ridimensionare"
            className="flex touch-none justify-center px-8 pb-2 pt-3"
          >
            <span className="h-1.5 w-10 rounded-full bg-white/25" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ember-cream hover:bg-white/10"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div
          {...(isMobile ? contentProps : {})}
          className={`no-scrollbar flex-1 overflow-y-auto px-4 pb-4 ${isMobile ? 'touch-none' : ''}`}
        >
          {loading && !bar && (
            <p className="flex items-center gap-2 py-6 text-sm text-ember-muted">
              <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
            </p>
          )}

          {error && (
            <p className="py-6 text-center text-ember-accent">{error}</p>
          )}

          {bar && (
            <div className="space-y-4">
              {/* Title + score */}
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-bold text-ember-cream">{bar.name}</h1>
                  <p className="flex items-center gap-1 text-sm text-ember-muted">
                    <Icon name="pin" size={14} />
                    {[bar.address, bar.city].filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-ember-primary px-2.5 py-1.5 font-display font-bold text-ember-bg">
                  <Icon name="star" size={14} />
                  {(overall * 2).toFixed(1)}
                </span>
              </div>

              {/* Contact / info actions */}
              <div className="flex flex-wrap gap-2">
                {bar.phone && (
                  <a href={`tel:${bar.phone}`} className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream">
                    <Icon name="phone" size={16} className="text-ember-primary" /> Chiama
                  </a>
                )}
                {bar.website && (
                  <a href={bar.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream">
                    <Icon name="link" size={16} className="text-ember-primary" /> Sito
                  </a>
                )}
                <button
                  onClick={() => setShowInfo((o) => !o)}
                  aria-expanded={showInfo}
                  className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream"
                >
                  <Icon name="info" size={16} className="text-ember-primary" /> Info
                  <Icon name={showInfo ? 'chevron-up' : 'chevron-down'} size={14} />
                </button>
                <button
                  onClick={() => toggle(bar.id)}
                  aria-pressed={saved}
                  aria-label={saved ? 'Rimuovi dai salvati' : 'Salva'}
                  className={`flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm ${saved ? 'text-ember-primary' : 'text-ember-cream'}`}
                >
                  <Icon name="bookmark" size={16} />
                </button>
                <button onClick={onShare} aria-label="Condividi" className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream">
                  <Icon name="share" size={16} />
                </button>
              </div>

              {showInfo && (
                <div className="space-y-1 rounded-card border border-white/5 bg-ember-card p-4 text-sm text-ember-muted">
                  <p className="flex items-center gap-2">
                    <Icon name="pin" size={14} className="text-ember-primary" />
                    {[bar.address, bar.city].filter(Boolean).join(', ')}
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name={bar.is_active === false ? 'close' : 'check'} size={14} className="text-ember-primary" />
                    {bar.is_active === false ? 'Attualmente chiuso' : 'Aperto'}
                  </p>
                  {bar.phone && (
                    <p className="flex items-center gap-2">
                      <Icon name="phone" size={14} className="text-ember-primary" />
                      {bar.phone}
                    </p>
                  )}
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full border border-ember-primary/50 px-3 py-1 text-xs text-ember-cream">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Community rating */}
              <section className="rounded-card border border-white/5 bg-ember-card p-4">
                <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
                  <Icon name="star" size={18} className="text-ember-primary" />
                  Community
                  <span className="ml-auto text-sm font-normal text-ember-muted">
                    {summary?.total_ratings || 0} voti
                  </span>
                </h2>
                <RatingBars summary={summary} />
                <div className="mt-4">
                  <RadarChart summary={summary} />
                </div>
              </section>

              {/* Rate CTA / form */}
              {isAuthenticated ? (
                showForm ? (
                  <RatingForm
                    initial={myRating}
                    onSubmit={submitRating}
                    onCancel={() => setShowForm(false)}
                    onDelete={myRating ? deleteRating : undefined}
                  />
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary py-3 font-semibold text-ember-bg active:scale-[0.99]"
                  >
                    <Icon name={myRating ? 'edit' : 'star'} size={18} />
                    {myRating ? 'Modifica valutazione' : 'Valuta questo bar'}
                  </button>
                )
              ) : (
                <Link to="/login" className="flex items-center justify-center gap-2 rounded-lg bg-ember-card py-3 text-center text-ember-cream">
                  <Icon name="user" size={18} className="text-ember-primary" />
                  Accedi per valutare
                </Link>
              )}

              {/* Reviews */}
              <section>
                <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-ember-cream">
                  <Icon name="review" size={18} className="text-ember-primary" />
                  Recensioni
                </h2>
                {ratings.length === 0 ? (
                  <EmptyState title="Sii il primo" hint="Nessuna recensione ancora." pin="arancione" />
                ) : (
                  <div className="space-y-2">
                    {ratings.map((r) => (
                      <div key={r.id} className="rounded-card bg-ember-card p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-ember-cream">
                            <Icon name="user" size={14} className="text-ember-muted" />
                            @{r.profiles?.username || 'utente'}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-ember-primary">
                            <span className="flex items-center gap-0.5"><Icon name="euro" size={12} />{r.prezzo}</span>
                            <span className="flex items-center gap-0.5"><Icon name="bottle" size={12} />{r.qualita_alcol}</span>
                            <span className="flex items-center gap-0.5"><Icon name="social" size={12} />{r.socialita}</span>
                          </span>
                        </div>
                        {r.commento && <p className="mt-1 text-ember-muted">{r.commento}</p>}
                      </div>
                    ))}

                    {(page > 1 || hasMore) && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="flex items-center gap-1 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream disabled:opacity-40"
                        >
                          <Icon name="arrow-left" size={16} /> Prec.
                        </button>
                        <span className="text-xs text-ember-muted">Pagina {page}</span>
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!hasMore}
                          className="flex items-center gap-1 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream disabled:opacity-40"
                        >
                          Succ. <Icon name="arrow-right" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
      </section>
    </>
  );
}
