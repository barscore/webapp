import { LANGUAGES, useI18n } from '../i18n/index.js';

// Language switcher, two shapes for the two hosts:
//   <LanguageMenuRow />  — compact flag row inside the Home account menu.
//   <LanguageSection />  — card with flag + native name, in Impostazioni
//                          (same layout family as the theme picker).
// The choice persists in localStorage; with no choice the app defaults to the
// language of the user's country (see i18n/index.js), English elsewhere.

export function LanguageMenuRow() {
  const { lang, t, setLang } = useI18n();
  return (
    <div className="border-t border-ember-line/5 px-3 py-2.5">
      <div className="mb-1.5 text-xs text-ember-muted">{t('menu.language')}</div>
      <div className="flex items-center justify-between gap-1">
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={active}
              aria-label={l.label}
              title={l.label}
              className={`flex-1 rounded-lg border py-1.5 text-base leading-none transition ${
                active
                  ? 'border-ember-primary bg-ember-primary/10'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {l.flag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LanguageSection() {
  const { lang, t, setLang } = useI18n();
  return (
    <section className="rounded-card border border-ember-line/5 bg-ember-card p-4">
      <h2 className="mb-3 font-display font-bold text-ember-cream">{t('settings.language')}</h2>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                active
                  ? 'border-ember-primary bg-ember-primary/10'
                  : 'border-ember-line/10 hover:border-ember-line/25'
              }`}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <span
                className={`text-xs font-semibold ${active ? 'text-ember-primary' : 'text-ember-cream'}`}
              >
                {l.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
