import {
  Radar,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

const AXES = [
  { axis: 'Prezzo', key: 'avg_prezzo', icon: 'euro' },
  { axis: 'Drinks', key: 'avg_qualita_drinks', icon: 'bottle' },
  { axis: 'Socialità', key: 'avg_socialita', icon: 'social' },
  { axis: 'Varietà', key: 'avg_varieta', icon: 'cocktail' },
  { axis: 'Orari', key: 'avg_orari', icon: 'bell' },
];

const META_BY_AXIS = Object.fromEntries(AXES.map((a) => [a.axis, a]));

// Custom angle tick: brand sprite icon, axis name, and the community score
// (0–10 scale, same as the rest of the app) directly under it — so the
// numeric radius rings can stay hidden.
function AxisTick({ x, y, cx, cy, payload, values }) {
  const meta = META_BY_AXIS[payload.value];
  const v = values?.[payload.value];
  const dx = x - cx;
  const dy = y - cy;
  const ax = x + dx * 0.12;
  const ay = y + dy * 0.12;
  return (
    <g>
      <image href={`/icons/sprite/${meta.icon}.png`} x={ax - 9} y={ay - 26} width={18} height={18} />
      <text x={ax} y={ay + 2} textAnchor="middle" fill="#F5EDD8" fontSize={12}>
        {payload.value}
      </text>
      <text
        x={ax}
        y={ay + 17}
        textAnchor="middle"
        fill="#E07B1A"
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
  const data = AXES.map((a) => ({ axis: a.axis, value: Number(summary?.[a.key]) || 0 }));
  const values = Object.fromEntries(data.map((d) => [d.axis, d.value]));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data} outerRadius="62%" margin={{ top: 26, bottom: 20, left: 12, right: 12 }}>
          <defs>
            <radialGradient id="rabar-radar-fill">
              <stop offset="0%" stopColor="#FF4F30" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#E07B1A" stopOpacity={0.15} />
            </radialGradient>
            <filter id="rabar-radar-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#E07B1A" floodOpacity="0.4" />
            </filter>
          </defs>
          <PolarGrid gridType="circle" stroke="#F5EDD8" strokeOpacity={0.08} radialLines={false} />
          <PolarAngleAxis dataKey="axis" tick={<AxisTick values={values} />} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#E07B1A"
            strokeWidth={2}
            fill="url(#rabar-radar-fill)"
            fillOpacity={1}
            filter="url(#rabar-radar-glow)"
            dot={{ r: 3.5, fill: '#E07B1A', stroke: '#2D2D27', strokeWidth: 2, fillOpacity: 1 }}
            isAnimationActive
            animationDuration={700}
          />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
