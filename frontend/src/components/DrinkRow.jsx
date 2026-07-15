import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';

// Drinks-tab list row: cocktail tile · name + best-bar preview · avg vote.
// Tapping opens the drink detail (ranking of the bars that make it best).
// Memoized like BarRow; content-visibility skips off-screen layout on long lists.
function DrinkRow({ drink }) {
  const navigate = useNavigate();
  const best = drink.best;

  return (
    <button
      type="button"
      onClick={() => navigate(`/drink/${drink.id}`)}
      className="row flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left [content-visibility:auto] [contain-intrinsic-size:auto_84px]"
    >
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-card bg-ember-primary/10">
        <Icon name="cocktail" size={24} className="text-ember-ink" />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-ember-cream">
          {drink.name}
        </h3>
        <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
          {best?.bars?.name
            ? `Migliore da ${best.bars.name}${best.bars.city ? ` · ${best.bars.city}` : ''}`
            : drink.description || 'Nessun voto ancora'}
        </p>
      </div>

      {best ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-card border border-ember-ink/30 bg-ember-ink/15 px-2.5 py-1.5 font-display text-base font-extrabold leading-none tabular-nums text-ember-ink">
          <Icon name="star" size={13} />
          {Number(best.avg_rating).toFixed(1)}
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center rounded-card border border-ember-line/10 bg-ember-line/5 px-2.5 py-1.5 font-display text-base font-extrabold leading-none text-ember-muted">
          —
        </span>
      )}
    </button>
  );
}

export default memo(DrinkRow);
