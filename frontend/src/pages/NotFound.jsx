import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import SiteLinks from '../components/SiteLinks.jsx';
import { useI18n } from '../i18n/index.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

// Unknown paths. On Vercel they already come back as HTTP 404 (dist/404.html,
// see vercel.json); the noindex covers paths that do reach the SPA shell.
export default function NotFound() {
  const { t } = useI18n();
  usePageMeta({ title: t('notFound.title'), noindex: true });
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ember-bg p-6 text-center">
      <Logo size="sm" />
      <h1 className="font-display text-2xl font-bold text-ember-cream">{t('notFound.title')}</h1>
      <p className="max-w-sm text-sm text-ember-muted">{t('notFound.hint')}</p>
      <Link to="/" className="btn-primary px-5 py-2.5 text-sm">
        {t('notFound.back')}
      </Link>
      <SiteLinks className="mt-4" />
    </div>
  );
}
