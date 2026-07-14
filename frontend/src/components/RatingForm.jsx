import { useState } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';

const DIMENSIONS = [
  { key: 'prezzo', label: 'axis.prezzo', icon: 'euro', hint: 'axis.prezzoHint' },
  { key: 'qualita_drinks', label: 'axis.qualita_drinks', icon: 'bottle', hint: 'axis.drinksHint' },
  { key: 'socialita', label: 'axis.socialita', icon: 'social', hint: 'axis.socialitaHint' },
  { key: 'varieta', label: 'axis.varieta', icon: 'cocktail', hint: 'axis.varietaHint' },
  { key: 'orari', label: 'axis.orari', icon: 'bell', hint: 'axis.orariHint' },
];

// Five 1–5 sliders + optional comment. Pass `initial` to edit an existing vote,
// `onDelete` to allow removing it.
export default function RatingForm({ initial, onSubmit, onCancel, onDelete }) {
  const { t } = useI18n();
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
      setError(err.response?.data?.error || t('form.saveError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm(t('form.deleteConfirm'))) return;
    setBusy(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err.response?.data?.error || t('bar.deleteError'));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 card p-4"
    >
      <h3 className="flex items-center gap-2 font-display font-bold text-ember-cream">
        <Icon name="cocktail" size={18} className="text-ember-ink" />
        {initial ? t('form.editYourRating') : t('form.yourRating')}
      </h3>

      {DIMENSIONS.map((d) => (
        <div key={d.key}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 font-medium text-ember-cream">
              <Icon name={d.icon} size={16} className="text-ember-ink" />
              {t(d.label)}
            </label>
            <span className="font-display font-semibold text-ember-ink">{values[d.key]}</span>
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
          <p className="text-xs text-ember-muted">{t(d.hint)}</p>
        </div>
      ))}

      <div>
        <label className="font-medium text-ember-cream">{t('form.comment')}</label>
        <textarea
          value={commento}
          maxLength={500}
          rows={3}
          onChange={(e) => setCommento(e.target.value)}
          className="field mt-1 py-2 text-sm"
          placeholder={t('form.commentPh')}
        />
        <div className="flex items-center justify-between text-xs text-ember-muted">
          <button
            type="button"
            disabled
            title={t('form.photoSoon')}
            className="flex items-center gap-1.5 opacity-50"
          >
            <Icon name="camera" size={16} /> {t('form.addPhoto')}
          </button>
          <span>{commento.length}/500</span>
        </div>
      </div>

      {error && <p className="text-sm text-ember-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember-primary py-2.5 font-semibold text-ember-on-primary active:scale-[0.98] disabled:opacity-50"
        >
          <Icon name="check" size={18} />
          {busy ? t('common.saving') : t('common.save')}
        </button>
        {onDelete && initial && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label={t('form.deleteAria')}
            className="rounded-lg bg-ember-bg p-2.5 text-ember-danger disabled:opacity-50"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={t('common.cancel')}
            className="rounded-lg bg-ember-bg p-2.5 text-ember-cream disabled:opacity-50"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
