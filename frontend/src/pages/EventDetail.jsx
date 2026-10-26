import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EventComposer from '../components/EventComposer.jsx';
import BoostModal from '../components/BoostModal.jsx';
import { EventBadge, PosterFallback } from '../components/EventRow.jsx';
import { eventsApi, meApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFollows } from '../hooks/useFollows.js';
import { useI18n } from '../i18n/index.js';
import { useMonetization } from '../services/monetization.js';
import { copyText } from '../utils/share.js';
import { isAndroid, getProvider, mapsUrl } from '../utils/directions.js';
import { eventParts, longDate, timeRange, isPast, relativeDay } from '../utils/eventDate.js';

const instagramUrl = (u) => `https://instagram.com/${encodeURIComponent(u)}`;
const whatsappUrl = (n) => `https://wa.me/${n.replace(/\D/g, '')}`;

// The backend answers a rejected body with the zod issue in `details` (e.g.
// "Numero WhatsApp non valido"), which says more than the generic `error`.
function apiError(e, fallback) {
  const data = e?.response?.data;
  return data?.details?.[0]?.message || data?.error || fallback;
}

/**
 * `/event/:id` — the event page. A cover across the top, the title over its
 * fade, then when / where / who in one card, the description, and the PRs to
 * write to for a presale. The main action sits in a bar at the bottom: «Prendi
 * la prevendita» when the event sells them, directions otherwise. Below the
 * content, the tools of whoever runs it: a PR joins, the creator approves PRs,
 * edits, boosts, deletes.
 */
