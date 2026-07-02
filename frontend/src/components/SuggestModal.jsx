import { useState } from 'react';
import Icon from './Icon.jsx';
import { suggestionsApi } from '../services/api.js';

// "Non trovi il tuo bar di fiducia? Avvisaci" — lightweight lead form shown from
// the search empty state. Works signed-out; the backend attaches the user id if
// a session is present. `coords` (map center) is sent so staff can locate it.
export default function SuggestModal({ initialName = '', coords, onClose, onSent }) {
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Inserisci il nome del bar');
    setBusy(true);
    setError('');
    try {
      await suggestionsApi.create({
        name: name.trim(),
        city: city.trim() || undefined,
        note: note.trim() || undefined,
        contact: contact.trim() || undefined,
        lat: coords?.[0],
        lng: coords?.[1],
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
          <Icon name="pin" size={20} className="text-ember-primary" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Segnala un bar</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Non trovi il tuo bar di fiducia? Dicci qual è e lo aggiungiamo alla mappa.
        </p>

        <label className="mt-4 block text-xs text-ember-muted">Nome del bar *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoFocus
          placeholder="Es. Bar Centrale"
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        <label className="mt-3 block text-xs text-ember-muted">Città / zona</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={120}
          placeholder="Es. Milano, Navigli"
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        <label className="mt-3 block text-xs text-ember-muted">Note (opzionale)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Indirizzo, dettagli utili…"
          className="mt-1 w-full resize-none rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        <label className="mt-3 block text-xs text-ember-muted">Contatto (opzionale)</label>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={160}
          placeholder="Email, così ti avvisiamo quando è online"
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        />

        {error && <p className="mt-3 text-sm text-ember-accent">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ember-primary py-3 font-semibold text-ember-bg disabled:opacity-50"
        >
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Invio…' : 'Invia segnalazione'}
        </button>
      </form>
    </div>
  );
}
