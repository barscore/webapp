import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import ScoreBadge from '../components/ScoreBadge.jsx';
import Icon from '../components/Icon.jsx';
import { SkeletonRows } from '../components/Skeleton.jsx';
import { barsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';
import { byScore, cityIndexable, groupByCity } from '../utils/seo.js';

function BarLink({ bar }) {
  const { t } = useI18n();
  const n = Number(bar.total_ratings) || 0;
  return (
    <Link
      to={`/bar/${bar.id}`}
      className="press flex items-center gap-3 rounded-card border border-ember-line/5 bg-ember-card p-3 transition-colors hover:border-ember-primary/40"
    >
      <ScoreBadge bar={bar} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ember-cream">{bar.name}</span>
        <span className="block truncate text-xs text-ember-muted">
          {bar.address && bar.address !== 'Indirizzo non disponibile' ? `${bar.address} · ` : ''}
          {n === 1 ? t('city.oneReview') : n > 1 ? t('city.reviews', { n }) : t('city.unrated')}
        </span>
      </span>
      <Icon name="arrow-right" size={14} className="shrink-0 text-ember-muted" />
    </Link>
  );
}

// /citta — cities with enough bars; /citta/:slug — one city's bars by score.
// Same grouping and indexing rules as the prerender (utils/seo.js), so the
// page a crawler gets as static HTML and the one the app renders match.
// ponytail: reads the plain GET /bars list (capped at 500 bars server-side);
// a per-city backend filter when the catalogue outgrows it.
export default function Cities() {
  const { slug } = useParams();
  const { t } = useI18n();
  const [bars, setBars] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    barsApi
      .list()
      .then((b) => !cancelled && setBars(b))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => (bars ? groupByCity(bars) : []), [bars]);
  const status = error ? <p className="text-ember-danger">{t('city.error')}</p> : !bars && <SkeletonRows n={5} />;

  if (!slug) {
    return (
      <LegalLayout title={t('city.indexTitle')} description={t('city.indexIntro')}>
        <p>{t('city.indexIntro')}</p>
        {status}
        <div className="space-y-2">
          {cities.map((c) => (
            <Link
              key={c.slug}
              to={`/citta/${c.slug}`}
              className="press flex items-center justify-between rounded-card border border-ember-line/5 bg-ember-card p-3 transition-colors hover:border-ember-primary/40"
            >
              <span className="font-semibold text-ember-cream">{c.name}</span>
              <span className="text-xs text-ember-muted">
                {t('city.bars', { n: c.bars.length })} · {c.rated} {t('city.rated').toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      </LegalLayout>
    );
  }

  const city = cities.find((c) => c.slug === slug);
  if (bars && !city) {
    return (
      <LegalLayout title={t('city.indexTitle')} noindex>
        <p>{t('city.notFound')}</p>
        <Link to="/citta" className="text-ember-ink hover:underline">
          {t('nav.cities')}
        </Link>
      </LegalLayout>
    );
  }

  const name = city?.name ?? '';
  const sorted = city ? [...city.bars].sort(byScore) : [];
  const rated = sorted.filter((b) => Number(b.total_ratings) > 0);
  const unrated = sorted.filter((b) => !(Number(b.total_ratings) > 0));
  const vars = { city: name, n: city?.bars.length ?? 0, rated: rated.length };

  return (
    <LegalLayout
      title={city ? t('city.title', { city: name }) : t('nav.cities')}
      description={city ? t('city.description', vars) : undefined}
      noindex={city ? !cityIndexable(city) : false}
    >
      {status}
      {city && (
        <>
          <p>
            {t('city.intro', vars)}{' '}
            {rated[0] && t('city.best', { bar: rated[0].name, score: (rated[0].avg_overall * 2).toFixed(1) })}
          </p>
          {rated.length > 0 && (
            <Section title={t('city.rated')}>
              <div className="space-y-2">
                {rated.map((b) => (
                  <BarLink key={b.id} bar={b} />
                ))}
              </div>
            </Section>
          )}
          {unrated.length > 0 && (
            <Section title={t('city.unrated')}>
              <div className="space-y-2">
                {unrated.map((b) => (
                  <BarLink key={b.id} bar={b} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </LegalLayout>
  );
}
