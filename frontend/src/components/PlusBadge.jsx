// Badge rabar+ — il "+" che compare accanto al logo e a ogni nome utente
// abbonato. Unico posto in cui è disegnato: cambiare qui lo cambia ovunque.
//
// `plus` falso ⇒ non rende nulla, così i punti di chiamata restano una riga
// sola senza condizionali sparsi.
export default function PlusBadge({ plus, size = 'sm', className = '' }) {
  if (!plus) return null;
  const dims =
    size === 'lg'
      ? 'h-6 w-6 text-[15px]'
      : size === 'md'
        ? 'h-5 w-5 text-[13px]'
        : 'h-4 w-4 text-[11px]';

  return (
    <span
      title="rabar+"
      aria-label="rabar+"
      className={`inline-grid shrink-0 place-items-center rounded-full bg-rating-fill font-display font-extrabold leading-none text-ember-on-primary ${dims} ${className}`}
    >
      +
    </span>
  );
}
