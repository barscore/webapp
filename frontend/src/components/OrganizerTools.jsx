import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { organizerApi, eventsApi } from '../services/api.js';
import Icon from './Icon.jsx';
import EventComposer from './EventComposer.jsx';
import BoostModal from './BoostModal.jsx';

const FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const BANNER_KEY = 'boost-banner-dismissed:v1';

// Barra strumenti del tab Eventi per account organizer: banner promo boost,
// "Crea evento" e gestione dei propri eventi (modifica/annulla/boost).
// Per tutti gli altri ruoli non renderizza nulla.
export default function OrganizerTools({ center, bars = [], onChanged }) {
  const { role } = useAuth();
  const [composer, setComposer] = useState(null); // null | { event? }
  const [boost, setBoost] = useState(null); // null | { target, label }
  const [mineOpen, setMineOpen] = useState(false);
  const [mine, setMine] = useState([]);
  const [banner, setBanner] = useState(() => !localStorage.getItem(BANNER_KEY));

  const isOrganizer = role === 'organizer';

  useEffect(() => {
    if (!isOrganizer || !mineOpen) return;
    organizerApi
      .myEvents()
      .then(setMine)
      .catch(() => {});
  }, [isOrganizer, mineOpen, composer, boost]);

  if (!isOrganizer) return null;

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, '1');
    setBanner(false);
  }

  async function cancelEvent(ev) {
    if (!window.confirm(`Annullare "${ev.title}"? I follower verranno avvisati.`)) return;
    try {
      await eventsApi.remove(ev.id);
      setMine((list) =>
        list.map((e) => (e.id === ev.id ? { ...e, cancelled_at: new Date().toISOString() } : e)),
      );
      onChanged?.();
    } catch {
      /* la lista resta con lo stato attuale */
    }
  }

  return (
    <div className="mb-3 space-y-2">
      {/* Banner promo boost — dismissibile, solo per organizer */}
      {banner && (
        <div className="flex items-center gap-2.5 rounded-card border border-ember-primary/40 bg-ember-primary/10 p-3">
          <Icon name="euro" size={18} className="shrink-0 text-ember-ink" />
          <p className="min-w-0 flex-1 text-xs leading-snug text-ember-cream">
            <b>Metti in evidenza le tue feste.</b> Con un boost il tuo evento appare in cima alla
            lista con l'etichetta "Sponsorizzato".
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Chiudi"
            className="shrink-0 text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setComposer({})}
          className="btn-primary flex-1 py-2 text-sm"
        >
          <Icon name="plus" size={15} /> Crea evento
        </button>
        <button
          type="button"
          onClick={() => setMineOpen((o) => !o)}
          aria-expanded={mineOpen}
          className="chip"
        >
          <Icon name="star" size={15} className="text-ember-ink" /> I miei eventi
          <Icon name={mineOpen ? 'chevron-up' : 'chevron-down'} size={13} />
        </button>
      </div>

      {mineOpen && (
        <div className="card divide-y divide-ember-line/5 overflow-hidden">
          {mine.length === 0 && (
            <p className="p-3 text-sm text-ember-muted">Non hai ancora pubblicato eventi.</p>
          )}
          {mine.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ember-cream">
                  {ev.title}
                  {ev.sponsored && (
                    <span className="ml-2 rounded-full bg-ember-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-ink">
                      Sponsorizzato
                    </span>
                  )}
                  {ev.cancelled_at && (
                    <span className="ml-2 rounded-full bg-ember-danger/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-danger">
                      Annullato
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.07em] text-ember-muted">
                  {[FMT.format(new Date(ev.starts_at)), ev.bar_name].filter(Boolean).join(' · ')}
                </p>
              </div>
              {!ev.cancelled_at && (
                <>
                  <button
                    type="button"
                    onClick={() => setBoost({ target: { event_id: ev.id }, label: ev.title })}
                    aria-label="Sponsorizza"
                    className="chip !px-2.5"
                  >
                    <Icon name="euro" size={14} className="text-ember-ink" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposer({ event: ev })}
                    aria-label="Modifica"
                    className="chip !px-2.5"
                  >
                    <Icon name="edit" size={14} className="text-ember-ink" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelEvent(ev)}
                    aria-label="Annulla evento"
                    className="chip !px-2.5"
                  >
                    <Icon name="trash" size={14} className="text-ember-danger" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {composer && (
        <EventComposer
          event={composer.event}
          bars={bars}
          center={center}
          onClose={() => setComposer(null)}
          onSaved={onChanged}
        />
      )}
      {boost && (
        <BoostModal target={boost.target} label={boost.label} onClose={() => setBoost(null)} />
      )}
    </div>
  );
}
