// Badge rabar+ — la scintilla a quattro punte che compare accanto al logo e a
// ogni nome utente abbonato. Unico posto in cui è disegnata: cambiare qui la
// cambia ovunque.
//
// Il glifo è SVG inline e non un'icona dello spritesheet: è l'unico disegno
// che deve stare dentro un cerchio pieno e tingersi del colore del tema, e un
// PNG mascherato a 16px si sgranerebbe.
//
// `plus` falso ⇒ non rende nulla, così i punti di chiamata restano una riga
// sola senza condizionali sparsi.
export default function PlusBadge({ plus, size = 'sm', className = '' }) {
  if (!plus) return null;
  const dims = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <span
      title="rabar+"
      aria-label="rabar+"
      role="img"
      className={`inline-grid shrink-0 place-items-center rounded-full bg-rating-fill ${dims} ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[62%] w-[62%] fill-ember-on-primary">
        <path d="M12 2.4c.55 4.9 4.7 9.05 9.6 9.6-4.9.55-9.05 4.7-9.6 9.6-.55-4.9-4.7-9.05-9.6-9.6 4.9-.55 9.05-4.7 9.6-9.6Z" />
      </svg>
    </span>
  );
}
