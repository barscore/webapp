// Badge esploratore — il cuore che compare accanto ai nomi utente.
export default function ExplorerBadge({ explorer, size = 'sm', className = '' }) {
  if (!explorer) return null;
  const dims = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <span
      title="Esploratore"
      aria-label="Esploratore"
      role="img"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ember-primary ${dims} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%] fill-ember-on-primary">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </span>
  );
}
