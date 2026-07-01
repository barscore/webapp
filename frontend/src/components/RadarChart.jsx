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
  { axis: 'Qualità', key: 'avg_qualita_alcol', icon: 'bottle' },
  { axis: 'Socialità', key: 'avg_socialita', icon: 'social' },
];

const ICON_BY_AXIS = Object.fromEntries(AXES.map((a) => [a.axis, a.icon]));

// Custom angle tick: brand sprite icon above the axis label.
function AxisTick({ x, y, cx, cy, payload }) {
  const icon = ICON_BY_AXIS[payload.value];
  const dx = x - cx;
  const dy = y - cy;
  const ax = x + dx * 0.06;
  const ay = y + dy * 0.06;
  return (
    <g>
      <image href={`/icons/sprite/${icon}.png`} x={ax - 9} y={ay - 22} width={18} height={18} />
      <text x={ax} y={ay + 6} textAnchor="middle" fill="#F5EDD8" fontSize={12}>
        {payload.value}
      </text>
    </g>
  );
}

// Renders the 3-axis community radar: prezzo, qualità, socialità (scale 1–5).
export default function RadarChart({ summary }) {
  const data = AXES.map((a) => ({ axis: a.axis, value: Number(summary?.[a.key]) || 0 }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data} outerRadius="68%" margin={{ top: 18, bottom: 8, left: 8, right: 8 }}>
          <PolarGrid stroke="#3a3a32" />
          <PolarAngleAxis dataKey="axis" tick={<AxisTick />} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#8A857A', fontSize: 10 }} />
          <Radar dataKey="value" stroke="#E07B1A" fill="#E07B1A" fillOpacity={0.5} />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
