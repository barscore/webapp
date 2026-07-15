import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pin from './Pin.jsx';
import ScoreBadge from './ScoreBadge.jsx';
import { scoreMeta, barKey, isDisco } from '../utils/score.js';

// Bottom-sheet list row: band-tinted thumbnail · name + meta · score badge.
// Tapping opens the bar sheet (Home passes onSelect). Falls back to navigating
// to the detail page when used standalone. OSM-only bars carry their place data
// so the sheet/page can materialize them on first visit.
// Memoized (lists can hold hundreds of rows); content-visibility lets the
// browser skip layout/paint for off-screen rows on long lists.
function BarRow({ bar, onSelect }) {
  const navigate = useNavigate();
  const meta = scoreMeta(bar);
  const { variant, tint, hasReviews } = meta;
  const cover = bar.cover_image_url || bar.bar_images?.[0]?.url;
  const dist = bar.distance_km != null ? `${bar.distance_km} km` : bar.city;
  const status = bar.is_active === false ? 'Chiuso' : hasReviews ? 'Aperto' : 'Nessuna recensione';

  return (
    <button
      type="button"
      onClick={() =>
        onSelect ? onSelect(bar) : navigate(`/bar/${barKey(bar)}`, { state: { osm: bar } })
      }
      className="row flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left [content-visibility:auto] [contain-intrinsic-size:auto_84px]"
    >
      {/* Thumbnail: the venue photo when we have one, otherwise the brand pin on
          a tile tinted with the score band — so the row carries the rating even
          before you read the number. */}
      <span
        className={`grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-card ${cover ? '' : tint}`}
      >
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Pin variant={variant} disco={isDisco(bar)} size={30} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-ember-cream">
          {bar.name}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
          {dist && <span className="tabular-nums">{dist}</span>}
          {dist && <span className="text-ember-line/25">•</span>}
          <span className="truncate">{status}</span>
        </p>
      </div>

      <ScoreBadge meta={meta} />
    </button>
  );
}

export default memo(BarRow);
