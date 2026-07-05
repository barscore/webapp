import { useState } from 'react';
import Icon from './Icon.jsx';
import { reportsApi } from '../services/api.js';

// Categories must match REPORT_TYPES in backend/src/schemas/reportSchemas.js
// and the CHECK constraint in database/add_reports.sql.
const REPORT_TYPES = [
  { value: 'bug', label: 'Problema tecnico / bug' },
  { value: 'contenuto', label: 'Contenuto inappropriato' },
  { value: 'account', label: 'Problema con l’account' },
  { value: 'suggerimento', label: 'Suggerimento / idea' },
  { value: 'altro', label: 'Altro' },
];

// "Segnala" — generic report form opened from the account menu. Auth-only
// (the entry point lives in the signed-in profile card).
export default function ReportModal({ onClose, onSent }) {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 5) return setError('Descrivi il problema (almeno 5 caratteri)');
    setBusy(true);
    setError('');
    try {
      await reportsApi.create({ type, message: message.trim() });
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
          <Icon name="bell" size={20} className="text-ember-primary" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Segnala</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Qualcosa non va? Dicci di cosa si tratta e ci pensiamo noi.
        </p>

        <label htmlFor="report-type" className="mt-4 block text-xs text-ember-muted">
          Tipo di segnalazione
        </label>
        <select
          id="report-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label htmlFor="report-message" className="mt-3 block text-xs text-ember-muted">
          Descrizione *
        </label>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="Descrivi il problema con più dettagli possibili…"
          className="mt-1 w-full resize-none rounded-lg bg-ember-bg p-2 text-sm text-ember-cream outline-none ring-ember-primary focus:ring-2"
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
