import { scoreMeta } from '../utils/score.js';

// The community score as a filled, band-colored pill — not a bare number.
// Bands match the map pin art (verde ≥7 / arancione <7 / grigio = no reviews),
// so a bar reads the same in the list, in the sheet and on the map.
export default function ScoreBadge({ bar, meta, size = 'md' }) {
  const m = meta || scoreMeta(bar);
  const s = {
    sm: 'rounded-lg px-2 py-1 text-sm',
    md: 'rounded-card px-2.5 py-1.5 text-base',
    lg: 'rounded-card px-3.5 py-2.5 text-2xl',
  }[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center border font-display font-extrabold leading-none tabular-nums ${s} ${m.badge}`}
    >
      {m.score}
    </span>
  );
}
