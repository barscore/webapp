import { useState } from 'react';
import Icon from './Icon.jsx';
import { reportsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

// Categories must match REPORT_TYPES in backend/src/schemas/reportSchemas.js
// and the CHECK constraint in database/add_reports.sql.
const REPORT_TYPES = ['bug', 'contenuto', 'account', 'suggerimento', 'altro'];

// "Segnala" — generic report form opened from the account menu. Auth-only
// (the entry point lives in the signed-in profile card).
export default function ReportModal({ onClose, onSent }) {
  const { t } = useI18n();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 5) return setError(t('report.tooShort'));
    setBusy(true);
    setError('');
    try {
      await reportsApi.create({ type, message: message.trim() });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || t('suggest.sendFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in w-full max-w-md rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="bell" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">{t('report.title')}</h3>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">{t('report.intro')}</p>

        <label htmlFor="report-type" className="mt-4 block text-xs text-ember-muted">
          {t('report.type')}
        </label>
        <select
          id="report-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="field mt-1 py-2 text-sm"
        >
          {REPORT_TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`report.${v}`)}
            </option>
          ))}
        </select>

        <label htmlFor="report-message" className="mt-3 block text-xs text-ember-muted">
          {t('report.desc')}
        </label>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder={t('report.descPh')}
          className="field mt-1 resize-none py-2 text-sm"
        />

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-4 w-full py-3"
        >
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? t('common.sending') : t('suggest.send')}
        </button>
      </form>
    </div>
  );
}
