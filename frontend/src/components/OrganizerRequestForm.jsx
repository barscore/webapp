import { useState } from 'react';
import Icon from './Icon.jsx';
import { organizerApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

// Type labels come from the dictionaries (orf.type.<id>); channel labels are
// proper nouns except volantinaggio/altro (orf.ch.<id>).
const TYPES = ['pr', 'organizzatore', 'proprietario'];

const CHANNELS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['x', 'X'],
  ['telegram', 'Telegram'],
  ['whatsapp', 'WhatsApp'],
  ['tiktok', 'TikTok'],
  ['volantinaggio', null],
  ['altro', null],
];

// Form richiesta account organizzatore/PR — le 3 domande di verifica.
export default function OrganizerRequestForm({ onDone }) {
  const { t } = useI18n();
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
    if (proof.trim().length < 10) return setError(t('orf.proofRequired'));
    if (channels.size === 0) return setError(t('orf.channelRequired'));
    if (channels.has('altro') && !other.trim()) return setError(t('orf.otherRequired'));
    if (collabs.trim().length < 5) return setError(t('orf.collabsRequired'));
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
      setError(err?.response?.data?.error || t('suggest.sendFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ember-cream">{t('orf.accountType')}</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              aria-pressed={type === id}
              className={`rounded-lg border p-2 text-xs font-semibold transition-colors ${
                type === id
                  ? 'border-ember-primary bg-ember-primary/10 text-ember-ink'
                  : 'border-ember-line/10 text-ember-cream hover:border-ember-line/25'
              }`}
            >
              {t(`orf.type.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ember-cream">
          {t('orf.q1')}
        </label>
        <textarea
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={t('orf.q1Ph')}
          className="field resize-none py-2 text-sm"
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-ember-cream">
          {t('orf.q2')}
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
                {label ?? t(`orf.ch.${id}`)}
              </button>
            );
          })}
        </div>
        {channels.has('altro') && (
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={200}
            placeholder={t('orf.otherPh')}
            className="field mt-2 py-2 text-sm"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-ember-cream">
          {t('orf.q3')}
        </label>
        <textarea
          value={collabs}
          onChange={(e) => setCollabs(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('orf.q3Ph')}
          className="field resize-none py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-ember-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full py-2">
        <Icon name={busy ? 'reload' : 'check'} size={16} className={busy ? 'animate-spin' : ''} />
        {busy ? t('common.sending') : t('orf.send')}
      </button>
    </form>
  );
}
