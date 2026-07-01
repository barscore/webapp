import { useNavigate } from 'react-router-dom';
import Pin from './Pin.jsx';
import { scoreMeta, barSubtitle, barKey } from '../utils/score.js';

// Bottom-sheet list row (home mockup): brand pin · name + dist/status · score.
// Tapping opens the bar sheet (Home passes onSelect). Falls back to navigating
// to the detail page when used standalone. OSM-only bars carry their place data
// so the sheet/page can materialize them on first visit.
export default function BarRow({ bar, onSelect }) {
  const navigate = useNavigate();
  const { score, variant, color, hasReviews } = scoreMeta(bar);

  return (
    <button
      type="button"
      onClick={() =>
        onSelect ? onSelect(bar) : navigate(`/bar/${barKey(bar)}`, { state: { osm: bar } })
      }
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition active:scale-[0.99] hover:border-white/10 hover:bg-white/[0.06]"
    >
      <Pin variant={variant} size={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] font-bold text-ember-cream">{bar.name}</h3>
        <p className="truncate text-xs text-ember-muted">{barSubtitle(bar, hasReviews)}</p>
      </div>
      <span className={`shrink-0 font-display text-lg font-extrabold tabular-nums ${color}`}>
        {score}
      </span>
    </button>
  );
}
