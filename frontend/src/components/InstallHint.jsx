import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { tutorialSeenKey } from './TutorialSplash.jsx';

// One-time "installa l'app" hint for mobile browsers. Three variants:
//   iOS               — no install API: Safari Condividi → "Aggiungi alla
//                       schermata Home" steps.
//   Android, Chromium — `beforeinstallprompt` captured: real install button.
//   Android, others   — generic browser-menu steps.
// Never shown on desktop or when already running standalone (installed);
// dismissal is remembered per device. Waits for the welcome tutorial to be
// dismissed so the two overlays don't stack.
const DISMISS_KEY = 'rabar:install-hint-dismissed';

// iPadOS ≥13 reports a Mac user agent, hence the maxTouchPoints check.
const ua = navigator.userAgent;
const isIos =
  /iphone|ipad|ipod/i.test(ua) || (/mac/i.test(ua) && navigator.maxTouchPoints > 1);
const isMobile = isIos || /android/i.test(ua);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function Step({ n, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ember-primary/15 font-display text-xs font-bold text-ember-primary">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export default function InstallHint() {
  const { user, loading } = useAuth();
  const [deferred, setDeferred] = useState(null); // saved beforeinstallprompt event
  const [open, setOpen] = useState(false);
  const [tutorialTick, setTutorialTick] = useState(0); // bumped when the tutorial closes

  useEffect(() => {
    // Chromium fires this once the PWA criteria are met; stash it so the
    // "Installa" button can trigger the native prompt on demand.
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, '1');
      setOpen(false);
    };
    const onTutorialDone = () => setTutorialTick((n) => n + 1);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('rabar:tutorial-dismissed', onTutorialDone);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('rabar:tutorial-dismissed', onTutorialDone);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isMobile || isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    // A signed-in user who hasn't finished the welcome tour yet sees that
    // first; the rabar:tutorial-dismissed event re-runs this effect after.
    if (user && !localStorage.getItem(tutorialSeenKey(user.id))) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [loading, user?.id, tutorialTick]);

  if (!open) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    // Accepted or not, don't nag again — appinstalled covers the accept case.
    await deferred.userChoice.catch(() => {});
    dismiss();
  }

  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Installa l'app"
        className="w-full max-w-sm space-y-4 rounded-card border border-ember-line/10 bg-ember-card p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-primary/15">
            <Icon name="home" size={24} className="text-ember-primary" />
          </div>
          <button
            onClick={dismiss}
            aria-label="Chiudi"
            className="text-ember-muted hover:text-ember-cream"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <h2 className="font-display text-xl font-bold text-ember-cream">
          Installa rabar sul telefono
        </h2>
        <p className="text-sm text-ember-muted">
          Gratis e senza store: la avvii dalla schermata Home, a schermo intero, come una vera
          app.
        </p>

        {deferred ? null : isIos ? (
          <ol className="space-y-2 text-sm text-ember-muted">
            <Step n={1}>
              Apri rabar in <strong className="text-ember-cream">Safari</strong>
            </Step>
            <Step n={2}>
              Tocca <strong className="text-ember-cream">Condividi</strong>{' '}
              <Icon name="share" size={14} className="text-ember-primary" />
            </Step>
            <Step n={3}>
              Scegli{' '}
              <strong className="text-ember-cream">Aggiungi alla schermata Home</strong>
            </Step>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-ember-muted">
            <Step n={1}>
              Apri il <strong className="text-ember-cream">menu del browser</strong> (⋮)
            </Step>
            <Step n={2}>
              Tocca <strong className="text-ember-cream">Installa app</strong> oppure{' '}
              <strong className="text-ember-cream">Aggiungi a schermata Home</strong>
            </Step>
          </ol>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-lg border border-ember-line/10 py-2.5 text-sm font-semibold text-ember-muted hover:text-ember-cream"
          >
            Non ora
          </button>
          {deferred ? (
            <button
              type="button"
              onClick={install}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ember-primary py-2.5 text-sm font-semibold text-ember-bg active:scale-[0.98]"
            >
              <Icon name="plus" size={16} /> Installa
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-lg bg-ember-primary py-2.5 text-sm font-semibold text-ember-bg active:scale-[0.98]"
            >
              Ho capito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
