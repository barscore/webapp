import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import DrinkVoteModal from '../components/DrinkVoteModal.jsx';
import ProposeDrinkModal from '../components/ProposeDrinkModal.jsx';
import { drinksApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

const PAGE_SIZE = 20;

// Drink detail: ranking of the bars that make this drink best (community
// 1–5 votes, native scale — not the ×2 used for the bar overall score).
export default function DrinkDetail() {
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [drinkData, ranking] = await Promise.all([
        drinksApi.get(id),
        drinksApi.topBars(id, { page, limit: PAGE_SIZE }),
      ]);
      setDrink(drinkData);
      setBars(ranking.bars);
      setHasMore(page * PAGE_SIZE < (ranking.total ?? 0));
    } catch {
      setError('Drink non trovato');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !drink)
    return (
      <p className="flex items-center gap-2 bg-ember-bg p-4 text-ember-muted">
        <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
      </p>
    );

  if (error || !drink)
    return (
      <div className="min-h-full bg-ember-bg p-4">
        <p className="mb-3 text-ember-accent">{error}</p>
        <Link to="/" className="inline-flex items-center gap-1 text-ember-primary underline">
          <Icon name="arrow-left" size={16} /> Torna alla mappa
        </Link>
      </div>
    );

  return (
    <div className="min-h-full bg-ember-bg pb-8">
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-ember-muted">
          <Icon name="arrow-left" size={15} /> Mappa
        </Link>

        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ember-primary/10">
            <Icon name="cocktail" size={26} className="text-ember-primary" />
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary py-3 font-semibold text-ember-bg active:scale-[0.99]"
          >
            <Icon name="star" size={18} /> Valuta questo drink
          </button>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-lg bg-ember-card py-3 text-center text-ember-cream"
          >
            <Icon name="user" size={18} className="text-ember-primary" />
            Accedi per valutare
          </Link>
        )}

        {/* Ranking */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-ember-cream">
            <Icon name="star" size={18} className="text-ember-primary" />
            Dove lo fanno meglio
          </h2>

          {bars.length === 0 ? (
            <EmptyState
              title="Nessun voto ancora"
              hint="Nessun bar è stato ancora votato per questo drink. Vota il tuo preferito!"
              pin="arancione"
            />
          ) : (
            <ol className="space-y-2">
              {bars.map((b, i) => (
                <li key={b.id}>
                  <Link
                    to={`/bar/${b.id}`}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 transition hover:border-white/10 hover:bg-white/[0.06]"
                  >
                    <span className="w-7 shrink-0 text-center font-display text-lg font-extrabold tabular-nums text-ember-muted">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-bold text-ember-cream">
                        {b.name}
                      </span>
                      <span className="block truncate text-xs text-ember-muted">
                        {[b.address, b.city].filter(Boolean).join(', ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-display text-base font-extrabold tabular-nums text-ember-primary">
                      <Icon name="star" size={14} />
                      {Number(b.avg_rating).toFixed(1)}
                    </span>
                    <span className="shrink-0 text-xs text-ember-muted">
                      {b.total_ratings} {b.total_ratings === 1 ? 'voto' : 'voti'}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {(page > 1 || hasMore) && (
            <div className="mt-3 flex items-center justify-between">
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
        </section>
      </div>

      {voteOpen && (
        <DrinkVoteModal
          drink={drink}
          onClose={() => setVoteOpen(false)}
          onVoted={() => {
            setPage(1);
            load();
            setToast({ msg: 'Voto salvato', icon: 'check' });
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
          onSent={() => setToast({ msg: "Grazie! Proposta inviata — visibile dopo l'approvazione", icon: 'check' })}
        />
      )}

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
