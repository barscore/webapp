import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { eventsApi, placesApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

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
  const { t } = useI18n();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [barId, setBarId] = useState(event?.bar_id ?? '');
  // Indirizzo libero (geocoder Nominatim): usato quando nessun locale è scelto.
  const [address, setAddress] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [place, setPlace] = useState(null); // { lat, lng, label } scelto dai risultati
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = !!event;

  // Geocoding con debounce: niente richieste finché l'utente scrive, e nessuna
  // ricerca quando l'indirizzo è già stato scelto o c'è un locale selezionato.
  useEffect(() => {
    const q = address.trim();
    if (editing || barId || place || q.length < 3) {
      setAddressResults([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      placesApi
        .search(q)
        .then((r) => !cancelled && setAddressResults(r.slice(0, 5)))
        .catch(() => !cancelled && setAddressResults([]));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [address, barId, place, editing]);

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 2) return setError(t('ec.titleRequired'));
    if (!startsAt) return setError(t('ec.startRequired'));
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
        // Posizione: locale scelto > indirizzo geocodificato > centro mappa.
        const coords = place ?? { lat: center?.[0], lng: center?.[1] };
        await eventsApi.create({
          ...payload,
          bar_id: barId || undefined,
          lat: barId ? undefined : coords.lat,
          lng: barId ? undefined : coords.lng,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || t('form.saveError'));
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
          <Icon name="event" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">
            {editing ? t('ec.editTitle') : t('ec.createTitle')}
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

        <label className="mt-4 block text-xs text-ember-muted">{t('ec.title')}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
          placeholder={t('ec.titlePh')}
          className="field mt-1 py-2 text-sm"
        />

        <label className="mt-3 block text-xs text-ember-muted">{t('ec.desc')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('ec.descPh')}
          className="field mt-1 resize-none py-2 text-sm"
        />

        {!editing && (
          <>
            <label className="mt-3 block text-xs text-ember-muted">{t('ec.venue')}</label>
            <select
              value={barId}
              onChange={(e) => setBarId(e.target.value)}
              className="field mt-1 py-2 text-sm"
            >
              <option value="">{t('ec.noVenue')}</option>
              {bars
                .filter((b) => b.id && !b.id.startsWith?.('osm'))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>

            {!barId && (
              <div className="relative">
                <label className="mt-3 block text-xs text-ember-muted">{t('ec.address')}</label>
                {place ? (
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-ember-primary/40 bg-ember-primary/10 px-3 py-2">
                    <Icon name="pin" size={14} className="shrink-0 text-ember-ink" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ember-cream">
                      {place.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPlace(null);
                        setAddress('');
                      }}
                      aria-label={t('ec.removeAddress')}
                      className="shrink-0 text-ember-muted hover:text-ember-cream"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      maxLength={200}
                      placeholder={t('ec.addressPh')}
                      className="field mt-1 py-2 text-sm"
                    />
                    {addressResults.length > 0 && (
                      <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-ember-line/10 bg-ember-card shadow-lg">
                        {addressResults.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setPlace({ lat: r.lat, lng: r.lng, label: r.display_name });
                              setAddressResults([]);
                            }}
                            className="flex w-full items-start gap-2 border-b border-ember-line/5 px-3 py-2 text-left text-sm text-ember-cream last:border-0 hover:bg-ember-line/5"
                          >
                            <Icon name="pin" size={13} className="mt-0.5 shrink-0 text-ember-ink" />
                            <span className="min-w-0 flex-1 truncate">{r.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-ember-muted">{t('ec.noAddressHint')}</p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ember-muted">{t('ec.start')}</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="field mt-1 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ember-muted">{t('ec.end')}</label>
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
          {busy ? t('common.saving') : editing ? t('ec.saveChanges') : t('ec.publish')}
        </button>
        {!editing && (
          <p className="mt-2 text-center text-[11px] text-ember-muted">{t('ec.followersNote')}</p>
        )}
      </form>
    </div>
  );
}
