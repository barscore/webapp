import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Pin from './Pin.jsx';
import { barsApi, eventsApi, placesApi, uploadImage } from '../services/api.js';
import { scoreMeta } from '../utils/score.js';
import { useI18n } from '../i18n/index.js';

// datetime-local vuole "YYYY-MM-DDTHH:mm" in ora locale.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Crea/modifica evento per account organizer. Il luogo è un campo solo, come
// lo si direbbe a voce: si scrive un locale o un indirizzo e si sceglie tra i
// suggerimenti (locali da una parte, vie e posti dall'altra). Senza luogo
// l'evento viene posizionato al centro attuale della mappa (`center`).
export default function EventComposer({ event = null, center, onClose, onSaved }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  // { kind: 'bar', id, name, subtitle } | { kind: 'address', lat, lng, name, subtitle }
  const [where, setWhere] = useState(null);
  const [whereQuery, setWhereQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ bars: [], places: [], loading: false });
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at));
  const [hasPresales, setHasPresales] = useState(event?.has_presales ?? false);
  const [photoUrl, setPhotoUrl] = useState(event?.photo_url ?? '');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [freeDrink, setFreeDrink] = useState(event?.free_drink ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = !!event;

  // Locali e indirizzi insieme, con debounce, finché non se n'è scelto uno.
  useEffect(() => {
    const q = whereQuery.trim();
    if (editing || where || q.length < 2) {
      setSuggestions({ bars: [], places: [], loading: false });
      return undefined;
    }
    let cancelled = false;
    setSuggestions((s) => ({ ...s, loading: true }));
    const timer = setTimeout(() => {
      Promise.all([
        placesApi.searchBars({ q, limit: 5, lat: center?.[0], lng: center?.[1] }).catch(() => []),
        placesApi.search(q, center).catch(() => []),
      ]).then(([bars, places]) => {
        if (!cancelled) setSuggestions({ bars, places: places.slice(0, 4), loading: false });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [whereQuery, where, editing, center]);

  async function pickBar(bar) {
    setError('');
    let id = bar.id;
    if (!id) {
      // Un locale mai aperto su rabar: lo si materializza per avere un id.
      try {
        const resolved = await barsApi.resolve({
          osm_node_id: bar.osm_node_id,
          osm_type: bar.osm_type,
          name: bar.name,
          address: bar.address,
          city: bar.city,
          lat: bar.lat,
          lng: bar.lng,
        });
        id = resolved.id;
      } catch {
        return setError(t('dvm.barUnavailable'));
      }
    }
    setWhere({ kind: 'bar', id, name: bar.name, subtitle: [bar.address, bar.city].filter(Boolean).join(', ') });
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setError('');
    try {
      const { url } = await uploadImage(file, 'event_cover', 1600);
      setPhotoUrl(url);
    } catch (err) {
      setError(err?.response?.data?.error || t('ec.coverError'));
    } finally {
      setPhotoBusy(false);
    }
  }

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
      has_presales: hasPresales,
      photo_url: photoUrl || null,
      free_drink: freeDrink,
    };
    try {
      if (editing) {
        await eventsApi.update(event.id, payload);
      } else {
        // Posizione: locale scelto > indirizzo scelto > centro mappa.
        const isBar = where?.kind === 'bar';
        const coords = where?.kind === 'address' ? where : { lat: center?.[0], lng: center?.[1] };
        await eventsApi.create({
          ...payload,
          bar_id: isBar ? where.id : undefined,
          lat: isBar ? undefined : coords.lat,
          lng: isBar ? undefined : coords.lng,
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
          <div className="relative">
            <label className="mt-3 block text-xs text-ember-muted">{t('ec.where')}</label>
            {where ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-ember-primary/40 bg-ember-primary/10 px-3 py-2">
                <Icon name={where.kind === 'bar' ? 'cocktail' : 'pin'} size={14} className="shrink-0 text-ember-ink" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ember-cream">{where.name}</span>
                  {where.subtitle && <span className="block truncate text-xs text-ember-muted">{where.subtitle}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWhere(null);
                    setWhereQuery('');
                  }}
                  aria-label={t('ec.removeAddress')}
                  className="shrink-0 text-ember-muted hover:text-ember-cream"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="field mt-1 flex items-center gap-2 py-2">
                  <Icon name="search" size={15} className="shrink-0 text-ember-muted" />
                  <input
                    value={whereQuery}
                    onChange={(e) => setWhereQuery(e.target.value)}
                    maxLength={200}
                    placeholder={t('ec.wherePh')}
                    className="w-full bg-transparent text-sm text-ember-cream outline-none placeholder:text-ember-muted"
                  />
                  {suggestions.loading && (
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-ember-primary/30 border-t-ember-primary" />
                  )}
                </div>
                {(suggestions.bars.length > 0 || suggestions.places.length > 0) && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-ember-line/10 bg-ember-card shadow-e2">
                    {suggestions.bars.length > 0 && (
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ember-muted">{t('ec.venues')}</p>
                    )}
                    {suggestions.bars.map((b) => (
                      <button
                        key={`b${b.osm_node_id}`}
                        type="button"
                        onClick={() => pickBar(b)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ember-cream hover:bg-ember-line/5"
                      >
                        <Pin variant={scoreMeta(b).variant} size={18} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{b.name}</span>
                          <span className="block truncate text-xs text-ember-muted">
                            {[b.address, b.city].filter(Boolean).join(', ')}
                          </span>
                        </span>
                      </button>
                    ))}
                    {suggestions.places.length > 0 && (
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ember-muted">{t('ec.addresses')}</p>
                    )}
                    {suggestions.places.map((r) => (
                      <button
                        key={`p${r.lat},${r.lng}`}
                        type="button"
                        onClick={() =>
                          setWhere({ kind: 'address', lat: r.lat, lng: r.lng, name: r.name ?? r.display_name, subtitle: r.subtitle })
                        }
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ember-cream hover:bg-ember-line/5"
                      >
                        <Icon name="pin" size={14} className="shrink-0 text-ember-ink" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{r.name ?? r.display_name}</span>
                          {r.subtitle && <span className="block truncate text-xs text-ember-muted">{r.subtitle}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-ember-muted">{t('ec.noAddressHint')}</p>
              </>
            )}
          </div>
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

        <label className="mt-3 block text-xs text-ember-muted">{t('ec.cover')}</label>
        {photoUrl ? (
          <div className="relative mt-1 overflow-hidden rounded-card border border-ember-line/10">
            <img src={photoUrl} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
                {t('ec.coverChange')}
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} disabled={photoBusy} />
              </label>
              <button type="button" onClick={() => setPhotoUrl('')} className="btn-ghost px-3 py-1.5 text-xs">
                {t('ec.coverRemove')}
              </button>
            </div>
            {photoBusy && (
              <span className="absolute inset-0 grid place-items-center bg-black/40">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
          </div>
        ) : (
          <label
            className={`mt-1 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-ember-line/20 text-sm text-ember-muted transition-colors hover:border-ember-primary/60 hover:text-ember-cream ${photoBusy ? 'pointer-events-none' : ''}`}
          >
            {photoBusy ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-ember-primary/30 border-t-ember-primary" />
            ) : (
              <>
                <Icon name="camera" size={22} className="text-ember-ink" />
                {t('ec.coverAdd')}
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} disabled={photoBusy} />
          </label>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-ember-cream cursor-pointer">
            <input
              type="checkbox"
              checked={hasPresales}
              onChange={(e) => setHasPresales(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ember-line/20 bg-ember-ink text-ember-primary focus:ring-ember-primary focus:ring-offset-ember-card"
            />
            <span>
              {t('ec.presales')}
              <span className="block text-xs text-ember-muted">{t('ec.presalesHint')}</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ember-cream cursor-pointer">
            <input
              type="checkbox"
              checked={freeDrink}
              onChange={(e) => setFreeDrink(e.target.checked)}
              className="h-4 w-4 rounded border-ember-line/20 bg-ember-ink text-ember-primary focus:ring-ember-primary focus:ring-offset-ember-card"
            />
            {t('ec.freeDrink')}
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button type="submit" disabled={busy || photoBusy} className="btn-primary mt-4 w-full py-3">
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
