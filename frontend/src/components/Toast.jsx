import { useEffect } from 'react';
import Icon from './Icon.jsx';

// Lightweight transient toast. Pass a message string; clears via onDone.
export default function Toast({ message, icon = 'info', onDone, duration = 2600 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDone]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[2000] flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ember-card/95 px-4 py-2 text-sm text-ember-cream shadow-lg backdrop-blur">
        <Icon name={icon} size={16} className="text-ember-primary" />
        {message}
      </div>
    </div>
  );
}
