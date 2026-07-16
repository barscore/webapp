import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { notificationsApi } from '../services/api.js';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';

const FMT_OPTS = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

// Campanella con badge non lette + pannello inbox. Poll leggero (60s) mentre
// l'app è aperta; l'apertura del pannello segna tutto come letto.
export default function NotificationsBell() {
  const { t, dateLocale } = useI18n();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    const load = () =>
      notificationsApi
        .list({ limit: 20 })
        .then((d) => {
          if (!active) return;
          setItems(d.notifications);
          setUnread(d.unread);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  if (!isAuthenticated) return null;

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      notificationsApi.markRead({ all: true }).catch(() => {});
      setUnread(0);
      setItems((list) => list.map((n) => ({ ...n, read: true })));
    }
  }

  function go(n) {
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t('notif.title')}
        className="glass press relative flex h-11 w-11 items-center justify-center rounded-full text-ember-cream transition-colors hover:text-ember-ink"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ember-primary px-1 text-[10px] font-bold text-ember-on-primary">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-flat fade-in absolute right-0 z-[1400] mt-2 max-h-[60vh] w-72 overflow-y-auto rounded-lg2">
          <div className="border-b border-ember-line/5 px-3 py-2.5 font-display text-sm font-bold text-ember-cream">
            {t('notif.title')}
          </div>
          {items.length === 0 && (
            <p className="px-3 py-4 text-sm text-ember-muted">{t('notif.empty')}</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n)}
              className="block w-full border-b border-ember-line/5 px-3 py-2.5 text-left last:border-0 hover:bg-ember-line/5"
            >
              <span className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ember-primary" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ember-cream">
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block text-xs leading-snug text-ember-muted">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-ember-muted/70">
                    {new Intl.DateTimeFormat(dateLocale, FMT_OPTS).format(new Date(n.created_at))}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
