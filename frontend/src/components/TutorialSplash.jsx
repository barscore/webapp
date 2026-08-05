import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { useI18n } from '../i18n/index.js';

// One-time onboarding splash: shown the first time the app is opened on this
// device, signed in or not. Dismissal is remembered per device, so someone who
// already took the tour never sees it again — not after registering, not at
// first login, not from a second account on the same browser. Bump the version
// segment when the content changes enough to warrant showing it again.
// Exported so InstallHint can hold back while the tour is still pending.
const SEEN_KEY = 'rabar:tutorial-seen:v3';
const LEGACY_PREFIX = 'rabar:tutorial-seen:v2:'; // per-user keys from the old gate

export function tutorialSeen() {
  if (localStorage.getItem(SEEN_KEY)) return true;
  // Anyone who already dismissed the per-user v2 tour shouldn't get it again.
  return Object.keys(localStorage).some((k) => k.startsWith(LEGACY_PREFIX));
}

// Bold-aware copy: the dictionaries mark bold spans as **testo**.
function B({ k }) {
  const { t } = useI18n();
  return t(k)
    .split('**')
    .map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

const STEPS = [
  {
    icon: 'cocktail',
    title: 'tour.s1.title',
    body: (
      <>
        <p><B k="tour.s1.p1" /></p>
        <p><B k="tour.s1.p2" /></p>
      </>
    ),
  },
  {
    icon: 'edit',
    title: 'tour.s2.title',
    body: (
      <>
        <p><B k="tour.s2.p1" /></p>
        <p className="flex items-start gap-2">
          <Icon name="edit" size={16} className="mt-0.5 shrink-0 text-ember-ink" />
          <span><B k="tour.s2.p2" /></span>
        </p>
        <p className="flex items-start gap-2">
          <Icon name="trash" size={16} className="mt-0.5 shrink-0 text-ember-danger" />
          <span><B k="tour.s2.p3" /></span>
        </p>
      </>
    ),
  },
  {
    icon: 'cocktail',
    title: 'tour.s3.title',
    body: (
      <>
        <p><B k="tour.s3.p1" /></p>
        <p><B k="tour.s3.p2" /></p>
        <p><B k="tour.s3.p3" /></p>
      </>
    ),
  },
  {
    iceCube: true,
    title: 'tour.s4.title',
    body: (
      <>
        <p>
          <B k="tour.s4.p1" />{' '}
          <img src="/icons/ice.png" alt="" className="inline-block h-4 w-4 object-contain align-text-bottom" />
          <B k="tour.s4.p1b" />
        </p>
        <p><B k="tour.s4.p2" /></p>
      </>
    ),
  },
  {
    icon: 'search',
    title: 'tour.s5.title',
    body: (
      <>
        <p><B k="tour.s5.p1" /></p>
        <p><B k="tour.s5.p2" /></p>
      </>
    ),
  },
];

export default function TutorialSplash() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!tutorialSeen()) setOpen(true);
  }, []);

  if (!open) return null;

  function dismiss() {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
    // Wake up other one-time overlays (InstallHint) now that the tour is done.
    window.dispatchEvent(new Event('rabar:tutorial-dismissed'));
  }

  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('tour.aria')}
    >
      <div className="glass-flat fade-in w-full max-w-sm space-y-4 rounded-sheet p-5">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={dismiss}
            aria-label={t('tour.skipAria')}
            className="text-sm text-ember-muted hover:text-ember-cream"
          >
            {t('tour.skip')}
          </button>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-primary/15">
          {s.iceCube ? (
            <img src="/icons/ice.png" alt="" className="h-6 w-6 object-contain" />
          ) : (
            <Icon name={s.icon} size={24} className="text-ember-ink" />
          )}
        </div>

        <h2 className="font-display text-xl font-bold text-ember-cream">{t(s.title)}</h2>
        <div className="space-y-2 text-sm text-ember-muted">{s.body}</div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-ember-primary' : 'w-1.5 bg-ember-line/15'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                aria-label={t('tour.prevAria')}
                className="rounded-lg bg-ember-bg p-2.5 text-ember-cream"
              >
                <Icon name="arrow-left" size={16} />
              </button>
            )}
            <button
              onClick={() => (last ? dismiss() : setStep(step + 1))}
              className="btn-primary px-4 py-2.5 active:scale-[0.98]"
            >
              {last ? (
                <>
                  <Icon name="check" size={16} /> {t('tour.start')}
                </>
              ) : (
                <>
                  {t('tour.next')} <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
