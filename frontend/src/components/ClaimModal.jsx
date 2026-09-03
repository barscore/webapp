import { useState } from 'react';
import Icon from './Icon.jsx';
import ProofUpload from './ProofUpload.jsx';
import { organizerApi, uploadProofs } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

// "Sei il proprietario? Rivendica questo bar" — aperta a ogni utente loggato:
// è così che si diventa proprietario. L'approvazione (admin) assegna
// bars.owner_id, promuove l'account a organizer/proprietario e sblocca il boost.
export default function ClaimModal({ bar, onClose, onSent }) {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (files.length === 0) return setError(t('proof.required'));
    setBusy(true);
    setError('');
    try {
      const proof_files = await uploadProofs(files);
      await organizerApi.claimBar(bar.id, {
        proof_files,
        note: note.trim() || undefined,
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || t('proof.uploadFailed'));
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
        className="glass-flat fade-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="pin" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">
            {t('claim.title', { name: bar.name })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="ml-auto text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">{t('claim.intro')}</p>

        <div className="mt-4">
          <ProofUpload files={files} onChange={setFiles} disabled={busy} />
        </div>

        <label className="mt-4 block text-sm font-semibold text-ember-cream">
          {t('claim.note')}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('claim.notePh')}
          className="field mt-1 resize-none py-2 text-sm"
        />

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? t('proof.uploading') : t('claim.send')}
        </button>
      </form>
    </div>
  );
}
