import Icon from './Icon.jsx';

// Italian date/time for an event start, e.g. "ven 4 lug · 22:30".
const FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = FMT.format(d).replace(',', '');
  return parts;
}

// Zone-events list row: bell chip · title + venue/date · distance.
// Read-only for now (events are added by venue staff, not tapped through).
export default function EventRow({ event }) {
  const when = formatWhen(event.starts_at);
  const place = event.bar_name;
  const dist = event.distance_km != null ? `${event.distance_km} km` : null;

  return (
    <div className="row flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left">
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-card bg-ember-primary/10 text-ember-ink">
        <Icon name="bell" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-ember-cream">
          {event.title}
        </h3>
        <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
          {[when, place].filter(Boolean).join(' · ')}
        </p>
      </div>
      {dist && (
        <span className="shrink-0 rounded-card border border-ember-line/10 bg-ember-line/5 px-2.5 py-1.5 text-xs font-bold tabular-nums text-ember-muted">
          {dist}
        </span>
      )}
    </div>
  );
}
