import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EventComposer from '../components/EventComposer.jsx';
import BoostModal from '../components/BoostModal.jsx';
import { eventsApi, meApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';

const FMT_OPTS = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
function formatWhen(iso, locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, FMT_OPTS).format(d).replace(',', '');
}

export default function EventDetail() {
  const { t, dateLocale } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, freeDrinkToken } = useAuth();

  const [event, setEvent] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrs, setShowPrs] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedPrForContact, setSelectedPrForContact] = useState(null);
  const [toast, setToast] = useState(null);

  const [busyJoin, setBusyJoin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    
    Promise.all([
      eventsApi.get(id),
      eventsApi.prs(id).catch(() => [])
    ])
      .then(([eventData, prsData]) => {
        if (!cancelled) {
          setEvent(eventData);
          setPrs(prsData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Impossibile caricare evento');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [id]);

  const isPr = user?.role === 'organizer';
  const isCreator = user?.id === event?.organizer_id;
  const amIJoined = prs.some(pr => pr.id === user?.id);

  const togglePrJoin = async () => {
    if (!isAuthenticated) return setToast('Devi accedere per unirti.');
    if (busyJoin) return;
    setBusyJoin(true);
    try {
      if (amIJoined) {
        await eventsApi.leave(id);
        setPrs(prs.filter(pr => pr.id !== user.id));
        setToast('Ti sei rimosso dai PR di questo evento.');
      } else {
        const myProfile = await meApi.profile();
        if (!myProfile.instagram_username && !myProfile.whatsapp_number) {
          setShowContactModal(true);
          setBusyJoin(false);
          return;
        }

        await eventsApi.join(id);
        setPrs([...prs, myProfile]);
        setToast('Ti sei unito come PR!');
      }
    } catch (e) {
      setToast('Errore durante l\'operazione');
    } finally {
      setBusyJoin(false);
    }
  };

  const handleContactModalSubmit = async (ig, wa) => {
    try {
      const updatedProfile = await meApi.updateProfile({ 
        instagram_username: ig || null, 
        whatsapp_number: wa || null 
      });
      setToast('Contatti aggiornati!');
      setShowContactModal(false);
      
      // Attempt join again
      await eventsApi.join(id);
      setPrs([...prs, updatedProfile]);
      setToast('Ti sei unito come PR!');
    } catch (e) {
      setToast('Errore durante l\'operazione');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col pt-6 pb-20 px-4">
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-6 w-3/4 rounded bg-ember-line/10" />
          <div className="h-40 w-full rounded-card bg-ember-line/10" />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col pt-6 pb-20 px-4">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ember-muted hover:text-ember-cream transition">
            <Icon name="arrow-left" size={16} /> Torna indietro
          </Link>
        </div>
        <EmptyState title="Errore" hint={error} icon="warning" />
      </main>
    );
  }

  const handleContactPr = (pr) => {
    if (pr.instagram_username && pr.whatsapp_number) {
      setSelectedPrForContact(pr);
    } else if (pr.instagram_username) {
      window.open(`https://instagram.com/${pr.instagram_username}`, '_blank');
    } else if (pr.whatsapp_number) {
      window.open(`https://wa.me/${pr.whatsapp_number.replace(/\D/g, '')}`, '_blank');
    } else {
      setToast('Questo PR non ha impostato un metodo di contatto.');
    }
  };

  const getDirections = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`, '_blank');
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col pt-6 pb-24">
      <div className="px-4 mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ember-muted hover:text-ember-cream transition">
          <Icon name="arrow-left" size={16} /> Torna agli eventi
        </Link>
      </div>

      <article className="flex flex-col px-4">
        {event.photo_url && (
          <img src={event.photo_url} alt={event.title} className="mb-6 aspect-video w-full rounded-card object-cover border border-ember-line/10" />
        )}
        
        <h1 className="mb-2 font-display text-2xl font-black leading-tight text-ember-cream">
          {event.title}
        </h1>
        
        <div className="mb-6 flex flex-col gap-2 text-sm text-ember-muted">
          <div className="flex items-center gap-2">
            <Icon name="event" size={16} className="text-ember-primary" />
            <span className="font-medium text-ember-cream capitalize">{formatWhen(event.starts_at, dateLocale)}</span>
          </div>
          {event.bar_id ? (
            <Link to={`/bar/${event.bar_id}`} className="flex items-center gap-2 hover:text-ember-cream transition">
              <Icon name="pin" size={16} className="text-ember-primary" />
              <span className="font-medium text-ember-primary underline">{event.bar_name}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Icon name="pin" size={16} className="text-ember-primary" />
              <span className="font-medium text-ember-cream">Location indipendente</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-ember-muted">
            {event.description}
          </p>
        )}
        
        <div className="mb-6 flex flex-wrap gap-2">
          {event.free_drink && !!freeDrinkToken && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
              <Icon name="cocktail" size={14} />
              Free Drink
            </span>
          )}
          {event.has_presales && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 border border-green-500/20">
              <Icon name="euro" size={14} />
              Prevendite Disponibili
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={getDirections}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-ember-line/10 py-3.5 text-[15px] font-bold text-ember-cream hover:bg-ember-line/20 transition"
          >
            <Icon name="locate" size={18} />
            Indicazioni Stradali
          </button>
          
          {event.has_presales && (
            <button
              onClick={() => setShowPrs(true)}
              className="flex w-full items-center justify-center gap-2 rounded-card bg-ember-primary py-3.5 text-[15px] font-bold text-ember-on-primary hover:bg-ember-primary/90 transition shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
            >
              <Icon name="euro" size={18} />
              Acquista Prevendite
            </button>
          )}
        </div>

        {isPr && (
          <div className="mt-8 rounded-card border border-ember-line/10 bg-ember-line/5 p-4 text-center">
            <p className="mb-3 text-sm text-ember-muted">Sei un PR? Unisciti a questo evento per farti contattare per le prevendite.</p>
            <button
              onClick={togglePrJoin}
              disabled={busyJoin}
              className={`w-full py-3 ${amIJoined ? 'btn-ghost' : 'btn-primary'}`}
            >
              {busyJoin ? 'Caricamento...' : amIJoined ? 'Esci dall\'evento' : 'Unisciti come PR'}
            </button>
          </div>
        )}

        {isCreator && (
          <div className="mt-8 rounded-card border border-ember-line/10 bg-ember-line/5 p-4">
            <h3 className="mb-4 text-sm font-bold text-ember-muted uppercase tracking-wider text-center">Gestione Evento</h3>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowEdit(true)} className="btn-ghost w-full py-2.5">
                Modifica evento
              </button>
              <button onClick={() => setShowBoost(true)} className="btn-primary w-full py-2.5">
                Boost evento
              </button>
              <button 
                onClick={async () => {
                  if (window.confirm('Sicuro di voler eliminare questo evento?')) {
                    try {
                      await eventsApi.remove(id);
                      navigate('/');
                    } catch(e) {
                      setToast('Errore eliminazione');
                    }
                  }
                }} 
                className="btn-ghost w-full py-2.5 text-ember-danger border-ember-danger/20"
              >
                Elimina evento
              </button>
            </div>
          </div>
        )}
      </article>
      
      {showEdit && (
        <div className="fixed inset-0 z-[2000] overflow-y-auto bg-black/80 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="relative min-h-screen w-full bg-ember-ink sm:min-h-0 sm:max-w-lg sm:rounded-sheet">
            <EventComposer
              event={event}
              onClose={() => setShowEdit(false)}
              onSaved={(updated) => {
                setEvent(updated);
                setShowEdit(false);
                setToast('Evento aggiornato!');
              }}
            />
          </div>
        </div>
      )}

      {showBoost && (
        <BoostModal
          target={{ event_id: event.id }}
          label={event.title}
          onClose={() => setShowBoost(false)}
        />
      )}
      
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      {showPrs && event.has_presales && (
        <PrListModal 
          prs={prs} 
          onClose={() => setShowPrs(false)} 
          onContact={handleContactPr} 
        />
      )}
      
      {showContactModal && (
        <PrContactModal 
          onClose={() => setShowContactModal(false)}
          onSubmit={handleContactModalSubmit}
        />
      )}

      {selectedPrForContact && (
        <ContactChoiceModal
          pr={selectedPrForContact}
          onClose={() => setSelectedPrForContact(null)}
        />
      )}
    </main>
  );
}

function PrListModal({ prs, onClose, onContact }) {
  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in flex w-full max-w-sm flex-col rounded-sheet p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Icon name="user" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">PR Disponibili</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        
        {prs.length === 0 ? (
          <p className="py-4 text-center text-sm text-ember-muted">Nessun PR registrato per questo evento.</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {prs.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between rounded-card border border-ember-line/10 bg-ember-ink p-3">
                <div className="flex items-center gap-3">
                  {pr.avatar_url ? (
                    <img src={pr.avatar_url} alt={pr.username} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember-line/10 text-ember-muted">
                      <Icon name="user" size={20} />
                    </div>
                  )}
                  <span className="truncate font-bold text-ember-cream">{pr.username}</span>
                </div>
                <button
                  onClick={() => onContact(pr)}
                  className="rounded-full bg-ember-line/10 px-4 py-1.5 text-xs font-bold text-ember-cream hover:bg-ember-line/20 transition"
                >
                  Contatta
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactChoiceModal({ pr, onClose }) {
  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in w-full max-w-sm flex-col gap-4 rounded-sheet p-5 flex"
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon name="social" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Contatta {pr.username}</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        
        <button
          onClick={() => {
            window.open(`https://instagram.com/${pr.instagram_username}`, '_blank');
            onClose();
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-pink-500/10 py-3 text-[15px] font-bold text-pink-500 border border-pink-500/20 hover:bg-pink-500/20 transition"
        >
          Instagram
        </button>
        
        <button
          onClick={() => {
            window.open(`https://wa.me/${pr.whatsapp_number.replace(/\D/g, '')}`, '_blank');
            onClose();
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-3 text-[15px] font-bold text-green-500 border border-green-500/20 hover:bg-green-500/20 transition"
        >
          WhatsApp
        </button>
      </div>
    </div>
  );
}

function PrContactModal({ onClose, onSubmit }) {
  const [ig, setIg] = useState('');
  const [wa, setWa] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ig.trim() && !wa.trim()) {
      return setError('Devi inserire almeno un metodo di contatto per unirti.');
    }
    setBusy(true);
    await onSubmit(ig.trim(), wa.trim());
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in w-full max-w-md rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="user" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">Contatti PR</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">Per unirti all'evento, inserisci almeno un contatto che verrà mostrato ai clienti.</p>

        <label className="mt-4 block text-xs text-ember-muted">Username Instagram</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-2.5 text-ember-muted">@</span>
          <input
            value={ig}
            onChange={(e) => setIg(e.target.value)}
            maxLength={30}
            autoFocus
            placeholder="username"
            className="field py-2 pl-8 text-[15px]"
          />
        </div>

        <label className="mt-3 block text-xs text-ember-muted">Numero WhatsApp</label>
        <input
          type="tel"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          maxLength={20}
          placeholder="+39 333 1234567"
          className="field mt-1 py-2 text-[15px]"
        />

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-4 w-full py-3"
        >
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Salvataggio...' : 'Salva e unisciti'}
        </button>
      </form>
    </div>
  );
}
// HMR fix
