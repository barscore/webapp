import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { gpcOptOut, openConsentMessage } from '../services/consent.js';
import { useI18n } from '../i18n/index.js';
import { useMonetization } from '../services/monetization.js';

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
  const { isPlus } = useAuth();
  const navigate = useNavigate();
  const monetization = useMonetization();
  // Where no ad script runs there is no consent to manage.
  const ads = !isPlus && monetization && !gpcOptOut();
  return (
    <nav className={`flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-ember-muted ${className}`}>
      {LINKS.map(([to, key]) => (
        <Link key={to} to={to} className="hover:text-ember-ink">
          {t(key)}
        </Link>
      ))}
      {/* Reopens Google's consent message. It lives here because Impostazioni
          needs an account, and a visitor must be able to withdraw consent too.
          No message to reopen (ad blocker, country without one): the privacy
          page explains the other ways. */}
      {ads && (
        <button
          type="button"
          onClick={() => {
            if (!openConsentMessage()) navigate('/privacy');
          }}
          className="hover:text-ember-ink"
        >
          {t('settings.cookie')}
        </button>
      )}
    </nav>
  );
}
