import { useState } from 'react';
import { useI18n } from '../i18n/index.js';

// Barre giornaliere di una sola serie (statistiche del bar; il pannello staff
// in `admin/` ne ha una copia per gli iscritti). Una serie = nessuna legenda: la nomina il titolo sopra.
// Barre sottili ancorate alla base con l'estremo arrotondato, 2px di aria fra
// una e l'altra, il valore nel tooltip al passaggio e una tabella nascosta per
// chi usa uno screen reader.
//   data  [{ day: 'YYYY-MM-DD', value: number }], in ordine di data
//   label nome della serie (tooltip e tabella)
export default function DailyBars({ data, label, height = 72 }) {
  const { dateLocale } = useI18n();
  const [hover, setHover] = useState(null);
  if (!data?.length) return null;

  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = (day, opts) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(dateLocale, opts);
  const shown = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <div
        className="flex items-end gap-[2px] border-b border-ember-line/15"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        aria-hidden
      >
        {data.map((d, i) => (
          <div
            key={d.day}
            className="flex h-full flex-1 cursor-default items-end"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          >
            <div
              className={`w-full rounded-t-[4px] ${
                hover === i ? 'bg-ember-cream' : 'bg-ember-primary'
              }`}
              // Un giorno a zero resta visibile come una riga sulla base.
              style={{ height: d.value ? `${Math.max(4, (d.value / max) * 100)}%` : 2, opacity: d.value ? 1 : 0.35 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ember-muted">
        <span>{fmt(data[0].day, { day: 'numeric', month: 'short' })}</span>
        <span>
          {shown
            ? `${fmt(shown.day, { weekday: 'short', day: 'numeric', month: 'short' })} · ${label}: ${shown.value}`
            : `↑ ${max}`}
        </span>
        <span>{fmt(data[data.length - 1].day, { day: 'numeric', month: 'short' })}</span>
      </div>
      {/* sr-only sul div: una <table> tratta height:1px come minimo e allungherebbe lo scroll. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <th scope="row">{fmt(d.day, { day: 'numeric', month: 'long' })}</th>
                <td>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
