import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../services/supabase.js';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';

// Format ms → "2g 04h 13m 09s" (drops the day segment when 0).
function fmt(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (d > 0 ? `${d}g ` : '') + `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

// Top banner shown to the signed-in user when their own account is banned or
// suspended. Reads own moderation state via the anon key (backend calls 403 for
// these accounts). Closable; "Dettagli" reveals reason + a live countdown.
export default function BanBanner() {
  const { t, dateLocale } = useI18n();
  const { user } = useAuth();
  const [mod, setMod] = useState(null); // { banned, suspended_until, moderation_note }
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user) {
      setMod(null);
      return;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('banned, suspended_until, moderation_note')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setMod(data ?? null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const suspendedUntil = mod?.suspended_until ? new Date(mod.suspended_until).getTime() : 0;
  const suspended = suspendedUntil > now;
  const banned = !!mod?.banned;
  const active = banned || suspended;

  // Tick every second only while a live suspension countdown is showing.
  useEffect(() => {
    if (!suspended) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [suspended]);

  if (!active || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[3000] border-b border-ember-danger/40 bg-ember-accent/95 text-black shadow-lg">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon name="bell" size={18} className="shrink-0" />
          <span className="min-w-0 flex-1 text-sm font-semibold">
            {banned ? t('ban.banned') : t('ban.suspended')}
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md bg-ember-line/20 px-2 py-1 text-xs font-semibold hover:bg-ember-line/30"
          >
            {open ? t('ban.hide') : t('ban.details')}
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label={t('common.close')}
            className="grid h-7 w-7 place-items-center rounded-md hover:bg-ember-line/20"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {open && (
          <div className="space-y-1 rounded-lg bg-black/15 p-2.5 text-sm">
            <div>
              <span className="opacity-70">{t('ban.reason')}</span>
              {mod?.moderation_note || t('ban.noReason')}
            </div>
            {banned ? (
              <div>
                <span className="opacity-70">{t('ban.duration')}</span>
                {t('ban.permanent')}
              </div>
            ) : (
              <>
                <div>
                  <span className="opacity-70">{t('ban.reactivation')}</span>
                  {new Date(suspendedUntil).toLocaleString(dateLocale)}
                </div>
                <div className="font-display font-bold tabular-nums">
                  {t('ban.in', { t: fmt(suspendedUntil - now) })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
