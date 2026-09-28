import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';

// The site's public pages as plain links. Shown under the bar list, the bar
// page, the leaderboard and every text page: without it the only way to
// reach them was the account menu, i.e. never for a visitor or a crawler.
const LINKS = [
  ['/come-funziona', 'nav.howItWorks'],
  ['/citta', 'nav.cities'],
  ['/classifica', 'board.title'],
  ['/faq', 'nav.faq'],
  ['/chi-siamo', 'nav.about'],
  ['/contatti', 'nav.contact'],
  ['/privacy', 'common.privacy'],
  ['/tos', 'common.terms'],
];

export default function SiteLinks({ className = '' }) {
  const { t } = useI18n();
  return (
    <nav className={`flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-ember-muted ${className}`}>
      {LINKS.map(([to, key]) => (
        <Link key={to} to={to} className="hover:text-ember-ink">
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
