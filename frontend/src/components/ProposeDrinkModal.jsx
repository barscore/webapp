import { useState } from 'react';
import Icon from './Icon.jsx';
import { drinksApi } from '../services/api.js';

// "Non trovi un drink? Proponilo" — moderated lead form. Works signed-out;
// the backend attaches the user id if a session is present. The drink shows
// up in the catalog only after staff approval (admin Drinks tab).
export default function ProposeDrinkModal({ initialName = '', onClose, onSent }) {
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Inserisci il nome del drink');
    setBusy(true);
    setError('');
    try {
      await drinksApi.suggest({
        name: name.trim(),
        note: note.trim() || undefined,
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Invio non riuscito, riprova');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ember-card p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="cocktail" size={20} className="text-ember-primary" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Proponi un drink</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Manca un drink nel catalogo? Proponilo: sarà visibile dopo l'approvazione dello staff.
        </p>

        <label className="mt-4 block text-xs text-ember-muted">Nome del drink *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoFocus
          placeholder="Es. Negroni"
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        <label className="mt-3 block text-xs text-ember-muted">Ingredienti / note (opzionale)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Es. Gin, vermouth rosso, bitter"
          className="mt-1 w-full resize-none rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        {error && <p className="mt-3 text-sm text-ember-accent">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary py-3 font-semibold text-ember-bg disabled:opacity-50"
        >
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Invio…' : 'Invia proposta'}
        </button>
      </form>
    </div>
  );
}
