import { useState } from 'react';
import Icon from './Icon.jsx';
import { suggestionsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

// "Non trovi il tuo bar di fiducia? Avvisaci" — lightweight lead form shown from
// the search empty state. Works signed-out; the backend attaches the user id if
// a session is present. `coords` (map center) is sent so staff can locate it.
export default function SuggestModal({ initialName = '', coords, onClose, onSent }) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) return setError(t('suggest.nameRequired'));
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
          <Icon name="pin" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">{t('suggest.title')}</h3>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">{t('suggest.intro')}</p>

        <label className="mt-4 block text-xs text-ember-muted">{t('suggest.name')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoFocus
          placeholder={t('suggest.namePh')}
          className="field mt-1 py-2 text-sm"
        />

        <label className="mt-3 block text-xs text-ember-muted">{t('suggest.city')}</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={120}
          placeholder={t('suggest.cityPh')}
          className="field mt-1 py-2 text-sm"
        />

        <label className="mt-3 block text-xs text-ember-muted">{t('suggest.note')}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={t('suggest.notePh')}
          className="field mt-1 resize-none py-2 text-sm"
        />

        <label className="mt-3 block text-xs text-ember-muted">{t('suggest.contact')}</label>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={160}
          placeholder={t('suggest.contactPh')}
          className="field mt-1 py-2 text-sm"
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
