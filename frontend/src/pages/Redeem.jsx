import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { organizerApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';

export default function Redeem() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Must be logged in to redeem
      navigate('/login?redirectTo=/redeem?token=' + token);
    }
  }, [loading, isAuthenticated, navigate, token]);

  if (!token) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-ember-bg p-4 text-center">
        <h1 className="font-display text-2xl font-bold text-ember-danger">Errore</h1>
        <p className="mt-2 text-ember-muted">Token mancante.</p>
      </div>
    );
  }

  if (loading || !isAuthenticated) return null;

  async function handleRedeem() {
    setBusy(true);
    setError(null);
    try {
      await organizerApi.redeemDrink(token);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante il riscatto del drink.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ember-bg p-4">
      <div className="w-full max-w-sm rounded-2xl bg-ember-card p-6 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        
        {success ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <Icon name="check" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Drink Riscattato!</h2>
            <p className="mt-2 text-sm text-ember-muted">Il drink omaggio è stato registrato con successo. Servi il cliente!</p>
            <button onClick={() => navigate('/')} className="mt-6 btn-primary w-full py-2">
              Torna alla mappa
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ember-primary/20 text-ember-primary">
              <Icon name="cocktail" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Riscatta Free Drink</h2>
            <p className="mt-2 text-sm text-ember-muted">
              Stai per convalidare un Free Drink Omaggio. Assicurati di essere il proprietario del locale per poterlo riscattare.
            </p>
            
            {error && <p className="mt-4 text-sm font-semibold text-ember-danger">{error}</p>}
            
            <button 
              onClick={handleRedeem} 
              disabled={busy}
              className="mt-6 btn-primary w-full py-3 text-lg font-bold"
            >
              {busy ? 'Convalida in corso...' : 'Convalida Ora'}
            </button>
            <button onClick={() => navigate('/')} className="mt-3 w-full py-2 text-sm text-ember-muted hover:text-ember-cream">
              Annulla
            </button>
          </>
        )}
      </div>
    </div>
  );
}
