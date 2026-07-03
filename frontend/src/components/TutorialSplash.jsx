import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';

// One-time onboarding splash, shown the first time a user is signed in on this
// device. Dismissal is remembered per user id in localStorage, so a new account
// on the same browser still gets the tour.
const seenKey = (userId) => `rabar:tutorial-seen:${userId}`;

const STEPS = [
  {
    icon: 'cocktail',
    title: 'Benvenuto/a su rabar!',
    body: (
      <>
        <p>
          La mappa dei bar valutata dalla community su cinque assi: prezzo, qualità drinks,
          socialità, varietà e orari.
        </p>
        <p>Un tour veloce di 30 secondi per iniziare.</p>
      </>
    ),
  },
  {
    icon: 'edit',
    title: 'Le valutazioni',
    body: (
      <>
        <p>
          Apri un bar dalla mappa o dalla lista e tocca <strong>Valuta</strong>: cinque slider
          da 1 a 5 più un commento opzionale. Una sola valutazione per bar.
        </p>
        <p className="flex items-start gap-2">
          <Icon name="edit" size={16} className="mt-0.5 shrink-0 text-ember-primary" />
          <span>
            Per <strong>modificarla</strong>, riapri il bar già valutato e aggiorna gli slider.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Icon name="trash" size={16} className="mt-0.5 shrink-0 text-ember-accent" />
          <span>
            Per <strong>eliminarla</strong>, usa il cestino nel form o la pagina{' '}
            <strong>Le tue valutazioni</strong> dal menu.
          </span>
        </p>
      </>
    ),
  },
  {
    iceCube: true,
    title: 'Gli ice cubes',
    body: (
      <>
        <p>
          Ogni valutazione pubblicata ti fa guadagnare <strong>10 ice cubes</strong>{' '}
          <img src="/icons/ice.png" alt="" className="inline-block h-4 w-4 object-contain align-text-bottom" />
          . Più bar valuti, più ne accumuli.
        </p>
        <p>
          Il tuo totale è sempre visibile in alto nella mappa, e nella{' '}
          <strong>Classifica</strong> vedi il tuo rank rispetto agli altri utenti.
        </p>
      </>
    ),
  },
  {
    icon: 'search',
    title: 'La barra di ricerca',
    body: (
      <>
        <p>
          Cerca qualsiasi bar per nome, ovunque nel mondo: su mobile dal tab{' '}
          <strong>Cerca</strong> in basso, su desktop dalla barra sempre visibile.
        </p>
        <p>
          Bastano 2 lettere per avviare la ricerca; tocca un risultato per aprire la scheda del
          bar.
        </p>
      </>
    ),
  },
];

export default function TutorialSplash() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    if (!localStorage.getItem(seenKey(user.id))) {
      setStep(0);
      setOpen(true);
    }
  }, [loading, user?.id]);

  if (!open || !user) return null;

  function dismiss() {
    localStorage.setItem(seenKey(user.id), '1');
    setOpen(false);
  }

  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial di benvenuto"
    >
      <div className="w-full max-w-sm space-y-4 rounded-card border border-white/10 bg-ember-card p-5">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={dismiss}
            aria-label="Salta il tutorial"
            className="text-sm text-ember-muted hover:text-ember-cream"
          >
            Salta
          </button>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-primary/15">
          {s.iceCube ? (
            <img src="/icons/ice.png" alt="" className="h-6 w-6 object-contain" />
          ) : (
            <Icon name={s.icon} size={24} className="text-ember-primary" />
          )}
        </div>

        <h2 className="font-display text-xl font-bold text-ember-cream">{s.title}</h2>
        <div className="space-y-2 text-sm text-ember-muted">{s.body}</div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-ember-primary' : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                aria-label="Passo precedente"
                className="rounded-lg bg-ember-bg p-2.5 text-ember-cream"
              >
                <Icon name="arrow-left" size={16} />
              </button>
            )}
            <button
              onClick={() => (last ? dismiss() : setStep(step + 1))}
              className="flex items-center gap-2 rounded-lg bg-ember-primary px-4 py-2.5 font-semibold text-ember-bg active:scale-[0.98]"
            >
              {last ? (
                <>
                  <Icon name="check" size={16} /> Inizia
                </>
              ) : (
                <>
                  Avanti <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
