import { useAuth } from '../hooks/useAuth.js';

// rabar wordmark: amber brand pin (from spritesheet) + "RA"(cream) "BAR"(amber).
// Betatesters see a small "beta" tag to the right of the wordmark, everywhere
// the logo appears — a reminder they're on the private beta.
export default function Logo({ size = 'md', icon = true }) {
  const { role } = useAuth();
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
          className="shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(var(--ember-primary)/0.35)]"
          style={{ height: dims, width: 'auto' }}
        />
      )}
      <span className={`font-display font-extrabold uppercase tracking-tight ${text} leading-none`}>
        <span className="text-ember-cream">RA</span>
        <span className="text-ember-primary">BAR</span>
      </span>
      {role === 'betatester' && (
        <span className="self-start rounded-full border border-ember-primary/50 bg-ember-primary/15 px-1.5 py-0.5 font-display text-[10px] font-bold lowercase leading-none text-ember-primary">
          beta
        </span>
      )}
    </div>
  );
}
