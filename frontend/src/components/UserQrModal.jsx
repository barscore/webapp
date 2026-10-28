import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import QrCode from './QrCode.jsx';
import { meApi } from '../services/api.js';

// Il pass scade dopo un paio di minuti (backend lib/entryPass.js): finché il QR
// è a schermo se ne chiede uno nuovo ben prima, così all'ingresso è sempre valido
// e uno screenshot passato a un altro smette presto di funzionare.
const REFRESH_MS = 45_000;

export default function UserQrModal({ onClose }) {
  const [pass, setPass] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer;
    const load = async () => {
      try {
        const res = await meApi.entryPass();
        if (!alive) return;
        setPass(res.pass);
        setError(false);
      } catch {
        // Un pass ancora valido resta a schermo; senza pass si dice di riprovare.
        if (alive) setError(true);
      }
      if (alive) timer = setTimeout(load, REFRESH_MS);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ember-card p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Il tuo QR Code</h2>
            <p className="mt-1 text-sm text-ember-muted">
              Mostra questo QR code agli organizzatori per l'ingresso alle feste aderenti.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ember-bg p-2 text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="mb-6 flex h-72 items-center justify-center rounded-xl bg-white p-4">
          {pass ? (
            <QrCode
              value={`https://rabar.it/party-entry?pass=${encodeURIComponent(pass)}`}
              alt="User QR Code"
              className="w-64 h-64 object-contain"
            />
          ) : (
            <p className="text-center text-sm text-neutral-600">
              {error ? 'Impossibile generare il QR: controlla la connessione.' : 'Generazione del QR...'}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-ember-muted">
          Il QR code si rinnova da solo mentre è aperto e vale solo per pochi minuti: mostralo dal telefono, non come
          screenshot. Non è valido in caso di sospensione.
        </p>
      </div>
    </div>
  );
}
