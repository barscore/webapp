import { useState } from 'react';
import Icon from './Icon.jsx';

const DIMENSIONS = [
  { key: 'prezzo', label: 'Prezzo', icon: 'euro', hint: '1 = caro · 5 = economico' },
  { key: 'qualita_drinks', label: 'Qualità drinks', icon: 'bottle', hint: '1 = scarsa · 5 = ottima' },
  { key: 'socialita', label: 'Socialità', icon: 'social', hint: '1 = morto · 5 = vivace' },
  { key: 'varieta', label: 'Varietà', icon: 'cocktail', hint: '1 = poca scelta · 5 = ampia scelta' },
  { key: 'orari', label: 'Orari', icon: 'bell', hint: '1 = scomodi · 5 = comodi' },
];

// Five 1–5 sliders + optional comment. Pass `initial` to edit an existing vote,
// `onDelete` to allow removing it.
export default function RatingForm({ initial, onSubmit, onCancel, onDelete }) {
  const [values, setValues] = useState({
    prezzo: initial?.prezzo ?? 3,
    qualita_drinks: initial?.qualita_drinks ?? 3,
    socialita: initial?.socialita ?? 3,
    varieta: initial?.varieta ?? 3,
    orari: initial?.orari ?? 3,
  });
  const [commento, setCommento] = useState(initial?.commento ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setVal(key, v) {
    setValues((s) => ({ ...s, [key]: Number(v) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit({ ...values, commento: commento.trim() || undefined });
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm('Eliminare la tua valutazione?')) return;
    setBusy(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante l’eliminazione');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-card border border-white/5 bg-ember-card p-4"
    >
      <h3 className="flex items-center gap-2 font-display font-bold text-ember-cream">
        <Icon name="cocktail" size={18} className="text-ember-primary" />
        {initial ? 'Modifica la tua valutazione' : 'La tua valutazione'}
      </h3>

      {DIMENSIONS.map((d) => (
        <div key={d.key}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 font-medium text-ember-cream">
              <Icon name={d.icon} size={16} className="text-ember-primary" />
              {d.label}
            </label>
            <span className="font-display font-semibold text-ember-primary">{values[d.key]}</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={values[d.key]}
            onChange={(e) => setVal(d.key, e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-ember-muted">{d.hint}</p>
        </div>
      ))}

      <div>
        <label className="font-medium text-ember-cream">Commento (opzionale)</label>
        <textarea
          value={commento}
          maxLength={500}
          rows={3}
          onChange={(e) => setCommento(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
          placeholder="La tua esperienza…"
        />
        <div className="flex items-center justify-between text-xs text-ember-muted">
          <button
            type="button"
            disabled
            title="Caricamento foto in arrivo"
            className="flex items-center gap-1.5 opacity-50"
          >
            <Icon name="camera" size={16} /> Aggiungi foto
          </button>
          <span>{commento.length}/500</span>
        </div>
      </div>

      {error && <p className="text-sm text-ember-accent">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember-primary py-2.5 font-semibold text-ember-bg active:scale-[0.98] disabled:opacity-50"
        >
          <Icon name="check" size={18} />
          {busy ? 'Salvataggio…' : 'Salva'}
        </button>
        {onDelete && initial && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Elimina valutazione"
            className="rounded-lg bg-ember-bg p-2.5 text-ember-accent disabled:opacity-50"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Annulla"
            className="rounded-lg bg-ember-bg p-2.5 text-ember-cream disabled:opacity-50"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
