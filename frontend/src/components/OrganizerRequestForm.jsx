import { useState } from 'react';
import Icon from './Icon.jsx';
import { organizerApi } from '../services/api.js';

const TYPES = [
  { id: 'pr', label: 'PR' },
  { id: 'organizzatore', label: 'Organizzatore' },
  { id: 'proprietario', label: 'Proprietario di attività' },
];

const CHANNELS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['x', 'X'],
  ['telegram', 'Telegram'],
  ['whatsapp', 'WhatsApp'],
  ['tiktok', 'TikTok'],
  ['volantinaggio', 'Volantinaggio'],
  ['altro', 'Altro'],
];

// Form richiesta account organizzatore/PR — le 3 domande di verifica.
export default function OrganizerRequestForm({ onDone }) {
  const [type, setType] = useState('pr');
  const [proof, setProof] = useState('');
  const [channels, setChannels] = useState(new Set(['instagram']));
  const [other, setOther] = useState('');
  const [collabs, setCollabs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggleChannel(id) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (proof.trim().length < 10) return setError('Descrivi la prova (almeno 10 caratteri)');
    if (channels.size === 0) return setError('Seleziona almeno un canale');
    if (channels.has('altro') && !other.trim()) return setError('Descrivi il canale "altro"');
    if (collabs.trim().length < 5) return setError('Indica le collaborazioni degli ultimi 6 mesi');
    setBusy(true);
    setError('');
    try {
      const req = await organizerApi.submitRequest({
        requested_type: type,
        proof: proof.trim(),
        channels: [...channels],
        channels_other: channels.has('altro') ? other.trim() : undefined,
        collaborations: collabs.trim(),
      });
      onDone?.(req);
    } catch (err) {
      setError(err?.response?.data?.error || 'Invio non riuscito, riprova');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ember-cream">Tipo di account</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              aria-pressed={type === t.id}
              className={`rounded-lg border p-2 text-xs font-semibold transition-colors ${
                type === t.id
                  ? 'border-ember-primary bg-ember-primary/10 text-ember-ink'
                  : 'border-ember-line/10 text-ember-cream hover:border-ember-line/25'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ember-cream">
          1. Dimostra che sei un PR/organizzatore
        </label>
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={
            'Es.: link a un evento passato con il tuo nome in locandina, screenshot delle liste/tavoli che gestisci, profilo Instagram con lo storico degli eventi, lettera o contratto del locale…'
          }
          className="field resize-none py-2 text-sm"
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-ember-cream">
          2. Con quali canali / gruppi sposti le persone?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(([id, label]) => {
            const active = channels.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChannel(id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-ember-primary/60 bg-ember-primary/10 text-ember-ink'
                    : 'border-ember-line/10 text-ember-muted hover:text-ember-cream'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {channels.has('altro') && (
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={200}
            placeholder="Quale altro canale?"
            className="field mt-2 py-2 text-sm"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ember-cream">
          3. Con quali locali/organizzatori hai collaborato negli ultimi 6 mesi?
        </label>
        <textarea
          value={collabs}
          onChange={(e) => setCollabs(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Nomi dei locali, organizzazioni o eventi, con periodo indicativo…"
          className="field resize-none py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-ember-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full py-2">
        <Icon name={busy ? 'reload' : 'check'} size={16} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Invio…' : 'Invia richiesta'}
      </button>
    </form>
  );
}
