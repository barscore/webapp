import { useI18n } from '../i18n/index.js';

const AXES = [
  { labelKey: 'axis.prezzo', key: 'avg_prezzo', icon: 'euro' },
  { labelKey: 'axis.drinksShort', key: 'avg_qualita_drinks', icon: 'bottle' },
  { labelKey: 'axis.socialita', key: 'avg_socialita', icon: 'social' },
  { labelKey: 'axis.varieta', key: 'avg_varieta', icon: 'cocktail' },
  { labelKey: 'axis.orari', key: 'avg_orari', icon: 'bell' },
];

// Fixed drawing space; the SVG scales to its container via viewBox. Geometry
// mirrors the previous recharts version (outerRadius 62%, margins 26/20/12) so
// the chart looks identical.
const W = 320;
const H = 288;
const CX = W / 2;
const CY = 26 + (H - 26 - 20) / 2;
const R = Math.round(0.62 * ((H - 26 - 20) / 2)); // height-bound, like recharts

// Vertex on the pentagon: axis 0 at the top, clockwise, at `frac` of the radius.
function point(i, frac) {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [CX + R * frac * Math.cos(a), CY + R * frac * Math.sin(a)];
}

// Axis tick: brand sprite icon, axis name, and the community score (0–10
// scale, same as the rest of the app) directly under it — so the numeric
// radius rings can stay hidden.
function AxisTick({ i, label, value }) {
  const [x, y] = point(i, 1.12);
  return (
    <g>
      {/* Alpha-mask + fill instead of a raw <image>: sprite PNGs come in mixed
          colors (the bell is white for the header), so tint them all with the
          brand primary like Icon.jsx does. */}
      <mask id={`rabar-tick-${label.icon}`} style={{ maskType: 'alpha' }}>
        <image href={`/icons/sprite/${label.icon}.png`} x={x - 9} y={y - 26} width={18} height={18} />
      </mask>
      <rect
        x={x - 9}
        y={y - 26}
        width={18}
        height={18}
        fill="rgb(var(--ember-primary))"
        mask={`url(#rabar-tick-${label.icon})`}
      />
      <text x={x} y={y + 2} textAnchor="middle" fill="rgb(var(--ember-cream))" fontSize={12}>
        {label.axis}
      </text>
      {/* 11px bold — small text, so it needs the AA-safe ink rather than the
          raw primary (which is only 3.5:1 on the midnight-red card). */}
      <text
        x={x}
        y={y + 17}
        textAnchor="middle"
        fill="rgb(var(--ember-ink))"
        fontSize={11}
        fontWeight={700}
      >
        {value > 0 ? (value * 2).toFixed(1) : '—'}
      </text>
    </g>
  );
}

// Renders the 5-axis community radar: prezzo, drinks, socialità, varietà,
// orari (scale 1–5). Styled soft: circular rings, gradient fill, glowing
// outline, no raw axis numbers. Hand-rolled SVG — recharts was ~350 KB of
// bundle to draw this one polygon.
export default function RadarChart({ summary }) {
  const { t } = useI18n();
  const axes = AXES.map((a) => ({ ...a, axis: t(a.labelKey) }));
  const values = axes.map((a) => {
    const v = Number(summary?.[a.key]) || 0;
    return Math.min(5, Math.max(0, v));
  });
  const vertices = values.map((v, i) => point(i, v / 5));
  const polygon = vertices.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div className="h-72 w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img">
        <style>{`@keyframes rabar-radar-in { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
        <defs>
          <radialGradient id="rabar-radar-fill">
            <stop offset="0%" stopColor="rgb(var(--ember-accent))" stopOpacity={0.5} />
            <stop offset="100%" stopColor="rgb(var(--ember-primary))" stopOpacity={0.15} />
          </radialGradient>
          <filter id="rabar-radar-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="5"
              floodColor="rgb(var(--ember-primary))"
              floodOpacity="0.4"
            />
          </filter>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <circle
            key={frac}
            cx={CX}
            cy={CY}
            r={R * frac}
            fill="none"
            stroke="rgb(var(--ember-cream))"
            strokeOpacity={0.08}
          />
        ))}
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            animation: 'rabar-radar-in 700ms ease-out',
          }}
        >
          <polygon
            points={polygon}
            stroke="rgb(var(--ember-primary))"
            strokeWidth={2}
            fill="url(#rabar-radar-fill)"
            filter="url(#rabar-radar-glow)"
          />
          {vertices.map(([x, y], i) => (
            <circle
              key={axes[i].key}
              cx={x}
              cy={y}
              r={3.5}
              fill="rgb(var(--ember-primary))"
              stroke="rgb(var(--ember-card))"
              strokeWidth={2}
            />
          ))}
        </g>
        {axes.map((a, i) => (
          <AxisTick key={a.key} i={i} label={a} value={values[i]} />
        ))}
      </svg>
    </div>
  );
}
