import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function FreeDrinkModal({ token, center, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://rabar.it/redeem?token=${token}`)}`;
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!center) {
        setLoading(false);
        return;
      }
      try {
        const { barsApi } = await import('../services/api.js');
        const data = await barsApi.freeDrinks({ lat: center[0], lng: center[1], radius_km: 30 });
        setBars(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [center]);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-ember-bg overflow-y-auto">
      <div className="flex-1 w-full max-w-lg mx-auto p-6 pb-20">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Il tuo Free Drink</h2>
            <p className="mt-1 text-sm text-ember-muted">
              Mostra questo QR code al bancone di un bar affiliato.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ember-card p-2 text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={20} />
          </button>
        </div>
        
        <div className="mb-6 flex justify-center bg-white p-4 rounded-xl">
          <img src={qrUrl} alt="QR Code Free Drink" className="w-64 h-64 object-contain" />
        </div>
        
        <p className="text-center text-xs text-ember-muted mb-8">
          Attenzione: il QR code diventerà inutilizzabile dopo la prima scansione da parte del bar.
        </p>

        <h3 className="font-display text-lg font-bold text-ember-cream mb-4">
          Bar nei dintorni (30km) che accettano il Free Drink
        </h3>

        {loading ? (
          <p className="text-sm text-ember-muted">Ricerca bar in corso...</p>
        ) : bars.length === 0 ? (
          <p className="text-sm text-ember-muted">Nessun bar nei dintorni accetta il free drink al momento.</p>
        ) : (
          <div className="space-y-3">
            {bars.map(bar => (
              <div key={bar.id} className="card p-4">
                <Link to={`/bar/${bar.id}`} onClick={onClose} className="font-semibold text-ember-cream hover:underline block mb-1">
                  {bar.name}
                </Link>
                <div className="text-xs text-ember-muted mb-2">{bar.address}, {bar.city}</div>
                {bar.free_drinks_hours && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ember-ink bg-ember-primary/10 px-2 py-1 rounded-md">
                    <Icon name="bell" size={12} />
                    Valido: {bar.free_drinks_hours}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
