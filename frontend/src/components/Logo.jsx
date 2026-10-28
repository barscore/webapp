import { useAuth } from '../hooks/useAuth.js';
import PlusBadge from './PlusBadge.jsx';

// rabar wordmark: "RA"(cream) "BAR"(amber), no pin.
// Betatesters see a small "beta" tag to the right of the wordmark, everywhere
// the logo appears — a reminder they're on the private beta. rabar+ subscribers
// get the "+" in the same spot: the wordmark reads "RABAR+".
export default function Logo({ size = 'md' }) {
  const { role, isPlus } = useAuth();
  const text = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-5xl' }[size] || 'text-4xl';

  return (
    <div className="flex items-center gap-2.5">
      <span className={`font-display font-extrabold uppercase tracking-tight ${text} leading-none`}>
        <span className="text-ember-cream">RA</span>
        <span className="text-ember-primary">BAR</span>
      </span>
      <PlusBadge plus={isPlus} size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />
      {role === 'betatester' && (
        <span className="self-start rounded-full border border-ember-primary/50 bg-ember-primary/15 px-1.5 py-0.5 font-display text-[10px] font-bold lowercase leading-none text-ember-primary">
          beta
        </span>
      )}
    </div>
  );
}
