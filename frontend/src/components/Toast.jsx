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
      <div className="glass fade-in flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ember-cream">
        <Icon name={icon} size={16} className="text-ember-ink" />
        {message}
      </div>
    </div>
  );
}
