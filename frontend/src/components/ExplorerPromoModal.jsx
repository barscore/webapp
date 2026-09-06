import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';

export default function ExplorerPromoModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('show_explorer_promo')) {
      setOpen(true);
      localStorage.removeItem('show_explorer_promo');
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-flat fade-in w-full max-w-sm space-y-4 rounded-sheet p-5 text-center">
        <div className="flex justify-center mb-2">
          <Logo size="sm" />
        </div>
        
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember-primary/15">
          <Icon name="star" size={28} className="text-ember-primary" />
        </div>

        <h2 className="font-display text-2xl font-bold text-ember-cream">Promo Explorer attivata!</h2>
        
        <div className="space-y-2 text-sm text-ember-muted">
          <p>Benvenuto! Hai appena sbloccato l'accesso alla Promo Explorer.</p>
          <p>
            Per ottenere il tuo <strong>Free Drink</strong> ti basterà recensire almeno <strong>5 locali</strong>.
          </p>
          <p>Potrai controllare i tuoi progressi in qualsiasi momento nel menu in alto a destra.</p>
        </div>

        <div className="pt-3">
          <button
            onClick={() => setOpen(false)}
            className="btn-primary w-full py-3 text-base font-bold"
          >
            Inizia l'esplorazione <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
