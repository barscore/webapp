import Icon from './Icon.jsx';

// Three-tab switcher from the mockup: Vicino a me / Salvati / Cerca.
// The active tab is an amber pill; the rest are muted icon+label.
//   variant="bar"  → horizontal row, sits at the bottom of the mobile sheet.
//   variant="rail" → vertical floating menu, docked left on desktop.
const TABS = [
  { id: 'vicini', label: 'Vicino a me', icon: 'locate' },
  { id: 'salvati', label: 'Salvati', icon: 'bookmark' },
  { id: 'cerca', label: 'Cerca', icon: 'search' },
];

export default function NavTabs({ tab, onTab, savedCount = 0, variant = 'bar', className = '' }) {
  const rail = variant === 'rail';

  return (
    <nav
      className={`flex ${rail ? 'flex-col gap-2 rounded-3xl border border-white/10 bg-ember-bg/80 p-2 shadow-xl backdrop-blur' : 'items-center justify-between gap-1'} ${className}`}
    >
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-1.5 rounded-full text-sm font-semibold transition ${
              rail ? 'w-full px-4 py-2.5' : 'min-w-0 flex-1 justify-center px-2.5 py-2'
            } ${
              active
                ? 'bg-ember-primary text-ember-bg shadow-[0_4px_14px_rgba(224,123,26,0.4)]'
                : 'text-ember-muted hover:text-ember-cream'
            }`}
          >
            <span className="relative">
              <Icon name={t.icon} size={20} />
              {t.id === 'salvati' && savedCount > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[15px] rounded-full bg-ember-accent px-1 text-[10px] font-bold leading-[15px] text-white">
                  {savedCount}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
