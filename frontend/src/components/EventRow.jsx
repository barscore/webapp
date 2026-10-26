import { memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useFollows } from '../hooks/useFollows.js';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';
import { eventParts, shortWhen, distanceLabel } from '../utils/eventDate.js';

// The cover an event without a photo gets: the theme's own primary and accent
// as two soft glows on the card colour, so it reads as a poster on every theme
// instead of a grey hole.
export function PosterFallback({ className = '', iconSize = 88 }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        background:
          'radial-gradient(120% 90% at 88% 0%, rgb(var(--ember-accent) / 0.5), transparent 62%),' +
          'radial-gradient(110% 120% at 0% 100%, rgb(var(--ember-primary) / 0.6), transparent 66%),' +
          'rgb(var(--ember-card))',
      }}
    >
      <Icon name="event" size={iconSize} className="absolute -bottom-4 right-4 rotate-[-12deg] text-white/15" />
    </div>
  );
}

// "30 / OTT" block over the cover. Dark glass on purpose: it sits on a photo,
// whatever the theme, so it never follows the light palettes.
export function DateStamp({ iso, className = '' }) {
  const { dateLocale } = useI18n();
  const parts = eventParts(iso, dateLocale);
  if (!parts) return null;
  return (
    <span
      className={`flex w-[52px] flex-col items-center rounded-[14px] border border-white/15 bg-black/45 py-1.5 leading-none text-white backdrop-blur-md ${className}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">{parts.month}</span>
      <span className="mt-1 font-display text-[22px] font-extrabold tabular-nums">{parts.day}</span>
    </span>
  );
}

// Small tinted badge on a card or on the event page: Prevendite, Free drink.
export function EventBadge({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ember-primary/30 bg-ember-primary/10 px-2.5 py-1 text-[11px] font-bold text-ember-ink">
      <Icon name={icon} size={12} />
      {children}
    </span>
  );
}

// Zone-events card: cover with the date stamp, then title, when and where, the
// badges and a bell to follow the event. The whole card opens the event page
// (a stretched link under the bell, so no button sits inside an <a>). Sponsored
// events carry the tag and sort first server-side.
function EventRow({ event }) {
  const { t, dateLocale } = useI18n();
  const navigate = useNavigate();
  const { freeDrinkToken } = useAuth();
  const { isFollowing, toggle, isAuthenticated } = useFollows();
  const following = isFollowing('events', event.id);
  const dist = distanceLabel(event.distance_km);
  const when = shortWhen(event.starts_at, dateLocale, t);
  const showFreeDrink = event.free_drink && !!freeDrinkToken;

  const onBell = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return navigate('/login');
    toggle('events', event.id);
  };

  return (
    <article className="card group relative overflow-hidden transition-transform duration-1 ease-out active:scale-[0.99]">
      <div className={`relative overflow-hidden ${event.photo_url ? 'aspect-video' : 'aspect-[16/7]'}`}>
        {event.photo_url ? (
          <img
            src={event.photo_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-3 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <PosterFallback />
        )}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
        <DateStamp iso={event.starts_at} className="absolute left-3 top-3" />
        {dist && (
          <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
            {dist}
          </span>
        )}
        {event.sponsored && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ember-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-on-primary">
            {t('ev.sponsored')}
          </span>
        )}
      </div>

      <div className="flex items-end gap-3 px-4 pb-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-[18px] font-bold leading-tight text-ember-cream">
            <Link to={`/event/${event.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
              {event.title}
            </Link>
          </h3>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] text-ember-muted">
            <span className="shrink-0 font-semibold capitalize text-ember-ink">{when}</span>
            {event.bar_name && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{event.bar_name}</span>
              </>
            )}
          </p>
          {(event.has_presales || showFreeDrink || event.organizer_username) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {event.has_presales && <EventBadge icon="euro">{t('ev.presales')}</EventBadge>}
              {showFreeDrink && <EventBadge icon="cocktail">{t('ev.freeDrink')}</EventBadge>}
              {event.organizer_username && (
                <span className="truncate text-[12px] font-semibold text-ember-muted">@{event.organizer_username}</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onBell}
          aria-pressed={following}
          aria-label={following ? t('ev.unfollowEvent') : t('ev.followEvent')}
          className={`press relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors duration-2 ${
            following
              ? 'border-ember-primary bg-ember-primary text-ember-on-primary'
              : 'border-ember-line/10 bg-ember-line/[0.06] text-ember-cream hover:bg-ember-line/10'
          }`}
        >
          <Icon name={following ? 'check' : 'bell'} size={17} />
        </button>
      </div>
    </article>
  );
}

export default memo(EventRow);
