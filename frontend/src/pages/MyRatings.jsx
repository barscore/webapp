import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { meApi, ratingsApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';

// The signed-in user's own ratings, editable (link to the bar) or removable.
export default function MyRatings() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [ratings, setRatings] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [loading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRatings(await meApi.ratings());
      setError('');
    } catch {
      setError('Impossibile caricare le valutazioni');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  async function remove(r) {
    if (!confirm('Eliminare questa valutazione?')) return;
    try {
      await ratingsApi.remove(r.bar_id, r.id);
      setRatings((list) => list.filter((x) => x.id !== r.id));
      setToast({ msg: 'Valutazione eliminata', icon: 'trash' });
    } catch {
      setToast({ msg: 'Errore durante l’eliminazione', icon: 'info' });
    }
  }

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
            <Icon name="star" size={22} className="text-ember-primary" /> Le tue valutazioni
          </h1>
        </div>

        {busy && (
          <p className="flex items-center gap-2 text-ember-muted">
            <Icon name="reload" size={16} className="animate-spin" /> Caricamento…
          </p>
        )}

        {error && !busy && <p className="text-ember-accent">{error}</p>}

        {!busy && !error && ratings.length === 0 && (
          <EmptyState
            title="Nessuna valutazione"
            hint="Non hai ancora valutato nessun bar. Trovane uno sulla mappa."
            ctaLabel="Vai alla mappa"
            ctaIcon="locate"
            onCta={() => navigate('/')}
            pin="arancione"
          />
        )}

        {!busy && ratings.length > 0 && (
          <div className="space-y-2">
            {ratings.map((r) => (
              <div key={r.id} className="rounded-card border border-ember-line/5 bg-ember-card p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ember-cream">
                      {r.bars?.name || 'Bar'}
                    </p>
                    {r.bars?.city && (
                      <p className="flex items-center gap-1 text-xs text-ember-muted">
                        <Icon name="pin" size={12} /> {r.bars.city}
                      </p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-ember-primary">
                    <span className="flex items-center gap-0.5">
                      <Icon name="euro" size={12} />
                      {r.prezzo}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Icon name="bottle" size={12} />
                      {r.qualita_drinks}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Icon name="social" size={12} />
                      {r.socialita}
                    </span>
                    {r.varieta != null && (
                      <span className="flex items-center gap-0.5">
                        <Icon name="cocktail" size={12} />
                        {r.varieta}
                      </span>
                    )}
                    {r.orari != null && (
                      <span className="flex items-center gap-0.5">
                        <Icon name="bell" size={12} />
                        {r.orari}
                      </span>
                    )}
                  </span>
                </div>
                {r.commento && <p className="mt-1 text-ember-muted">{r.commento}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Link
                    to={`/bar/${r.bar_id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-ember-bg px-3 py-1.5 text-ember-cream"
                  >
                    <Icon name="edit" size={15} className="text-ember-primary" /> Modifica
                  </Link>
                  <button
                    onClick={() => remove(r)}
                    aria-label="Elimina valutazione"
                    className="flex items-center gap-1.5 rounded-lg bg-ember-bg px-3 py-1.5 text-ember-accent"
                  >
                    <Icon name="trash" size={15} /> Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
