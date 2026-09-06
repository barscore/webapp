import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import RadarChart from './RadarChart.jsx';
import ScoreBadge from './ScoreBadge.jsx';
import { SkeletonBar } from './Skeleton.jsx';
import RatingBars from './RatingBars.jsx';
import RatingForm from './RatingForm.jsx';
import BarDrinksSection from './BarDrinksSection.jsx';
import DirectionsButton from './DirectionsButton.jsx';
import Icon from './Icon.jsx';
import PlusBadge from './PlusBadge.jsx';
import ExplorerBadge from './ExplorerBadge.jsx';
import Toast from './Toast.jsx';
import EmptyState from './EmptyState.jsx';
import BarOwnerActions from './BarOwnerActions.jsx';
import { barsApi, ratingsApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useBookmarks } from '../hooks/useBookmarks.js';
import { useSheetDrag, useIsMobile } from '../hooks/useSheetDrag.js';
import { shareBar } from '../utils/share.js';
import { barKey, parseOsmToken } from '../utils/score.js';
import { useI18n } from '../i18n/index.js';
import FreeDrinkModal from './FreeDrinkModal.jsx';

const PAGE_SIZE = 10;

// Snap heights (dvh) for the mobile bar sheet: as-is / fullscreen.
const BAR_STOPS = [88, 100];

