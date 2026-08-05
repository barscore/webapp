import Icon from './Icon.jsx';
import Pin from './Pin.jsx';

// Brand empty state (kit §07): large pin, title, hint, optional CTA.
export default function EmptyState({
  title,
  hint,
  ctaLabel,
  ctaIcon = 'funnel',
  onCta,
  pin = 'grigio',
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {/* The pin sits in a soft halo so the empty state reads as a designed
          state, not as a missing one. */}
      <span className="mb-5 grid h-24 w-24 place-items-center rounded-full bg-ember-line/[0.04] ring-1 ring-ember-line/[0.06]">
        <Pin variant={pin} size={56} className="opacity-80" />
      </span>
      <h3 className="font-display text-xl font-bold tracking-tight text-ember-cream">{title}</h3>
      {hint && <p className="mt-2 max-w-xs text-sm leading-relaxed text-ember-muted">{hint}</p>}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="btn-primary mt-4 px-4 py-2.5"
        >
          <Icon name={ctaIcon} size={18} />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
