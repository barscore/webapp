import { useState } from 'react';
import Icon from './Icon.jsx';
import { organizerApi } from '../services/api.js';

// "Sei il proprietario? Rivendica questo bar" — richiede account organizer.
// L'approvazione (admin) assegna bars.owner_id e sblocca il boost del bar.
export default function ClaimModal({ bar, onClose, onSent }) {
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (proof.trim().length < 10) return setError('Descrivi la prova (almeno 10 caratteri)');
    setBusy(true);
    setError('');
    try {
      await organizerApi.claimBar(bar.id, proof.trim());
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Invio non riuscito, riprova');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in w-full max-w-md rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="pin" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Rivendica "{bar.name}"</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="ml-auto text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Dimostra di essere il proprietario o il gestore: lo staff verifica e ti assegna il locale.
        </p>

        <label className="mt-4 block text-xs text-ember-muted">Prova di proprietà *</label>
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="Es.: visura camerale / P.IVA intestata, email dal dominio del locale, foto della licenza esposta, gestione del profilo Google/Instagram ufficiale…"
          className="field mt-1 resize-none py-2 text-sm"
        />

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Invio…' : 'Invia rivendicazione'}
        </button>
      </form>
    </div>
  );
}
