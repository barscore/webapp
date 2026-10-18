import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import SiteLinks from './SiteLinks.jsx';
import { useI18n } from '../i18n/index.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

// Shared shell for the static text pages (privacy, terms, how it works, FAQ,
// about, contact, cities): back link, logo, title, prose column, site links.
// Content is passed as children.
export default function LegalLayout({ title, description, noindex, updated, intro, children }) {
  const { t, lang } = useI18n();
  usePageMeta({ title, description, noindex });
  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-2xl space-y-5 pb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-ember-muted hover:text-ember-cream">
          <Icon name="arrow-left" size={15} /> {t('common.map')}
        </Link>
        <Logo size="sm" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ember-cream">{title}</h1>
          {updated && <p className="mt-1 text-xs text-ember-muted">{lang === 'it' ? 'Ultimo aggiornamento' : 'Last updated'}: {updated}</p>}
          {intro}
        </div>
        <div className="prose-legal space-y-4 text-sm leading-relaxed text-ember-muted">
          {children}
        </div>
        <SiteLinks className="border-t border-ember-line/5 pt-5" />
      </div>
    </div>
  );
}

// Small helpers so the text pages stay tidy.
export function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-2">
      <h2 className="font-display text-base font-bold text-ember-cream">{title}</h2>
      {children}
    </section>
  );
}
