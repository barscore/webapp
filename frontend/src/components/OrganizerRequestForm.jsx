import { useState } from 'react';
import Icon from './Icon.jsx';
import ProofUpload from './ProofUpload.jsx';
import { organizerApi, uploadProofs } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

// "proprietario" non si chiede da qui: si diventa proprietario rivendicando un
// bar dalla sua pagina, e l'approvazione della rivendicazione promuove l'account.
const TYPES = ['pr', 'organizzatore'];

// Richiesta account PR / organizzatore. Il PR dichiara con chi ha collaborato,
// l'organizzatore può aggiungere una nota: in entrambi i casi la verifica vera
// sono i file allegati.
export default function OrganizerRequestForm({ onDone }) {
  const { t } = useI18n();
  const [type, setType] = useState('pr');
  const [collabs, setCollabs] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (files.length === 0) return setError(t('proof.required'));
    if (type === 'pr' && collabs.trim().length < 5) return setError(t('orf.collabsRequired'));
    setBusy(true);
    setError('');
    try {
      const proof_files = await uploadProofs(files);
      const req = await organizerApi.submitRequest({
        requested_type: type,
        proof_files,
        collaborations: type === 'pr' ? collabs.trim() : undefined,
        note: type === 'organizzatore' && note.trim() ? note.trim() : undefined,
      });
      onDone?.(req);
    } catch (err) {
      setError(err?.response?.data?.error || t('proof.uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ember-cream">{t('orf.accountType')}</p>
        <div className="grid grid-cols-2 gap-2">
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

      {type === 'pr' && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-ember-cream">
            {t('orf.collabs')}
          </label>
          <textarea
            value={collabs}
            onChange={(e) => setCollabs(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t('orf.collabsPh')}
            className="field resize-none py-2 text-sm"
          />
        </div>
      )}

      <ProofUpload files={files} onChange={setFiles} disabled={busy} />

      {type === 'organizzatore' && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-ember-cream">
            {t('orf.note')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t('orf.notePh')}
            className="field resize-none py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-sm text-ember-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full py-2">
        <Icon name={busy ? 'reload' : 'check'} size={16} className={busy ? 'animate-spin' : ''} />
        {busy ? t('proof.uploading') : t('orf.send')}
      </button>
    </form>
  );
}