export default function EventDetail() {
  const { t, dateLocale } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, freeDrinkToken } = useAuth();
  const { isFollowing, toggle } = useFollows();
  const monetization = useMonetization();
  const presalesRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [busyJoin, setBusyJoin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([eventsApi.get(id), eventsApi.prs(id).catch(() => [])])
      .then(([eventData, prsData]) => {
        if (cancelled) return;
        setEvent(eventData);
        setPrs(prsData);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, t('evd.loadError')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/?tab=eventi'));

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-xl pb-28 sm:pt-6">
        <div className="skel aspect-[4/3] w-full rounded-none sm:rounded-sheet" />
        <div className="space-y-3 px-5 pt-6">
          <div className="skel h-8 w-3/4" />
          <div className="skel h-4 w-1/3" />
          <div className="skel mt-6 h-40 w-full" />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col px-4 pb-20 pt-6">
        <button onClick={goBack} className="chip mb-6 self-start">
          <Icon name="arrow-left" size={15} /> {t('evd.back')}
        </button>
        <EmptyState title={t('evd.loadError')} hint={error} icon="warning" />
      </main>
    );
  }

  const isPr = user?.role === 'organizer';
  const isCreator = !!user?.id && user.id === event.organizer_id;
  const myPr = prs.find((pr) => pr.id === user?.id);
  const approvedPrs = prs.filter((pr) => !pr.pending);
  const followsEvent = isFollowing('events', event.id);
  const followsOrganizer = !!event.organizer_id && isFollowing('organizers', event.organizer_id);
  const cancelled = !!event.cancelled_at;
  const past = !cancelled && isPast(event.starts_at, event.ends_at);
  const open = !cancelled && !past;
  const showFreeDrink = event.free_drink && !!freeDrinkToken;
  const parts = eventParts(event.starts_at, dateLocale);
  const rel = relativeDay(event.starts_at);
  const kicker = parts
    ? `${rel ? t(rel === 'today' ? 'ev.today' : 'ev.tomorrow') : `${parts.weekday} ${parts.day} ${parts.month}`} · ${parts.time}`
    : '';

  const guard = (fn) => () => (isAuthenticated ? fn() : navigate('/login'));

  const share = async () => {
    const url = `${window.location.origin}/event/${event.id}`;
    const data = { title: `${event.title} · rabar`, text: t('evd.shareText', { title: event.title }), url };
    try {
      if (navigator.share) return await navigator.share(data);
      if (await copyText(url)) setToast(t('evd.linkCopied'));
    } catch {
      /* share sheet dismissed */
    }
  };

  const directions = () => {
    const provider = isAndroid() ? 'google' : getProvider() || (/iphone|ipad|mac/i.test(navigator.userAgent) ? 'apple' : 'google');
    const url = mapsUrl(provider, event);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const scrollToPresales = () => presalesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // The join is an application: in public a PR shows only after the creator
  // of the event approves it.
  const addMe = (profile, res) => {
    setPrs((list) => [...list.filter((p) => p.id !== user.id), { ...profile, id: user.id, pending: !!res?.pending }]);
    setToast(res?.pending ? t('evd.prRequested') : t('evd.prJoined'));
  };

  const togglePrJoin = async () => {
    if (!isAuthenticated) return setToast(t('evd.loginToJoin'));
    if (busyJoin) return;
    setBusyJoin(true);
    try {
      if (myPr) {
        await eventsApi.leave(id);
        setPrs((list) => list.filter((pr) => pr.id !== user.id));
        setToast(myPr.pending ? t('evd.prCancelled') : t('evd.prLeft'));
      } else {
        const me = await meApi.profile();
        if (!me.instagram_username && !me.whatsapp_number) {
          setShowContactModal(true);
          return;
        }
        addMe(me, await eventsApi.join(id));
      }
    } catch (e) {
      setToast(apiError(e, t('evd.opError')));
    } finally {
      setBusyJoin(false);
    }
  };

  const saveContactsAndJoin = async (ig, wa) => {
    const updated = await meApi.updateProfile({ instagram_username: ig || null, whatsapp_number: wa || null });
    setShowContactModal(false);
    addMe(updated, await eventsApi.join(id));
  };

  const decidePr = async (pr, approve) => {
    try {
      if (approve) {
        await eventsApi.approvePr(id, pr.id);
        setPrs((list) => list.map((p) => (p.id === pr.id ? { ...p, pending: false } : p)));
      } else {
        await eventsApi.removePr(id, pr.id);
        setPrs((list) => list.filter((p) => p.id !== pr.id));
      }
    } catch (e) {
      setToast(apiError(e, t('evd.opError')));
    }
  };

  const remove = async () => {
    if (!window.confirm(t('evd.deleteConfirm'))) return;
    try {
      await eventsApi.remove(id);
      navigate('/?tab=eventi');
    } catch (e) {
      setToast(apiError(e, t('evd.deleteError')));
    }
  };

  return (
    <main className={`mx-auto w-full max-w-xl sm:pt-6 ${open && event.has_presales ? 'pb-32' : 'pb-12'}`}>
      {/* Cover */}
      <div className="relative aspect-[4/3] max-h-[58vh] w-full overflow-hidden sm:rounded-sheet">
        {event.photo_url ? (
          <img src={event.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <PosterFallback iconSize={150} />
        )}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ember-bg via-ember-bg/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),16px)]">
          <RoundButton icon="arrow-left" label={t('evd.back')} onClick={goBack} />
          <span className="flex-1" />
          <RoundButton icon="share" label={t('evd.share')} onClick={share} />
          <RoundButton
            icon={followsEvent ? 'check' : 'bell'}
            label={followsEvent ? t('ev.unfollowEvent') : t('ev.followEvent')}
            onClick={guard(() => toggle('events', event.id))}
            on={followsEvent}
          />
        </div>
      </div>

      {/* Title over the fade */}
      <header className="relative -mt-24 px-5">
        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {cancelled && <StatusPill danger>{t('evd.cancelled')}</StatusPill>}
            {past && <StatusPill>{t('evd.past')}</StatusPill>}
            {event.sponsored && open && <StatusPill solid>{t('ev.sponsored')}</StatusPill>}
            {event.has_presales && open && <EventBadge icon="euro">{t('ev.presales')}</EventBadge>}
            {showFreeDrink && open && <EventBadge icon="cocktail">{t('ev.freeDrink')}</EventBadge>}
          </div>
          <h1 className="font-display text-[30px] font-black leading-[1.08] text-ember-cream [text-wrap:balance]">
            {event.title}
          </h1>
          <p className="mt-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ember-ink">{kicker}</p>
        </div>
      </header>

      {/* When · where · who */}
      <section className="card mx-4 mt-6 divide-y divide-ember-line/[0.06] overflow-hidden">
        <InfoRow icon="event" label={t('evd.when')}>
          <span className="block first-letter:uppercase">{longDate(event.starts_at, dateLocale)}</span>
          <span className="block text-[13px] font-medium text-ember-muted">
            {timeRange(event.starts_at, event.ends_at, dateLocale)}
          </span>
        </InfoRow>
        <InfoRow
          icon="pin"
          label={t('evd.where')}
          action={
            event.lat != null && (
              <button onClick={directions} className="chip px-3 py-1.5 text-[13px]">
                <Icon name="locate" size={14} className="text-ember-ink" /> {t('evd.directions')}
              </button>
            )
          }
        >
          {event.bar_id ? (
            <Link to={`/bar/${event.bar_id}`} className="underline decoration-ember-primary/50 underline-offset-4 hover:text-ember-ink">
              {event.bar_name}
            </Link>
          ) : (
            t('evd.placeOnMap')
          )}
        </InfoRow>
        {event.organizer_username && (
          <InfoRow
            avatar
            label={t('evd.organizer')}
            action={
              <button
                onClick={guard(() => toggle('organizers', event.organizer_id))}
                aria-pressed={followsOrganizer}
                aria-label={t(followsOrganizer ? 'ev.unfollowUser' : 'ev.followUser', { user: event.organizer_username })}
                className={`chip px-3 py-1.5 text-[13px] ${followsOrganizer ? 'chip-on' : ''}`}
              >
                <Icon name={followsOrganizer ? 'check' : 'bell'} size={14} />
                {followsOrganizer ? t('ev.following') : t('ev.follow')}
              </button>
            }
          >
            @{event.organizer_username}
          </InfoRow>
        )}
      </section>

      {event.description && (
        <section className="mx-5 mt-7">
          <SectionTitle icon="info">{t('evd.about')}</SectionTitle>
          <p className="mt-3 select-text whitespace-pre-wrap text-[15px] leading-relaxed text-ember-cream/85">
            {event.description}
          </p>
        </section>
      )}

      {event.has_presales && (
        <section ref={presalesRef} className="mx-4 mt-7 scroll-mt-6">
          <div className="px-1">
            <SectionTitle icon="euro" count={approvedPrs.length}>
              {t('evd.presalesTitle')}
            </SectionTitle>
            <p className="mt-1.5 text-[13px] text-ember-muted">{t('evd.presalesHint')}</p>
          </div>
          {approvedPrs.length === 0 ? (
            <p className="row mt-3 px-4 py-5 text-center text-sm text-ember-muted">{t('evd.noPrs')}</p>
          ) : (
            <ul className="stagger mt-3 space-y-2">
              {approvedPrs.map((pr) => (
                <li key={pr.id}>
                  <PrRow pr={pr} t={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isPr && !isCreator && open && (
        <section className="card mx-4 mt-7 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember-primary/[0.12] text-ember-ink">
              <Icon name="social" size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[16px] font-bold text-ember-cream">{t('evd.prBoxTitle')}</h3>
              <p className="mt-0.5 text-[13px] text-ember-muted">
                {myPr?.pending ? t('evd.prPendingNote') : t('evd.prBoxHint')}
              </p>
            </div>
          </div>
          <button
            onClick={togglePrJoin}
            disabled={busyJoin}
            className={`mt-4 w-full py-3 ${myPr ? 'btn-ghost' : 'btn-primary'}`}
          >
            {busyJoin
              ? t('common.loading')
              : myPr?.pending
                ? t('evd.prCancel')
                : myPr
                  ? t('evd.prLeave')
                  : t('evd.prJoin')}
          </button>
        </section>
      )}

      {isCreator && (
        <section className="card mx-4 mt-7 p-4">
          <SectionTitle icon="edit">{t('evd.manage')}</SectionTitle>
          {prs.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ember-muted">{t('evd.eventPrs')}</p>
              <ul className="space-y-2">
                {prs.map((pr) => (
                  <li key={pr.id} className="row flex items-center gap-3 p-2.5">
                    <Avatar url={pr.avatar_url} size={34} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ember-cream">
                      {pr.username}
                      {pr.pending && <span className="ml-2 text-xs font-medium text-ember-muted">{t('evd.pending')}</span>}
                    </span>
                    {pr.pending && (
                      <button onClick={() => decidePr(pr, true)} className="btn-primary px-3 py-1.5 text-xs">
                        {t('evd.approve')}
                      </button>
                    )}
                    <button onClick={() => decidePr(pr, false)} className="btn-ghost px-3 py-1.5 text-xs">
                      {pr.pending ? t('evd.reject') : t('evd.remove')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={`mt-4 grid gap-2 ${monetization ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button onClick={() => setShowEdit(true)} className="btn-ghost py-2.5">
              <Icon name="edit" size={16} /> {t('evd.edit')}
            </button>
            {monetization && (
              <button onClick={() => setShowBoost(true)} className="btn-primary py-2.5">
                <Icon name="star" size={16} /> {t('evd.boost')}
              </button>
            )}
          </div>
          <button onClick={remove} className="btn mt-2 w-full py-2.5 text-ember-danger hover:bg-ember-danger/10">
            <Icon name="trash" size={16} /> {t('evd.delete')}
          </button>
        </section>
      )}

      {/* Main action: the presales. Directions already sit in the «Dove» row. */}
      {open && event.has_presales && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1500] bg-gradient-to-t from-ember-bg via-ember-bg/90 to-transparent pt-8">
          <div className="pointer-events-auto mx-auto max-w-xl px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
            <button onClick={scrollToPresales} className="btn-primary h-[52px] w-full rounded-full text-[15px] shadow-glow">
              <Icon name="euro" size={18} /> {t('evd.getPresale')}
              {approvedPrs.length > 0 && (
                <span className="rounded-full bg-ember-on-primary/15 px-2 py-0.5 text-xs tabular-nums">
                  {t('evd.prCount', { n: approvedPrs.length })}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-[2000] overflow-y-auto bg-black/80 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="relative min-h-screen w-full bg-ember-bg sm:min-h-0 sm:max-w-lg sm:rounded-sheet">
            <EventComposer
              event={event}
              onClose={() => setShowEdit(false)}
              onSaved={(updated) => {
                // The PUT answers with the bare row: keep the joined fields.
                setEvent((prev) => ({ ...prev, ...updated, bar_name: updated?.bar_name ?? prev.bar_name }));
                setShowEdit(false);
                setToast(t('evd.updated'));
              }}
            />
          </div>
        </div>
      )}

      {showBoost && <BoostModal target={{ event_id: event.id }} label={event.title} onClose={() => setShowBoost(false)} />}

      {showContactModal && (
        <PrContactModal t={t} onClose={() => setShowContactModal(false)} onSubmit={saveContactsAndJoin} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}

// Round button over the cover. Glass is allowed here: a 40px control on a photo.
function RoundButton({ icon, label, onClick, on = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on || undefined}
      className={`press grid h-10 w-10 place-items-center rounded-full border border-white/15 backdrop-blur-md ${
        on ? 'bg-ember-primary text-ember-on-primary' : 'bg-black/40 text-white'
      }`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function StatusPill({ children, solid = false, danger = false }) {
  const tone = danger
    ? 'border-ember-danger/40 bg-ember-danger/15 text-ember-danger'
    : solid
      ? 'border-transparent bg-ember-primary text-ember-on-primary'
      : 'border-ember-line/15 bg-ember-line/10 text-ember-cream';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}>
      {children}
    </span>
  );
}

function SectionTitle({ icon, children, count }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name={icon} size={16} className="text-ember-ink" />
      <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-ember-cream">{children}</h2>
      {count != null && (
        <span className="rounded-full border border-ember-line/10 bg-ember-line/5 px-2 py-0.5 text-[11px] font-bold tabular-nums text-ember-muted">
          {count}
        </span>
      )}
    </div>
  );
}

function InfoRow({ icon, avatar = false, label, action, children }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      {avatar ? (
        <Avatar url={null} size={40} />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-ember-primary/[0.12] text-ember-ink">
          <Icon name={icon} size={18} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ember-muted">{label}</p>
        <div className="mt-0.5 truncate text-[15px] font-semibold text-ember-cream">{children}</div>
      </div>
      {action}
    </div>
  );
}

// A PR to write to for a presale: one button per contact they left.
function PrRow({ pr, t }) {
  const ig = pr.instagram_username;
  const wa = pr.whatsapp_number;
  return (
    <div className="row flex items-center gap-3 p-3">
      <Avatar url={pr.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ember-cream">{pr.username}</p>
        <p className="text-[12px] text-ember-muted">{ig || wa ? t('evd.prLabel') : t('evd.noContact')}</p>
      </div>
      {wa && (
        <a
          href={whatsappUrl(wa)}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-[13px] font-bold text-[#06210F]"
        >
          <Icon name="phone" size={14} /> WhatsApp
        </a>
      )}
      {ig && (
        <a
          href={instagramUrl(ig)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Instagram @${ig}`}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-3 text-[13px] font-bold text-white"
        >
          <Icon name="social" size={14} /> {wa ? 'IG' : 'Instagram'}
        </a>
      )}
    </div>
  );
}

function PrContactModal({ t, onClose, onSubmit }) {
  const [ig, setIg] = useState('');
  const [wa, setWa] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ig.trim() && !wa.trim()) return setError(t('evd.contactsRequired'));
    setBusy(true);
    setError('');
    try {
      await onSubmit(ig.trim(), wa.trim());
    } catch (err) {
      setError(apiError(err, t('evd.opError')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center"
      onClick={onClose}
    >
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="glass-flat fade-in w-full max-w-md rounded-sheet p-5">
        <div className="flex items-center gap-2">
          <Icon name="social" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">{t('evd.contactsTitle')}</h3>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ember-muted">{t('evd.contactsHint')}</p>

        <label className="mt-4 block text-xs text-ember-muted" htmlFor="pr-ig">{t('evd.igLabel')}</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-2.5 text-ember-muted">@</span>
          <input
            id="pr-ig"
            value={ig}
            onChange={(e) => setIg(e.target.value)}
            maxLength={30}
            autoFocus
            placeholder="username"
            className="field py-2 pl-8 text-[15px]"
          />
        </div>

        <label className="mt-3 block text-xs text-ember-muted" htmlFor="pr-wa">{t('evd.waLabel')}</label>
        <input
          id="pr-wa"
          type="tel"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          maxLength={20}
          placeholder="+39 333 1234567"
          className="field mt-1 py-2 text-[15px]"
        />

        {error && <p className="mt-3 text-sm text-ember-danger">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
          <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
          {busy ? t('common.saving') : t('evd.saveAndJoin')}
        </button>
      </form>
    </div>
  );
}