// Same detail data flow as the /bar/:id page, rendered as a bottom sheet that
// slides up over the Home menu. `seed` is the bar from the list/map (may be an
// OSM-only place); it's resolved to a persisted row so ratings can attach.
export default function BarSheet({ seed, onClose, onChanged }) {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const { has, toggle } = useBookmarks();
  const isMobile = useIsMobile();
  const { height, dragging, sheetRef, grabberProps, contentProps } = useSheetDrag(BAR_STOPS, BAR_STOPS[0]);
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
  const [freeDrinkOpen, setFreeDrinkOpen] = useState(false);

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
      setError(t('bar.notFound'));
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
    setToast({ msg: t('bar.ratingSaved'), icon: 'check' });
  }

  async function deleteRating() {
    if (!myRating) return;
    await ratingsApi.remove(bar.id, myRating.id);
    setShowForm(false);
    await load();
    onChanged?.();
    setToast({ msg: t('bar.ratingDeleted'), icon: 'trash' });
  }

  async function onShare() {
    const res = await shareBar(bar);
    if (res === 'copied') setToast({ msg: t('bar.linkCopied'), icon: 'link' });
  }

  const summary = bar?.bar_ratings_summary;
  const overall = Number(summary?.avg_overall) || 0;
  const saved = bar ? has(bar.id) : false;
  const tags = bar?.tags || [];

  return (
    <>
      {/* Tap-outside backdrop to dismiss. */}
      <div className="absolute inset-0 z-[1450] bg-black/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />

      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`rabar-sheet-in sheet absolute z-[1500] flex flex-col overflow-hidden ${
          isMobile
            ? full
              ? 'inset-x-0 bottom-0 rounded-none'
              : 'inset-x-3 bottom-3 rounded-sheet'
            : 'inset-x-3 bottom-3 top-16 rounded-sheet md:inset-x-auto md:left-5 md:top-24 md:bottom-6 md:w-[372px]'
        }`}
        style={
          // Bottom-anchored with explicit height (never inset-0) so the
          // imperative drag can shrink the sheet from fullscreen too.
          isMobile
            ? { height: `${height}dvh`, transition: dragging ? 'none' : 'height 250ms cubic-bezier(0.22, 1, 0.36, 1)' }
            : undefined
        }
      >
        {/* Grabber (drag to resize / fullscreen) + close */}
        <div className="relative flex items-center justify-center">
          <div
            {...(isMobile ? grabberProps : {})}
            role="separator"
            aria-label={t('common.dragResize')}
            className="flex touch-none justify-center px-8 pb-2 pt-3"
          >
            <span className="h-1.5 w-10 rounded-full bg-ember-line/25" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="press absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ember-line/5 text-ember-cream transition-colors hover:bg-ember-line/10"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div
          {...(isMobile ? contentProps : {})}
          className={`no-scrollbar flex-1 overflow-y-auto px-4 pb-4 ${isMobile ? 'touch-none' : ''}`}
        >
          {loading && !bar && (
            <SkeletonBar label={t('common.loading')} />
          )}

          {error && (
            <p className="py-6 text-center text-ember-danger">{error}</p>
          )}

          {bar && (
            <div className="space-y-5">
              {/* Hero: name leads, the score badge is the second thing you see. */}
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  {bar.sponsored && (
                    <span className="mb-1 inline-block rounded-full bg-ember-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-ink">
                      Sponsorizzato
                    </span>
                  )}
                  <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-ember-cream">
                    {bar.name}
                  </h1>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
                    <Icon name="pin" size={13} />
                    <span className="truncate">
                      {[bar.address, bar.city].filter(Boolean).join(', ')}
                    </span>
                  </p>
                </div>
                <ScoreBadge bar={bar} size="lg" />
              </div>

              {bar.accepts_free_drinks && user?.free_drink_token && (
                <div className="rounded-xl border border-ember-primary bg-ember-primary/10 p-4">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ember-cream">
                    <Icon name="star" size={20} className="text-ember-primary" />
                    Questo locale accetta il Free Drink!
                  </h3>
                  {bar.free_drinks_hours && (
                    <p className="mt-1 text-sm text-ember-muted">
                      Valido in queste fasce orarie: <span className="font-semibold text-ember-cream">{bar.free_drinks_hours}</span>
                    </p>
                  )}
                  <button
                    onClick={() => setFreeDrinkOpen(true)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary/20 py-3 font-bold text-ember-primary hover:bg-ember-primary/30"
                  >
                    <Icon name="star" size={18} /> Apri QR Code
                  </button>
                </div>
              )}

              {/* Contact / info actions — pills, not slabs. */}
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {bar.phone && (
                  <a href={`tel:${bar.phone}`} className="chip">
                    <Icon name="phone" size={15} className="text-ember-ink" /> {t('bar.call')}
                  </a>
                )}
                {bar.website && (
                  <a href={bar.website} target="_blank" rel="noreferrer" className="chip">
                    <Icon name="link" size={15} className="text-ember-ink" /> {t('bar.site')}
                  </a>
                )}
                <DirectionsButton bar={bar} />
                <button
                  onClick={() => setShowInfo((o) => !o)}
                  aria-expanded={showInfo}
                  className="chip"
                >
                  <Icon name="info" size={15} className="text-ember-ink" /> {t('bar.info')}
                  <Icon name={showInfo ? 'chevron-up' : 'chevron-down'} size={13} />
                </button>
                <button
                  onClick={() => toggle(bar.id)}
                  aria-pressed={saved}
                  aria-label={saved ? t('bar.removeBookmark') : t('bar.saveBookmark')}
                  className={`chip ${saved ? 'chip-on' : ''}`}
                >
                  <Icon name="bookmark" size={15} />
                </button>
                <button onClick={onShare} aria-label={t('common.share')} className="chip">
                  <Icon name="share" size={15} />
                </button>
              </div>

              <BarOwnerActions bar={bar} onToast={setToast} />

              {showInfo && (
                <div className="card space-y-1 p-4 text-sm text-ember-muted">
                  <p className="flex items-center gap-2">
                    <Icon name="pin" size={14} className="text-ember-ink" />
                    {[bar.address, bar.city].filter(Boolean).join(', ')}
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name={bar.is_active === false ? 'close' : 'check'} size={14} className="text-ember-ink" />
                    {bar.is_active === false ? t('common.currentlyClosed') : t('common.open')}
                  </p>
                  {bar.phone && (
                    <p className="flex items-center gap-2">
                      <Icon name="phone" size={14} className="text-ember-ink" />
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
              <section className="card p-4">
                <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
                  <Icon name="star" size={18} className="text-ember-ink" />
                  {t('bar.community')}
                  <span className="ml-auto text-sm font-normal text-ember-muted">
                    {summary?.total_ratings || 0} {t('common.votes')}
                  </span>
                </h2>
                <RatingBars summary={summary} />
                <div className="mt-4">
                  <RadarChart summary={summary} />
                </div>
              </section>

              {/* Best drinks here */}
              <BarDrinksSection bar={bar} onToast={(msg, icon) => setToast({ msg, icon })} />

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
                    className="btn-primary w-full py-3"
                  >
                    <Icon name={myRating ? 'edit' : 'star'} size={18} />
                    {myRating ? t('bar.editRating') : t('bar.rateThis')}
                  </button>
                )
              ) : (
                <Link to="/login" className="flex items-center justify-center gap-2 rounded-lg bg-ember-card py-3 text-center text-ember-cream">
                  <Icon name="user" size={18} className="text-ember-ink" />
                  {t('bar.loginToRate')}
                </Link>
              )}

              {/* Reviews */}
              <section>
                <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-ember-cream">
                  <Icon name="review" size={18} className="text-ember-ink" />
                  {t('bar.reviews')}
                </h2>
                {/* Cod. Cons. art. 22-bis (dir. Omnibus): chi mostra recensioni di
                    consumatori deve dire se e come verifica che vengano da chi ha usato
                    davvero il servizio. Qui non le verifichiamo, e si dice. */}
                <p className="mb-3 text-xs leading-relaxed text-ember-muted">{t('legal.reviewsNote')}</p>
                {ratings.length === 0 ? (
                  <EmptyState title={t('bar.beFirst')} hint={t('bar.noReviewsYet')} pin="arancione" />
                ) : (
                  <div className="stagger space-y-2">
                    {ratings.map((r) => (
                      <div key={r.id} className="card p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-ember-cream">
                            <Icon name="user" size={14} className="text-ember-muted" />
                            @{r.profiles?.username || t('common.user')}
                            <PlusBadge plus={r.profiles?.plus} /> <ExplorerBadge explorer={r.profiles?.is_explorer} />
                          </span>
                          <span className="flex items-center gap-2 text-xs text-ember-ink">
                            <span className="flex items-center gap-0.5"><Icon name="euro" size={12} />{r.prezzo}</span>
                            <span className="flex items-center gap-0.5"><Icon name="bottle" size={12} />{r.qualita_drinks}</span>
                            <span className="flex items-center gap-0.5"><Icon name="social" size={12} />{r.socialita}</span>
                            {r.varieta != null && (
                              <span className="flex items-center gap-0.5"><Icon name="cocktail" size={12} />{r.varieta}</span>
                            )}
                            {r.orari != null && (
                              <span className="flex items-center gap-0.5"><Icon name="bell" size={12} />{r.orari}</span>
                            )}
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
                          <Icon name="arrow-left" size={16} /> {t('common.prev')}
                        </button>
                        <span className="text-xs text-ember-muted">{t('common.page', { n: page })}</span>
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!hasMore}
                          className="flex items-center gap-1 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream disabled:opacity-40"
                        >
                          {t('common.next')} <Icon name="arrow-right" size={16} />
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
      {freeDrinkOpen && <FreeDrinkModal token={user.free_drink_token} center={[bar.lat, bar.lng]} onClose={() => setFreeDrinkOpen(false)} />}
    </>
  );
}
