// Sprite icon set sliced from public/spritesheet.png (EMBER NIGHT brand kit).
// Monochrome icons render as a CSS mask tinted with `currentColor`, so any icon
// recolors via Tailwind text-* classes (text-ember-primary, text-ember-accent…).
// `colored` icons keep their own pixels and render as <img>.
const COLORED = new Set(['image']);

export default function Icon({ name, size = 20, className = '', label, style, ...rest }) {
  const src = `/icons/sprite/${name}.png`;
  const dims = { width: size, height: size };

  if (COLORED.has(name)) {
    return (
      <img
        src={src}
        alt={label || ''}
        aria-hidden={label ? undefined : true}
        className={`inline-block shrink-0 object-contain ${className}`}
        style={{ ...dims, ...style }}
        {...rest}
      />
    );
  }

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 bg-current align-middle ${className}`}
      style={{
        ...dims,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
      {...rest}
    />
  );
}
