import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import RadarChart from '../components/RadarChart.jsx';
import RatingBars from '../components/RatingBars.jsx';
import RatingForm from '../components/RatingForm.jsx';
import BarDrinksSection from '../components/BarDrinksSection.jsx';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
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
      <p className="flex items-center gap-2 bg-ember-bg p-4 text-ember-muted">
        <Icon name="reload" size={16} className="animate-spin" /> {t('common.loading')}
      </p>
    );

  if (error || !bar)
    return (
      <div className="min-h-full bg-ember-bg p-4">
        <p className="mb-3 text-ember-accent">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1 text-ember-primary underline">
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
          className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ember-bg/70 px-3 py-1.5 text-sm text-ember-cream backdrop-blur"
        >
          <Icon name="arrow-left" size={16} /> {t('common.map')}
        </Link>
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={() => toggle(bar.id)}
            aria-label={saved ? t('bar.removeBookmark') : t('bar.saveBookmark')}
            aria-pressed={saved}
            className={`rounded-full bg-ember-bg/70 p-2 backdrop-blur ${
              saved ? 'text-ember-primary' : 'text-ember-cream'
            }`}
          >
            <Icon name="bookmark" size={18} />
          </button>
          <button
            onClick={onShare}
            aria-label={t('common.share')}
            className="rounded-full bg-ember-bg/70 p-2 text-ember-cream backdrop-blur"
          >
            <Icon name="share" size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Title + score */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ember-cream">{bar.name}</h1>
            <p className="flex items-center gap-1 text-ember-muted">
              <Icon name="pin" size={15} />
              {bar.address}, {bar.city}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-ember-primary px-3 py-1.5 font-display text-lg font-bold text-ember-bg">
            <Icon name="star" size={16} />
            {(overall * 2).toFixed(1)}
          </span>
        </div>

        {/* Contact actions */}
        <div className="flex flex-wrap gap-2">
          {bar.phone && (
            <a
              href={`tel:${bar.phone}`}
              className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream"
            >
              <Icon name="phone" size={16} className="text-ember-primary" /> {t('bar.call')}
            </a>
          )}
          {bar.website && (
            <a
              href={bar.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream"
            >
              <Icon name="link" size={16} className="text-ember-primary" /> {t('bar.website')}
            </a>
          )}
          <button
            onClick={() => setShowInfo((o) => !o)}
            aria-expanded={showInfo}
            className="flex items-center gap-2 rounded-lg bg-ember-card px-3 py-2 text-sm text-ember-cream"
          >
            <Icon name="info" size={16} className="text-ember-primary" /> {t('bar.info')}
            <Icon name={showInfo ? 'chevron-up' : 'chevron-down'} size={14} />
          </button>
        </div>

        {showInfo && (
          <div className="space-y-1 rounded-card border border-ember-line/5 bg-ember-card p-4 text-sm text-ember-muted">
            <p className="flex items-center gap-2">
              <Icon name="pin" size={14} className="text-ember-primary" />
              {bar.address}, {bar.city}
            </p>
            <p className="flex items-center gap-2">
              <Icon name={bar.is_active === false ? 'close' : 'check'} size={14} className="text-ember-primary" />
              {bar.is_active === false ? t('common.currentlyClosed') : t('common.open')}
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
        <section className="rounded-card border border-ember-line/5 bg-ember-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
            <Icon name="star" size={18} className="text-ember-primary" />
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary py-3 font-semibold text-ember-bg active:scale-[0.99]"
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
            <Icon name="user" size={18} className="text-ember-primary" />
            {t('bar.loginToRate')}
          </Link>
        )}

        {/* Reviews */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-ember-cream">
            <Icon name="review" size={18} className="text-ember-primary" />
            {t('bar.reviews')}
          </h2>

          {ratings.length === 0 ? (
            <EmptyState
              title={t('bar.beFirst')}
              hint={t('bar.noReviewsYetHelp')}
              pin="arancione"
            />
          ) : (
            <div className="space-y-2">
              {ratings.map((r) => {
                const vote = helpful[r.id];
                return (
                  <div key={r.id} className="rounded-card bg-ember-card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-ember-cream">
                        <Icon name="user" size={14} className="text-ember-muted" />
                        @{r.profiles?.username || t('common.user')}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-ember-primary">
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
                        className={vote === 'up' ? 'text-ember-primary' : 'hover:text-ember-cream'}
                      >
                        <Icon name="thumbs-up" size={16} />
                      </button>
                      <button
                        onClick={() => voteHelpful(r.id, 'down')}
                        aria-label={t('bar.notHelpfulAria')}
                        aria-pressed={vote === 'down'}
                        className={vote === 'down' ? 'text-ember-accent' : 'hover:text-ember-cream'}
                      >
                        <Icon name="thumbs-down" size={16} />
                      </button>
                      {isAdmin && r.id !== myRating?.id && (
                        <button
                          onClick={() => adminDeleteRating(r.id)}
                          aria-label={t('bar.adminDeleteAria')}
                          className="ml-auto text-ember-accent hover:text-ember-cream"
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

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
