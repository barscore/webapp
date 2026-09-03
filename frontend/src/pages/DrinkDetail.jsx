import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import DrinkVoteModal from '../components/DrinkVoteModal.jsx';
import ProposeDrinkModal from '../components/ProposeDrinkModal.jsx';
import { drinksApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';

const PAGE_SIZE = 20;
// Keep in sync with RANKING_RADIUS_KM in backend/src/routes/drinks.js.
const RADIUS_KM = 30;

// Drink detail: ranking of the bars that make this drink best (community
// 1–5 votes, native scale — not the ×2 used for the bar overall score).
// With geolocation the ranking only shows bars within RADIUS_KM.
export default function DrinkDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [drink, setDrink] = useState(null);
  const [bars, setBars] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voteOpen, setVoteOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // undefined = still resolving, [lat, lng] = fix, null = denied/unavailable
  // (fall back to the unfiltered global ranking).
  const [userPos, setUserPos] = useState(undefined);

  // Same caveat as Home: geolocation needs a secure context; on failure we
  // just skip the radius filter instead of blocking the page.
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserPos(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const load = useCallback(async () => {
    if (userPos === undefined) return; // wait for geolocation to settle
    setLoading(true);
    try {
      const geo = userPos ? { lat: userPos[0], lng: userPos[1] } : {};
      const [drinkData, ranking] = await Promise.all([
        drinksApi.get(id),
        drinksApi.topBars(id, { page, limit: PAGE_SIZE, ...geo }),
      ]);
      setDrink(drinkData);
      setBars(ranking.bars);
      setHasMore(page * PAGE_SIZE < (ranking.total ?? 0));
    } catch {
      setError(t('drink.notFound'));
    } finally {
      setLoading(false);
    }
  }, [id, page, userPos]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !drink)
    return (
      <p className="flex items-center gap-2 bg-ember-bg p-4 text-ember-muted">
        <Icon name="reload" size={16} className="animate-spin" /> {t('common.loading')}
      </p>
    );

  if (error || !drink)
    return (
      <div className="min-h-full bg-ember-bg p-4">
        <p className="mb-3 text-ember-danger">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1 text-ember-ink underline">
          <Icon name="arrow-left" size={16} /> {t('common.backToMap')}
        </Link>
      </div>
    );

  return (
    <div className="min-h-full bg-ember-bg pb-8">
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-ember-muted">
          <Icon name="arrow-left" size={15} /> {t('common.map')}
        </Link>

        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-ember-primary/10">
            <Icon name="cocktail" size={26} className="text-ember-ink" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ember-cream">{drink.name}</h1>
            {drink.description && <p className="text-sm text-ember-muted">{drink.description}</p>}
          </div>
        </div>

        {/* Vote CTA */}
        {isAuthenticated ? (
          <button
            onClick={() => setVoteOpen(true)}
            className="btn-primary w-full py-3 active:scale-[0.99]"
          >
            <Icon name="star" size={18} /> {t('drink.rateThis')}
          </button>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-lg bg-ember-card py-3 text-center text-ember-cream"
          >
            <Icon name="user" size={18} className="text-ember-ink" />
            {t('bar.loginToRate')}
          </Link>
        )}

        {/* Ranking */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-ember-cream">
            <Icon name="star" size={18} className="text-ember-ink" />
            {t('drink.whereBest')}
            {userPos && (
              <span className="text-xs font-normal text-ember-muted">
                {t('drink.withinKm', { n: RADIUS_KM })}
              </span>
            )}
          </h2>

          {bars.length === 0 ? (
            <EmptyState
              title={t('drink.noVotes')}
              hint={
                userPos
                  ? t('drink.noVotesGeoHint', { n: RADIUS_KM })
                  : t('drink.noVotesHint')
              }
              pin="arancione"
            />
          ) : (
            <ol className="space-y-2">
              {bars.map((b, i) => {
                // Sponsored bars sit on top with the tag and no rank number;
                // the numbered ranking continues underneath them.
                const rank = b.sponsored
                  ? null
                  : (page - 1) * PAGE_SIZE + bars.slice(0, i).filter((x) => !x.sponsored).length + 1;
                return (
                  <li key={b.id}>
                    <Link
                      to={`/bar/${b.id}`}
                      className="flex w-full items-center gap-3 rounded-2xl border border-ember-line/5 bg-ember-line/[0.03] px-3 py-3 transition hover:border-ember-line/10 hover:bg-ember-line/[0.06]"
                    >
                      <span className="w-7 shrink-0 text-center font-display text-lg font-extrabold tabular-nums text-ember-muted">
                        {rank ?? <Icon name="euro" size={14} className="mx-auto text-ember-ink" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-bold text-ember-cream">
                          {b.sponsored && (
                            <span className="mr-1.5 inline-block rounded-full bg-ember-primary/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ember-ink">
                              {t('ev.sponsored')}
                            </span>
                          )}
                          {b.name}
                        </span>
                        <span className="block truncate text-xs text-ember-muted">
                          {[b.address, b.city].filter(Boolean).join(', ')}
                          {b.distance_km != null && ` · ${b.distance_km} km`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-display text-base font-extrabold tabular-nums text-ember-ink">
                        <Icon name="star" size={14} />
                        {Number(b.avg_rating).toFixed(1)}
                      </span>
                      <span className="shrink-0 text-xs text-ember-muted">
                        {b.total_ratings} {b.total_ratings === 1 ? t('common.vote') : t('common.votes')}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          {(page > 1 || hasMore) && (
            <div className="mt-3 flex items-center justify-between">
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
        </section>
      </div>

      {voteOpen && (
        <DrinkVoteModal
          drink={drink}
          onClose={() => setVoteOpen(false)}
          onVoted={() => {
            setPage(1);
            load();
            setToast({ msg: t('bar.voteSaved'), icon: 'check' });
          }}
          onPropose={() => {
            setVoteOpen(false);
            setProposeOpen(true);
          }}
        />
      )}

      {proposeOpen && (
        <ProposeDrinkModal
          onClose={() => setProposeOpen(false)}
          onSent={() => setToast({ msg: t('home.proposalSent'), icon: 'check' })}
        />
      )}

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
