import { useEffect, useState } from 'react';
import { usersApi } from '../services/api.js';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';

// Ruoli → badge label/i18n. Founder is derived server-side (is_founder), not a
// DB role, so it's handled separately below.
const ROLE_BADGES = {
  admin: { key: 'profile.admin', cls: 'border-ember-accent/50 bg-ember-accent/10 text-ember-danger' },
  moderator: { key: 'profile.moderator', cls: 'border-ember-primary/50 bg-ember-primary/10 text-ember-ink' },
  betatester: { key: 'profile.beta', cls: 'border-ember-good/50 bg-ember-good/10 text-ember-good' },
  organizer: { key: 'profile.organizer', cls: 'border-ember-primary/50 bg-ember-primary/10 text-ember-ink' },
};

function Badge({ children, cls }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${cls}`}>
      {children}
    </span>
  );
}

// Popup profilo pubblico (classifica, riconoscimenti): avatar, badge ruolo,
// ice cubes, valutazioni, data iscrizione. Fetches GET /users/:id on open.
export default function ProfileModal({ userId, onClose }) {
  const { t, dateLocale } = useI18n();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(false);
    usersApi
      .publicProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const badge = profile && ROLE_BADGES[profile.role];

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={profile ? `@${profile.username}` : t('common.loading')}
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in relative w-full max-w-xs overflow-hidden rounded-sheet p-6 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ember-muted hover:text-ember-cream"
        >
          <Icon name="close" size={16} />
        </button>

        {error && <p className="py-8 text-sm text-ember-danger">{t('profile.error')}</p>}

        {!error && !profile && (
          <div className="animate-pulse py-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-ember-line/10" />
            <div className="mx-auto mt-4 h-4 w-28 rounded-full bg-ember-line/10" />
          </div>
        )}

        {profile && (
          <>
            {/* Avatar with a primary→accent ring */}
            <span className="mx-auto block w-fit rounded-full bg-rating-fill p-[3px]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="block h-20 w-20 rounded-full object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ember-card text-ember-ink">
                  <Icon name="user" size={34} />
                </span>
              )}
            </span>

            <h3 className="mt-3 truncate font-display text-xl font-bold text-ember-cream">
              @{profile.username}
            </h3>

            {(profile.is_founder || badge) && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {profile.is_founder && (
                  <Badge cls="border-ember-primary/60 bg-rating-fill text-ember-on-primary">
                    {t('profile.founder')}
                  </Badge>
                )}
                {badge && <Badge cls={badge.cls}>{t(badge.key)}</Badge>}
                {profile.role === 'organizer' && profile.organizer_type && (
                  <Badge cls="border-ember-line/15 bg-ember-line/5 text-ember-muted">
                    {profile.organizer_type}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-card border border-ember-line/10 bg-ember-line/[0.04] px-2 py-2.5">
                <div className="flex items-center justify-center gap-1.5 font-display text-lg font-bold tabular-nums text-ember-cream">
                  {profile.ice_cubes}
                  <img src="/icons/ice.png" alt="" width={16} height={16} className="shrink-0 object-contain" />
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ember-muted">
                  {t('menu.iceCubes')}
                </div>
              </div>
              <div className="rounded-card border border-ember-line/10 bg-ember-line/[0.04] px-2 py-2.5">
                <div className="font-display text-lg font-bold tabular-nums text-ember-cream">
                  {profile.ratings_count}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ember-muted">
                  {t('menu.ratings')}
                </div>
              </div>
            </div>

            {profile.created_at && (
              <p className="mt-3 text-xs text-ember-muted">
                {t('menu.since', { date: new Date(profile.created_at).toLocaleDateString(dateLocale) })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
