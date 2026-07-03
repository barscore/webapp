import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';

// Drinks-tab list row: cocktail badge · name + best-bar preview · avg vote.
// Tapping opens the drink detail (ranking of the bars that make it best).
// Memoized like BarRow; content-visibility skips off-screen layout on long lists.
function DrinkRow({ drink }) {
  const navigate = useNavigate();
  const best = drink.best;

  return (
    <button
      type="button"
      onClick={() => navigate(`/drink/${drink.id}`)}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition active:scale-[0.99] hover:border-white/10 hover:bg-white/[0.06] [content-visibility:auto] [contain-intrinsic-size:auto_66px]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ember-primary/10">
        <Icon name="cocktail" size={18} className="text-ember-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] font-bold text-ember-cream">{drink.name}</h3>
        <p className="truncate text-xs text-ember-muted">
          {best?.bars?.name
            ? `Migliore da ${best.bars.name}${best.bars.city ? ` · ${best.bars.city}` : ''}`
            : drink.description || 'Nessun voto ancora'}
        </p>
      </div>
      {best ? (
        <span className="flex shrink-0 items-center gap-1 font-display text-base font-extrabold tabular-nums text-ember-primary">
          <Icon name="star" size={14} />
          {Number(best.avg_rating).toFixed(1)}
        </span>
      ) : (
        <span className="shrink-0 font-display text-base font-extrabold text-ember-muted">—</span>
      )}
    </button>
  );
}

export default memo(DrinkRow);
