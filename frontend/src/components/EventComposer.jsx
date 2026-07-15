import { useState } from 'react';
import Icon from './Icon.jsx';
import { eventsApi } from '../services/api.js';

// datetime-local vuole "YYYY-MM-DDTHH:mm" in ora locale.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Crea/modifica evento per account organizer. `bars` (opzionale) è la lista dei
// bar caricati in zona per legare l'evento a un locale; senza locale l'evento
// viene posizionato al centro attuale della mappa (`center`).
export default function EventComposer({ event = null, bars = [], center, onClose, onSaved }) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [barId, setBarId] = useState(event?.bar_id ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = !!event;

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 2) return setError('Inserisci un titolo (min 2 caratteri)');
    if (!startsAt) return setError('Inserisci data e ora di inizio');
    setBusy(true);
    setError('');
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
    };
    try {
      if (editing) {
        await eventsApi.update(event.id, payload);
      } else {
        await eventsApi.create({
          ...payload,
          bar_id: barId || undefined,
          // Standalone event: pinned at the current map center.
          lat: barId ? undefined : center?.[0],
          lng: barId ? undefined : center?.[1],
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Salvataggio non riuscito');
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
        className="glass-flat fade-in max-h-[85vh] w-full max-w-md overflow-y-auto rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="bell" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">
            {editing ? 'Modifica evento' : 'Crea evento'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="ml-auto text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <label className="mt-4 block text-xs text-ember-muted">Titolo *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
          placeholder="Es. Notte anni '90 — guest DJ"
          className="field mt-1 py-2 text-sm"
        />

        <label className="mt-3 block text-xs text-ember-muted">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Line-up, ingresso, dress code…"
          className="field mt-1 resize-none py-2 text-sm"
        />

        {!editing && (
          <>
            <label className="mt-3 block text-xs text-ember-muted">Locale (opzionale)</label>
            <select
              value={barId}
              onChange={(e) => setBarId(e.target.value)}
              className="field mt-1 py-2 text-sm"
            >
              <option value="">Nessun locale — usa il centro della mappa</option>
              {bars
                .filter((b) => b.id && !b.id.startsWith?.('osm'))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ember-muted">Inizio *</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="field mt-1 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ember-muted">Fine</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="field mt-1 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Pubblica evento'}
        </button>
        {!editing && (
          <p className="mt-2 text-center text-[11px] text-ember-muted">
            I tuoi follower riceveranno una notifica alla pubblicazione.
          </p>
        )}
      </form>
    </div>
  );
}
