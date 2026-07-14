import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.js';

// Tab switcher: Vicino a me / Salvati / Eventi / Drinks / Cerca.
// The active tab is an amber pill; the rest are muted.
//   variant="bar"  → horizontal row at the bottom of the mobile sheet; icon-only.
//   variant="rail" → horizontal floating menu on desktop; icon + label.
const TABS = [
  { id: 'vicini', icon: 'locate' },
  { id: 'salvati', icon: 'bookmark' },
  { id: 'eventi', icon: 'bell' },
  { id: 'drinks', icon: 'cocktail' },
  { id: 'cerca', icon: 'search' },
];

export default function NavTabs({ tab, onTab, savedCount = 0, variant = 'bar', exclude = [], className = '' }) {
  const { t: tr } = useI18n();
  const rail = variant === 'rail';
  const tabs = TABS.filter((t) => !exclude.includes(t.id));

  return (
    <nav
      className={`flex items-center gap-1 justify-between ${rail ? 'glass rounded-lg2 p-2' : ''} ${className}`}
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        const label = tr(`tabs.${t.id}`);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            title={label}
            className={`press relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold ${
              rail ? 'px-3 py-2.5' : 'px-2.5 py-2.5'
            } ${
              active
                ? 'bg-ember-primary text-ember-on-primary shadow-glow'
                : 'text-ember-muted hover:text-ember-cream'
            }`}
          >
            <span className="relative">
              <Icon name={t.icon} size={20} />
              {/* Badge label is black: every theme's accent is a bright warm
                  hue, where white text lands at 2–3:1 and black at 7:1+. */}
              {t.id === 'salvati' && savedCount > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[15px] rounded-full bg-ember-accent px-1 text-[10px] font-bold leading-[15px] text-black">
                  {savedCount}
                </span>
              )}
            </span>
            {/* Bottom bar is icon-only; the rail keeps text labels. */}
            {rail && <span className="truncate">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
