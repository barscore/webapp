import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import DrinkVoteModal from './DrinkVoteModal.jsx';
import ProposeDrinkModal from './ProposeDrinkModal.jsx';
import { drinksApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';

// "I migliori drink qui" — shared by BarDetail (page) and BarSheet (sheet) so
// the two bar views can't drift. `bar` is always a persisted row (uuid) here.
export default function BarDrinksSection({ bar, onToast }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [voteOpen, setVoteOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    drinksApi
      .forBar(bar.id, { limit: 5 })
      .then((r) => !cancelled && setDrinks(r.drinks))
      .catch(() => !cancelled && setDrinks([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bar.id, reloadKey]);

  return (
    <section className="card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-ember-cream">
        <Icon name="cocktail" size={18} className="text-ember-ink" />
        {t('bar.bestDrinks')}
      </h2>

      {loading ? (
        <p className="flex items-center gap-2 py-1 text-sm text-ember-muted">
          <Icon name="reload" size={14} className="animate-spin" /> {t('common.loading')}
        </p>
      ) : drinks.length === 0 ? (
        <p className="py-1 text-sm text-ember-muted">
          {t('bar.noDrinkVotes')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {drinks.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => navigate(`/drink/${d.id}`)}
              className="flex w-full items-center gap-2 rounded-xl border border-ember-line/5 bg-ember-line/[0.03] px-3 py-2 text-left text-sm transition hover:border-ember-line/10 hover:bg-ember-line/[0.06]"
            >
              <Icon name="cocktail" size={14} className="shrink-0 text-ember-ink" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ember-cream">{d.name}</span>
              <span className="flex shrink-0 items-center gap-1 font-display text-sm font-bold tabular-nums text-ember-ink">
                <Icon name="star" size={12} />
                {Number(d.avg_rating).toFixed(1)}
              </span>
              <span className="shrink-0 text-xs text-ember-muted">
                {d.total_ratings} {d.total_ratings === 1 ? t('common.vote') : t('common.votes')}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setVoteOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember-primary/15 py-2 text-sm font-semibold text-ember-ink hover:bg-ember-primary/25"
          >
            <Icon name="star" size={15} /> {t('bar.rateDrink')}
          </button>
        ) : (
          <p className="flex-1 text-center text-xs text-ember-muted">{t('bar.loginToVoteDrinks')}</p>
        )}
        <button
          type="button"
          onClick={() => setProposeOpen(true)}
          className="rounded-lg bg-ember-line/5 px-3 py-2 text-xs font-semibold text-ember-muted hover:text-ember-cream"
        >
          {t('bar.proposeDrink')}
        </button>
      </div>

      {voteOpen && (
        <DrinkVoteModal
          bar={bar}
          onClose={() => setVoteOpen(false)}
          onVoted={() => {
            setReloadKey((k) => k + 1);
            onToast?.(t('bar.voteSaved'), 'check');
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
          onSent={() => onToast?.(t('home.proposalSent'), 'check')}
        />
      )}
    </section>
  );
}
