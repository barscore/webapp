import {
  Radar,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useI18n } from '../i18n/index.js';

const AXES = [
  { labelKey: 'axis.prezzo', key: 'avg_prezzo', icon: 'euro' },
  { labelKey: 'axis.drinksShort', key: 'avg_qualita_drinks', icon: 'bottle' },
  { labelKey: 'axis.socialita', key: 'avg_socialita', icon: 'social' },
  { labelKey: 'axis.varieta', key: 'avg_varieta', icon: 'cocktail' },
  { labelKey: 'axis.orari', key: 'avg_orari', icon: 'bell' },
];

// Custom angle tick: brand sprite icon, axis name, and the community score
// (0–10 scale, same as the rest of the app) directly under it — so the
// numeric radius rings can stay hidden.
function AxisTick({ x, y, cx, cy, payload, values, metaByAxis }) {
  const meta = metaByAxis[payload.value];
  const v = values?.[payload.value];
  const dx = x - cx;
  const dy = y - cy;
  const ax = x + dx * 0.12;
  const ay = y + dy * 0.12;
  return (
    <g>
      <image href={`/icons/sprite/${meta.icon}.png`} x={ax - 9} y={ay - 26} width={18} height={18} />
      <text x={ax} y={ay + 2} textAnchor="middle" fill="rgb(var(--ember-cream))" fontSize={12}>
        {payload.value}
      </text>
      <text
        x={ax}
        y={ay + 17}
        textAnchor="middle"
        fill="rgb(var(--ember-primary))"
        fontSize={11}
        fontWeight={700}
      >
        {v > 0 ? (v * 2).toFixed(1) : '—'}
      </text>
    </g>
  );
}

// Renders the 5-axis community radar: prezzo, drinks, socialità, varietà,
// orari (scale 1–5). Styled soft: circular rings, gradient fill, glowing
// outline, no raw axis numbers.
export default function RadarChart({ summary }) {
  const { t } = useI18n();
  // Axis names are the recharts data keys too, so they must be resolved to the
  // current language before building the dataset.
  const axes = AXES.map((a) => ({ ...a, axis: t(a.labelKey) }));
  const metaByAxis = Object.fromEntries(axes.map((a) => [a.axis, a]));
  const data = axes.map((a) => ({ axis: a.axis, value: Number(summary?.[a.key]) || 0 }));
  const values = Object.fromEntries(data.map((d) => [d.axis, d.value]));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data} outerRadius="62%" margin={{ top: 26, bottom: 20, left: 12, right: 12 }}>
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
          <PolarGrid
            gridType="circle"
            stroke="rgb(var(--ember-cream))"
            strokeOpacity={0.08}
            radialLines={false}
          />
          <PolarAngleAxis dataKey="axis" tick={<AxisTick values={values} metaByAxis={metaByAxis} />} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="rgb(var(--ember-primary))"
            strokeWidth={2}
            fill="url(#rabar-radar-fill)"
            fillOpacity={1}
            filter="url(#rabar-radar-glow)"
            dot={{
              r: 3.5,
              fill: 'rgb(var(--ember-primary))',
              stroke: 'rgb(var(--ember-card))',
              strokeWidth: 2,
              fillOpacity: 1,
            }}
            isAnimationActive
            animationDuration={700}
          />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
