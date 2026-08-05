import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';

// Shared shell for the /privacy and /tos static pages: back link, logo, title,
// prose column. Content is passed as children.
export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-2xl space-y-5 pb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-ember-muted hover:text-ember-cream">
          <Icon name="arrow-left" size={15} /> Mappa
        </Link>
        <Logo size="sm" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ember-cream">{title}</h1>
          {updated && <p className="mt-1 text-xs text-ember-muted">Ultimo aggiornamento: {updated}</p>}
        </div>
        <div className="prose-legal space-y-4 text-sm leading-relaxed text-ember-muted">
          {children}
        </div>
      </div>
    </div>
  );
}

// Small helpers so the two legal pages stay tidy.
export function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base font-bold text-ember-cream">{title}</h2>
      {children}
    </section>
  );
}
