import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useFollows } from '../hooks/useFollows.js';

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
  return FMT.format(d).replace(',', '');
}

function FollowChip({ active, children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? 'border-ember-primary/60 bg-ember-primary/10 text-ember-ink'
          : 'border-ember-line/10 text-ember-muted hover:text-ember-cream'
      }`}
    >
      <Icon name={active ? 'check' : 'bell'} size={11} /> {children}
    </button>
  );
}

// Zone-events list row: bell chip · title + venue/date · distance. Sponsored
// events carry the "Sponsorizzato" tag (and sort first server-side). Signed-in
// users can follow the event (promemoria + modifiche) or its organizer
// (notifica a ogni nuovo evento).
function EventRow({ event }) {
  const navigate = useNavigate();
  const { isFollowing, toggle, isAuthenticated } = useFollows();
  const when = formatWhen(event.starts_at);
  const place = event.bar_name;
  const dist = event.distance_km != null ? `${event.distance_km} km` : null;

  const guard = (fn) => (isAuthenticated ? fn() : navigate('/login'));
  const followsEvent = isFollowing('events', event.id);
  const followsOrganizer = event.organizer_id && isFollowing('organizers', event.organizer_id);

  return (
    <div className="row flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left">
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-card bg-ember-primary/10 text-ember-ink">
        <Icon name="bell" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-ember-cream">
          {event.sponsored && (
            <span className="mr-1.5 inline-block rounded-full bg-ember-primary/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ember-ink">
              Sponsorizzato
            </span>
          )}
          {event.title}
        </h3>
        <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-ember-muted">
          {[when, place].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <FollowChip
            active={followsEvent}
            label={followsEvent ? 'Non seguire più questo evento' : 'Segui questo evento'}
            onClick={() => guard(() => toggle('events', event.id))}
          >
            {followsEvent ? 'Segui già' : 'Segui'}
          </FollowChip>
          {event.organizer_id && (
            <FollowChip
              active={followsOrganizer}
              label={
                followsOrganizer
                  ? `Non seguire più @${event.organizer_username}`
                  : `Segui @${event.organizer_username}`
              }
              onClick={() => guard(() => toggle('organizers', event.organizer_id))}
            >
              @{event.organizer_username}
            </FollowChip>
          )}
        </div>
      </div>
      {dist && (
        <span className="shrink-0 rounded-card border border-ember-line/10 bg-ember-line/5 px-2.5 py-1.5 text-xs font-bold tabular-nums text-ember-muted">
          {dist}
        </span>
      )}
    </div>
  );
}

export default memo(EventRow);
