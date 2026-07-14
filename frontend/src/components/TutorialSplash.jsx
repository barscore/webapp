import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';

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
          <Icon name="edit" size={16} className="mt-0.5 shrink-0 text-ember-ink" />
          <span>
            Per <strong>modificarla</strong>, riapri il bar già valutato e aggiorna gli slider.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Icon name="trash" size={16} className="mt-0.5 shrink-0 text-ember-danger" />
          <span>
            Per <strong>eliminarla</strong>, usa il cestino nel form o la pagina{' '}
            <strong>Le tue valutazioni</strong> dal menu.
          </span>
        </p>
      </>
    ),
  },
  {
    icon: 'cocktail',
    title: 'I drink',
    body: (
      <>
        <p>
          In ogni scheda bar trovi <strong>I migliori drink qui</strong>: la classifica dei drink
          votati dalla community in quel locale.
        </p>
        <p>
          Tocca <strong>Valuta un drink</strong> e dai un voto da 1 a 5 stelle — un voto per drink
          per bar, modificabile quando vuoi. Da una pagina drink puoi anche votarlo in un altro
          bar.
        </p>
        <p>
          Non trovi il tuo drink preferito? <strong>Proponilo</strong>: entra nel catalogo dopo
          l’approvazione.
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
      aria-label="Tutorial di benvenuto"
    >
      <div className="glass-flat fade-in w-full max-w-sm space-y-4 rounded-sheet p-5">
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
            <Icon name={s.icon} size={24} className="text-ember-ink" />
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
                  i === step ? 'w-5 bg-ember-primary' : 'w-1.5 bg-ember-line/15'
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
              className="btn-primary px-4 py-2.5 active:scale-[0.98]"
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
