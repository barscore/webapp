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
    <div className="flex w-full items-center gap-3 rounded-2xl border border-ember-line/5 bg-ember-line/[0.03] px-3 py-3 text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember-primary/15 text-ember-primary">
        <Icon name="bell" size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] font-bold text-ember-cream">{event.title}</h3>
        <p className="truncate text-xs text-ember-muted">
          {[when, place].filter(Boolean).join(' · ')}
        </p>
      </div>
      {dist && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-ember-muted">{dist}</span>
      )}
    </div>
  );
}
