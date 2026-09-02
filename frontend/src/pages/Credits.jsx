import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import PlusBadge from '../components/PlusBadge.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import { SkeletonRows } from '../components/Skeleton.jsx';
import { useI18n } from '../i18n/index.js';

function Avatar({ user, className, iconSize = 18 }) {
  return user.avatar_url ? (
    <img src={user.avatar_url} alt="" className={`rounded-full object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center rounded-full bg-ember-line/5 text-ember-ink ${className}`}>
      <Icon name="user" size={iconSize} />
    </span>
  );
}

function PersonRow({ u, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(u)}
      className="press flex w-full items-center gap-3 rounded-card border border-ember-line/5 bg-ember-card p-3 text-left transition-colors hover:border-ember-primary/40"
    >
      <Avatar user={u} className="h-9 w-9" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold text-ember-cream">
        <span className="truncate">@{u.username}</span>
        <PlusBadge plus={u.plus} />
      </span>
      <Icon name="arrow-right" size={14} className="shrink-0 text-ember-muted" />
    </button>
  );
}

// Riconoscimenti — founder, admin e beta tester del progetto. Ogni persona
// apre il popup profilo pubblico (stesso di /classifica).
export default function Credits() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .credits()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(t('credits.error')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> {t('common.map')}
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ember-cream">{t('credits.title')}</h1>
          <p className="mt-1 text-sm text-ember-muted">{t('credits.subtitle')}</p>
        </div>

        {loading && <SkeletonRows n={4} label={t('common.loading')} />}
        {error && !loading && <p className="text-sm text-ember-danger">{error}</p>}

        {data?.founder && (
          <section>
            <h2 className="mb-2 px-1 font-display text-xs font-extrabold uppercase tracking-[0.12em] text-ember-muted">
              {t('credits.founder')}
            </h2>
            {/* Hero card: the gradient border marks the one name the project
                exists because of. */}
            <button
              type="button"
              onClick={() => setOpenUser(data.founder)}
              className="press block w-full rounded-lg2 bg-rating-fill p-[2px] text-left"
            >
              <span className="flex items-center gap-4 rounded-[calc(var(--r-lg)-2px)] bg-ember-card px-4 py-4">
                <Avatar user={data.founder} className="h-14 w-14" iconSize={26} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-display text-lg font-bold text-ember-cream">
                    <span className="truncate">@{data.founder.username}</span>
                    <PlusBadge plus={data.founder.plus} size="md" />
                  </span>
                  <span className="mt-0.5 block text-xs font-bold uppercase tracking-[0.1em] text-ember-ink">
                    {t('credits.founder')}
                  </span>
                </span>
                <Icon name="arrow-right" size={16} className="ml-auto shrink-0 text-ember-muted" />
              </span>
            </button>
          </section>
        )}

        {data?.admins?.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 font-display text-xs font-extrabold uppercase tracking-[0.12em] text-ember-muted">
              {t('credits.admins')}
            </h2>
            <div className="stagger space-y-2">
              {data.admins.map((u) => (
                <PersonRow key={u.id} u={u} onOpen={setOpenUser} />
              ))}
            </div>
          </section>
        )}

        {data?.betatesters?.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 font-display text-xs font-extrabold uppercase tracking-[0.12em] text-ember-muted">
              {t('credits.beta')}
            </h2>
            <div className="stagger space-y-2">
              {data.betatesters.map((u) => (
                <PersonRow key={u.id} u={u} onOpen={setOpenUser} />
              ))}
            </div>
          </section>
        )}
      </div>

      {openUser && <ProfileModal userId={openUser.id} onClose={() => setOpenUser(null)} />}
    </div>
  );
}
