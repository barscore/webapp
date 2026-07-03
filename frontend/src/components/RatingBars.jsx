import Icon from './Icon.jsx';

// Horizontal rating bars matching EMBER NIGHT card. DB values are 1–5; display
// uses a 0–10 scale (value * 2). Each axis carries its brand icon.
const ROWS = [
  { key: 'prezzo', label: 'Prezzo', icon: 'euro' },
  { key: 'qualita_drinks', label: 'Drinks', icon: 'bottle' },
  { key: 'socialita', label: 'Socialità', icon: 'social' },
  { key: 'varieta', label: 'Varietà', icon: 'cocktail' },
  { key: 'orari', label: 'Orari', icon: 'bell' },
];

export default function RatingBars({ summary }) {
  return (
    <div className="space-y-2">
      {ROWS.map((r) => {
        const v5 = Number(summary?.[`avg_${r.key}`]) || 0;
        const pct = Math.max(0, Math.min(100, (v5 / 5) * 100));
        return (
          <div key={r.key} className="flex items-center gap-2.5 text-sm">
            <span className="flex w-[5.5rem] shrink-0 items-center gap-1.5 text-ember-muted">
              <Icon name={r.icon} size={15} className="text-ember-primary" />
              {r.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full bg-rating-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right font-medium text-ember-cream">
              {(v5 * 2).toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
