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
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <Pin variant={pin} size={64} className="mb-4 opacity-70" />
      <h3 className="font-display text-lg font-bold text-ember-cream">{title}</h3>
      {hint && <p className="mt-1 max-w-xs text-sm text-ember-muted">{hint}</p>}
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
