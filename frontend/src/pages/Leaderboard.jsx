import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';

// Ice-cube icon (colored png, not a sprite mask). File added by hand later at
// public/icons/ice.png — until then it 404s harmlessly.
function IceCube({ size = 16 }) {
  return (
    <img src="/icons/ice.png" alt="ice cubes" width={size} height={size} className="inline-block shrink-0 object-contain" />
  );
}

// Classifica — all users ranked by accumulated ice cubes (10 per rating).
export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    leaderboardApi
      .list()
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setError('Impossibile caricare la classifica'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> Mappa
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            <IceCube size={24} /> Classifica ice cubes
          </h1>
        </div>

        {loading && (
          <p className="flex items-center gap-2 px-1 py-3 text-sm text-ember-muted">
            <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
          </p>
        )}

        {error && !loading && <p className="text-sm text-ember-accent">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <EmptyState title="Classifica vuota" hint="Nessun utente ha ancora valutato un bar." pin="grigio" />
        )}

        {!loading && rows.length > 0 && (
          <ol className="space-y-2">
            {rows.map((u, i) => {
              const me = user && u.id === user.id;
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-3 rounded-card border p-3 ${
                    me ? 'border-ember-primary/60 bg-ember-primary/10' : 'border-ember-line/5 bg-ember-card'
                  }`}
                >
                  <span className="w-6 text-center font-display font-bold tabular-nums text-ember-muted">
                    {i + 1}
                  </span>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-line/5 text-ember-primary">
                      <Icon name="user" size={16} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-ember-cream">
                    @{u.username}
                    {me && <span className="ml-1 text-xs text-ember-primary">(tu)</span>}
                  </span>
                  <span className="flex items-center gap-1 font-display font-bold tabular-nums text-ember-cream">
                    {u.ice_cubes} <IceCube />
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
