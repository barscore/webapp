import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import { SkeletonRows } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useI18n } from '../i18n/index.js';

// Ice-cube icon (colored png, not a sprite mask).
function IceCube({ size = 16 }) {
  return (
    <img src="/icons/ice.png" alt="ice cubes" width={size} height={size} className="inline-block shrink-0 object-contain" />
  );
}

// Oro / argento / bronzo — deliberately theme-independent: a medal is a medal.
const MEDALS = ['#FFC94D', '#C9CDD6', '#D08A4E'];

function Avatar({ user, className, iconSize = 16 }) {
  return user.avatar_url ? (
    <img src={user.avatar_url} alt="" className={`rounded-full object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center rounded-full bg-ember-card text-ember-ink ${className}`}>
      <Icon name="user" size={iconSize} />
    </span>
  );
}

// One podium column. rank is 1-based; the winner gets a bigger avatar, a glow
// and the tallest pedestal — 2nd and 3rd step down progressively.
function PodiumSpot({ u, rank, me, onOpen }) {
  const { t } = useI18n();
  const first = rank === 1;
  const medal = MEDALS[rank - 1];
  const pedestal = first ? 'h-24' : rank === 2 ? 'h-16' : 'h-12';
  return (
    <button
      type="button"
      onClick={() => onOpen(u)}
      className="press flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
      aria-label={`@${u.username}`}
    >
      <span
        className={`relative rounded-full p-[3px] ${first ? 'bg-rating-fill' : ''}`}
        style={first ? { boxShadow: `0 6px 28px ${medal}55` } : { border: `2px solid ${medal}` }}
      >
        <Avatar user={u} className={first ? 'h-20 w-20' : 'h-14 w-14'} iconSize={first ? 32 : 24} />
        <span
          className="absolute -bottom-1.5 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full font-display text-[12px] font-extrabold text-black"
          style={{ background: medal }}
        >
          {rank}
        </span>
      </span>
      <span className="mt-1 w-full truncate text-sm font-semibold text-ember-cream">
        @{u.username}
        {me && <span className="ml-1 text-[10px] text-ember-ink">{t('board.you')}</span>}
      </span>
      <span className="flex items-center gap-1 font-display text-sm font-bold tabular-nums text-ember-cream">
        {u.ice_cubes} <IceCube size={14} />
      </span>
      <span
        className={`flex w-full items-start justify-center rounded-t-card pt-2 font-display text-2xl font-extrabold ${pedestal}`}
        style={{
          background: `linear-gradient(180deg, ${medal}${first ? '3D' : '24'}, transparent)`,
          color: medal,
          borderTop: `2px solid ${medal}66`,
        }}
      >
        {rank}
      </span>
    </button>
  );
}

// Classifica — all users ranked by accumulated ice cubes (10 per rating).
// Top 3 stand on a podium; every entry opens the public profile popup.
export default function Leaderboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    leaderboardApi
      .list()
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setError(t('board.errLoad')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> {t('common.map')}
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            <IceCube size={24} /> {t('board.title')}
          </h1>
        </div>

        {loading && (
          <SkeletonRows n={5} label={t('common.loading')} />
        )}

        {error && !loading && <p className="text-sm text-ember-danger">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <EmptyState title={t('board.empty')} hint={t('board.emptyHint')} pin="grigio" />
        )}

        {!loading && podium.length > 0 && (
          <div className="stagger flex items-end gap-3 rounded-lg2 border border-ember-line/5 bg-ember-card px-4 pt-5">
            {/* Visual order 2 · 1 · 3 — the winner stands in the middle. */}
            {[podium[1], podium[0], podium[2]]
              .map((u, col) => ({ u, rank: col === 1 ? 1 : col === 0 ? 2 : 3 }))
              .filter(({ u }) => u)
              .map(({ u, rank }) => (
                <PodiumSpot
                  key={u.id}
                  u={u}
                  rank={rank}
                  me={user && u.id === user.id}
                  onOpen={setOpenUser}
                />
              ))}
          </div>
        )}

        {!loading && rest.length > 0 && (
          <ol className="stagger space-y-2">
            {rest.map((u, i) => {
              const me = user && u.id === user.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setOpenUser(u)}
                    className={`press flex w-full items-center gap-3 rounded-card border p-3 text-left transition-colors ${
                      me
                        ? 'border-ember-primary/60 bg-ember-primary/10'
                        : 'border-ember-line/5 bg-ember-card hover:border-ember-primary/40'
                    }`}
                  >
                    <span className="w-6 text-center font-display font-bold tabular-nums text-ember-muted">
                      {i + 4}
                    </span>
                    <Avatar user={u} className="h-8 w-8" />
                    <span className="min-w-0 flex-1 truncate text-ember-cream">
                      @{u.username}
                      {me && <span className="ml-1 text-xs text-ember-ink">{t('board.you')}</span>}
                    </span>
                    <span className="flex items-center gap-1 font-display font-bold tabular-nums text-ember-cream">
                      {u.ice_cubes} <IceCube />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {openUser && <ProfileModal userId={openUser.id} onClose={() => setOpenUser(null)} />}
    </div>
  );
}
