import { memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useFollows } from '../hooks/useFollows.js';
import { useI18n } from '../i18n/index.js';

// Italian date/time for an event start, e.g. "ven 4 lug · 22:30".
const FMT_OPTS = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
function formatWhen(iso, locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, FMT_OPTS).format(d).replace(',', '');
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
  const { t, dateLocale } = useI18n();
  const navigate = useNavigate();
  const { isFollowing, toggle, isAuthenticated } = useFollows();
  const when = formatWhen(event.starts_at, dateLocale);
  const place = event.bar_name;
  
  let distStr = null;
  if (event.distance_km != null) {
    if (event.distance_km < 1) {
      distStr = `${Math.round(event.distance_km * 1000)} m`;
    } else {
      distStr = `${Number(event.distance_km.toFixed(1))} km`;
    }
  }
  const dist = distStr;

  const guard = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    return isAuthenticated ? fn() : navigate('/login');
  };
  const followsEvent = isFollowing('events', event.id);
  const followsOrganizer = event.organizer_id && isFollowing('organizers', event.organizer_id);

  if (event.photo_url) {
    return (
      <Link to={`/event/${event.id}`} className="relative flex h-56 w-full flex-col justify-end overflow-hidden rounded-xl group my-2">
        <img src={event.photo_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div className="relative z-10 flex w-full items-end gap-3.5 px-4 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[18px] font-bold leading-tight text-white shadow-black drop-shadow-md">
              {event.sponsored && (
                <span className="mr-1.5 inline-block rounded-full bg-ember-primary px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ember-ink">
                  {t('ev.sponsored')}
                </span>
              )}
              {event.title}
            </h3>
            <p className="mt-1 truncate text-[12px] font-semibold uppercase tracking-[0.05em] text-white/90 drop-shadow-md">
              {[when, place].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <FollowChip
                active={followsEvent}
                label={followsEvent ? t('ev.unfollowEvent') : t('ev.followEvent')}
                onClick={guard(() => toggle('events', event.id))}
              >
                {followsEvent ? t('ev.following') : t('ev.follow')}
              </FollowChip>
              {event.organizer_id && (
                <FollowChip
                  active={followsOrganizer}
                  label={t(followsOrganizer ? 'ev.unfollowUser' : 'ev.followUser', {
                    user: event.organizer_username,
                  })}
                  onClick={guard(() => toggle('organizers', event.organizer_id))}
                >
                  @{event.organizer_username}
                </FollowChip>
              )}
            </div>
          </div>
          {dist && (
            <span className="shrink-0 rounded-card border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-bold tabular-nums text-white backdrop-blur-md">
              {dist}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/event/${event.id}`} className="row flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left hover:bg-ember-line/5 transition">
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-card bg-ember-primary/10 text-ember-ink">
        <Icon name="event" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-ember-cream group-hover:text-ember-primary transition">
          {event.sponsored && (
            <span className="mr-1.5 inline-block rounded-full bg-ember-primary/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ember-ink">
              {t('ev.sponsored')}
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
            label={followsEvent ? t('ev.unfollowEvent') : t('ev.followEvent')}
            onClick={guard(() => toggle('events', event.id))}
          >
            {followsEvent ? t('ev.following') : t('ev.follow')}
          </FollowChip>
          {event.organizer_id && (
            <FollowChip
              active={followsOrganizer}
              label={t(followsOrganizer ? 'ev.unfollowUser' : 'ev.followUser', {
                user: event.organizer_username,
              })}
              onClick={guard(() => toggle('organizers', event.organizer_id))}
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
    </Link>
  );
}

export default memo(EventRow);
