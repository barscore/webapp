// rabar wordmark: amber brand pin (from spritesheet) + "RA"(cream) "BAR"(amber).
export default function Logo({ size = 'md', icon = true }) {
  const dims = { sm: 26, md: 38, lg: 54 }[size] || 38;
  const text = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-5xl' }[size] || 'text-4xl';

  return (
    <div className="flex items-center gap-2.5">
      {icon && (
        <img
          src="/icons/logo-pin.png"
          alt=""
          aria-hidden="true"
          width={dims}
          height={dims}
          className="shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(224,123,26,0.35)]"
          style={{ height: dims, width: 'auto' }}
        />
      )}
      <span className={`font-display font-extrabold uppercase tracking-tight ${text} leading-none`}>
        <span className="text-ember-cream">RA</span>
        <span className="text-ember-primary">BAR</span>
      </span>
    </div>
  );
}
