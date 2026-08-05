import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import RadarChart from '../components/RadarChart.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import { SkeletonBar } from '../components/Skeleton.jsx';
import RatingBars from '../components/RatingBars.jsx';
import RatingForm from '../components/RatingForm.jsx';
import BarDrinksSection from '../components/BarDrinksSection.jsx';
import DirectionsButton from '../components/DirectionsButton.jsx';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ClaimModal from '../components/ClaimModal.jsx';
import BoostModal from '../components/BoostModal.jsx';
import { barsApi, ratingsApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useBookmarks } from '../hooks/useBookmarks.js';
import { shareBar } from '../utils/share.js';
// Route id is either our DB uuid or an OSM token "osm_<type>_<id>" for bars
// that live only in OpenStreetMap until first visited.
import { parseOsmToken } from '../utils/score.js';
import { useI18n } from '../i18n/index.js';

const PAGE_SIZE = 10;

export default function BarDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const location = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const { has, toggle } = useBookmarks();

  const [bar, setBar] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [helpful, setHelpful] = useState({});
  const [toast, setToast] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const osm = parseOsmToken(id);
      // Resolve OSM-only bars to a persisted row (find-or-create); persisted
      // bars are fetched directly. Ratings always key off the real uuid.
      const barData = osm
        ? await barsApi.resolve({ ...osm, ...(location.state?.osm || {}) })
        : await barsApi.get(id);
      const barId = barData.id;
      const ratingData = await ratingsApi.list(barId, { page, limit: PAGE_SIZE });
      setBar(barData);
      setRatings(ratingData.ratings);
      const total = ratingData.total ?? ratingData.pagination?.total;
      setHasMore(total != null ? page * PAGE_SIZE < total : ratingData.ratings.length === PAGE_SIZE);
    } catch {
      setError(t('bar.notFound'));
    } finally {
      setLoading(false);
    }
  }, [id, page, location.state]);

  useEffect(() => {
    load();
  }, [load]);

  const myRating = ratings.find((r) => r.profiles?.username === user?.username);

  async function submitRating(payload) {
    if (myRating) await ratingsApi.update(bar.id, myRating.id, payload);
    else await ratingsApi.create(bar.id, payload);
    setShowForm(false);
    setPage(1);
    await load();
    setToast({ msg: t('bar.ratingSaved'), icon: 'check' });
  }

  async function deleteRating() {
    if (!myRating) return;
    await ratingsApi.remove(bar.id, myRating.id);
    setShowForm(false);
    await load();
    setToast({ msg: t('bar.ratingDeleted'), icon: 'trash' });
  }

  // Admin moderation: remove an inappropriate review (any user's).
  async function adminDeleteRating(rid) {
    if (!confirm(t('bar.adminDeleteConfirm'))) return;
    try {
      await ratingsApi.remove(bar.id, rid);
      await load();
      setToast({ msg: t('bar.ratingRemoved'), icon: 'trash' });
    } catch {
      setToast({ msg: t('bar.deleteError'), icon: 'info' });
    }
  }

  function voteHelpful(rid, dir) {
    setHelpful((h) => ({ ...h, [rid]: h[rid] === dir ? null : dir }));
  }

  async function onShare() {
    const res = await shareBar(bar);
    if (res === 'copied') setToast({ msg: t('bar.linkCopied'), icon: 'link' });
  }

  if (loading && !bar)
    return (
      <div className="min-h-full bg-ember-bg p-4">
        <SkeletonBar label={t('common.loading')} />
      </div>
    );

  if (error || !bar)
    return (
      <div className="min-h-full bg-ember-bg p-4">
        <p className="mb-3 text-ember-danger">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1 text-ember-ink underline">
          <Icon name="arrow-left" size={16} /> {t('common.backToMap')}
        </Link>
      </div>
    );

  const summary = bar.bar_ratings_summary;
  const cover = bar.cover_image_url || bar.bar_images?.[0]?.url;
  const overall = Number(summary?.avg_overall) || 0;
  const tags = bar.tags || [];
  const saved = has(bar.id);

  return (
    <div className="min-h-full bg-ember-bg pb-8">
      {/* Cover */}
      <div className="relative h-48 w-full bg-ember-card">
        {cover ? (
          <img src={cover} alt={bar.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ember-muted">
            <Icon name="image" size={44} />
            <span className="flex items-center gap-1 text-xs">
              <Icon name="camera" size={14} /> {t('bar.noPhoto')}
            </span>
          </div>
        )}
        <Link
          to="/"
          aria-label={t('common.backToMap')}
          className="glass press absolute left-3 top-3 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ember-cream"
        >
          <Icon name="arrow-left" size={16} /> {t('common.map')}
        </Link>
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={() => toggle(bar.id)}
            aria-label={saved ? t('bar.removeBookmark') : t('bar.saveBookmark')}
            aria-pressed={saved}
            className={`glass press rounded-full p-2 ${
              saved ? 'text-ember-ink' : 'text-ember-cream'
            }`}
          >
            <Icon name="bookmark" size={18} />
          </button>
          <button
            onClick={onShare}
            aria-label={t('common.share')}
            className="glass press rounded-full p-2 text-ember-cream"
          >
            <Icon name="share" size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Hero: name leads, score badge second. */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {bar.sponsored && (
              <span className="mb-1 inline-block rounded-full bg-ember-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-ink">
                Sponsorizzato
              </span>
            )}
            <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight text-ember-cream">
              {bar.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
              <Icon name="pin" size={13} />
              <span className="truncate">{[bar.address, bar.city].filter(Boolean).join(', ')}</span>
            </p>
          </div>
          <ScoreBadge bar={bar} size="lg" />
        </div>

        {/* Contact actions */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {bar.phone && (
            <a href={`tel:${bar.phone}`} className="chip">
              <Icon name="phone" size={15} className="text-ember-ink" /> {t('bar.call')}
            </a>
          )}
          {bar.website && (
            <a href={bar.website} target="_blank" rel="noreferrer" className="chip">
              <Icon name="link" size={15} className="text-ember-ink" /> {t('bar.website')}
            </a>
          )}
          <DirectionsButton bar={bar} />
          {user?.role === 'organizer' && bar.owner_id === user.id && (
            <button onClick={() => setBoostOpen(true)} className="chip">
              <Icon name="euro" size={15} className="text-ember-ink" /> Boost
            </button>
          )}
          {user?.role === 'organizer' && !bar.owner_id && (
            <button onClick={() => setClaimOpen(true)} className="chip">
              <Icon name="pin" size={15} className="text-ember-ink" /> Sei il proprietario?
            </button>
          )}
          <button onClick={() => setShowInfo((o) => !o)} aria-expanded={showInfo} className="chip">
            <Icon name="info" size={15} className="text-ember-ink" /> {t('bar.info')}
            <Icon name={showInfo ? 'chevron-up' : 'chevron-down'} size={13} />
          </button>
        </div>

        {showInfo && (
          <div className="card space-y-1 p-4 text-sm text-ember-muted">
            <p className="flex items-center gap-2">
              <Icon name="pin" size={14} className="text-ember-ink" />
              {bar.address}, {bar.city}
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
              <span
                key={t}
                className="rounded-full border border-ember-primary/50 px-3 py-1 text-xs text-ember-cream"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Community rating */}
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
            <Icon name="star" size={18} className="text-ember-ink" />
            {t('bar.communityRating')}
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
              {myRating ? t('bar.editYourRating') : t('bar.rateThis')}
            </button>
          )
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-lg bg-ember-card py-3 text-center text-ember-cream"
          >
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

          {ratings.length === 0 ? (
            <EmptyState
              title={t('bar.beFirst')}
              hint={t('bar.noReviewsYetHelp')}
              pin="arancione"
            />
          ) : (
            <div className="stagger space-y-2">
              {ratings.map((r) => {
                const vote = helpful[r.id];
                return (
                  <div key={r.id} className="card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-ember-cream">
                        <Icon name="user" size={14} className="text-ember-muted" />
                        @{r.profiles?.username || t('common.user')}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-ember-ink">
                        <span className="flex items-center gap-0.5">
                          <Icon name="euro" size={12} />
                          {r.prezzo}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Icon name="bottle" size={12} />
                          {r.qualita_drinks}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Icon name="social" size={12} />
                          {r.socialita}
                        </span>
                        {r.varieta != null && (
                          <span className="flex items-center gap-0.5">
                            <Icon name="cocktail" size={12} />
                            {r.varieta}
                          </span>
                        )}
                        {r.orari != null && (
                          <span className="flex items-center gap-0.5">
                            <Icon name="bell" size={12} />
                            {r.orari}
                          </span>
                        )}
                      </span>
                    </div>
                    {r.commento && <p className="mt-1 text-ember-muted">{r.commento}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-ember-muted">
                      <span>{t('bar.helpful')}</span>
                      <button
                        onClick={() => voteHelpful(r.id, 'up')}
                        aria-label={t('bar.helpfulAria')}
                        aria-pressed={vote === 'up'}
                        className={vote === 'up' ? 'text-ember-ink' : 'hover:text-ember-cream'}
                      >
                        <Icon name="thumbs-up" size={16} />
                      </button>
                      <button
                        onClick={() => voteHelpful(r.id, 'down')}
                        aria-label={t('bar.notHelpfulAria')}
                        aria-pressed={vote === 'down'}
                        className={vote === 'down' ? 'text-ember-danger' : 'hover:text-ember-cream'}
                      >
                        <Icon name="thumbs-down" size={16} />
                      </button>
                      {isAdmin && r.id !== myRating?.id && (
                        <button
                          onClick={() => adminDeleteRating(r.id)}
                          aria-label={t('bar.adminDeleteAria')}
                          className="ml-auto text-ember-danger hover:text-ember-cream"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
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

      {claimOpen && (
        <ClaimModal
          bar={bar}
          onClose={() => setClaimOpen(false)}
          onSent={() => setToast({ msg: 'Rivendicazione inviata, ti avvisiamo noi', icon: 'check' })}
        />
      )}
      {boostOpen && (
        <BoostModal
          target={{ bar_id: bar.id }}
          label={bar.name}
          onClose={() => setBoostOpen(false)}
        />
      )}
      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
