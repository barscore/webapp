// Build-time prerender: runs after `vite build` (see package.json).
//
// rabar is a client-side SPA, so every URL used to come back as the same empty
// <div id="root"></div> with the same <title> — to a crawler, and to AdSense's
// review, one thin page repeated. This writes a real HTML file per public page:
// its own title/description/canonical/robots, structured data, and the page's
// text inside #root. React's createRoot replaces that markup on load, so users
// get the app exactly as before.
//
//   dist/index.html             home, with cities and top-rated bars
//   dist/<slug>.html            come-funziona, faq, chi-siamo, contatti, …
//   dist/citta.html, dist/citta/<slug>.html
//   dist/bar/<id>.html          only bars with reviews (barIndexable)
//   dist/app.html               untouched shell: vercel.json rewrites every
//                               other app route here
//   dist/404.html               served by Vercel with HTTP 404
//   dist/sitemap.xml
//
// Bar data comes from the live API. If it can't be reached the build still
// succeeds with the static pages only — a flaky backend must not block a
// frontend deploy.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import it from '../src/i18n/locales/it.js';
import { CONTENT_SLUGS, PAGES, splitEmails } from '../src/content/pages.js';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_URL,
  barIndexable,
  barPlace,
  cityName,
  byScore,
  cityIndexable,
  groupByCity,
  slugify,
} from '../src/utils/seo.js';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const API = (process.env.VITE_API_BASE_URL || 'https://rabarbackend.vercel.app').replace(/\/$/, '');
const AXES = ['prezzo', 'qualita_drinks', 'socialita', 'varieta', 'orari'];

const tr = (key, params = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), it[key] ?? key);

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const score10 = (v) => (Number(v) * 2).toFixed(1);
const hasAddress = (b) => b.address && b.address !== 'Indirizzo non disponibile';
const reviewsLabel = (n) => (n === 1 ? tr('city.oneReview') : tr('city.reviews', { n }));

// --- HTML ------------------------------------------------------------------

const template = await readFile(path.join(DIST, 'index.html'), 'utf8');

function render({ urlPath, title, description, noindex = false, body = '', jsonld }) {
  let html = template;
  const set = (re, value) => {
    if (!re.test(html)) throw new Error(`prerender: ${re} not found in index.html`);
    html = html.replace(re, (_, a, b) => a + value + b);
  };
  const t = esc(title);
  const d = esc(description);
  const url = SITE_URL + urlPath;
  set(/(<title>)[^<]*(<\/title>)/, t);
  set(/(<meta name="description" content=")[^"]*(")/, d);
  set(/(<meta name="robots" content=")[^"]*(")/, noindex ? 'noindex, follow' : 'index, follow');
  set(/(<link rel="canonical" href=")[^"]*(")/, url);
  set(/(<meta property="og:title" content=")[^"]*(")/, t);
  set(/(<meta property="og:description" content=")[^"]*(")/, d);
  set(/(<meta property="og:url" content=")[^"]*(")/, url);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, t);
  set(/(<meta name="twitter:description" content=")[^"]*(")/, d);
  if (jsonld) {
    const json = JSON.stringify(jsonld).replace(/</g, '\\u003c');
    html = html.replace('</head>', () => `<script type="application/ld+json">${json}</script>\n</head>`);
  }
  if (body) html = html.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
  return html;
}

async function write(file, content) {
  const out = path.join(DIST, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
}

const page = (urlPath, opts) =>
  write(urlPath === '/' ? 'index.html' : `${urlPath.slice(1)}.html`, render({ urlPath, ...opts }));

// Same classes as components/LegalLayout.jsx, so they are in the built CSS.
const NAV = [
  ['/', 'Mappa'],
  ['/come-funziona', tr('nav.howItWorks')],
  ['/citta', tr('nav.cities')],
  ['/classifica', tr('board.title')],
  ['/faq', tr('nav.faq')],
  ['/chi-siamo', tr('nav.about')],
  ['/contatti', tr('nav.contact')],
  ['/privacy', tr('common.privacy')],
  ['/tos', tr('common.terms')],
];
const nav = `<nav class="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-ember-muted border-t border-ember-line/5 pt-5">${NAV.map(
  ([href, label]) => `<a href="${href}" class="hover:text-ember-ink">${esc(label)}</a>`,
).join('')}</nav>`;

const h2 = (s) => `<h2 class="font-display text-base font-bold text-ember-cream">${esc(s)}</h2>`;
const link = (href, label) => `<a href="${esc(href)}" class="text-ember-ink hover:underline">${esc(label)}</a>`;
const para = (text) =>
  `<p>${splitEmails(text)
    .map((p) => (p.email ? link(`mailto:${p.email}`, p.email) : esc(p.text)))
    .join('')}</p>`;

const layout = (title, inner) =>
  `<div class="min-h-full bg-ember-bg p-4"><div class="mx-auto w-full max-w-2xl space-y-5 pb-10">` +
  `<h1 class="font-display text-2xl font-bold text-ember-cream">${esc(title)}</h1>` +
  `<div class="space-y-4 text-sm leading-relaxed text-ember-muted">${inner}</div>${nav}</div></div>`;

const barLine = (b) =>
  `<li>${link(`/bar/${b.id}`, b.name)} — ${score10(b.avg_overall)}/10, ${esc(reviewsLabel(b.total_ratings))}` +
  `${hasAddress(b) ? ` · ${esc(b.address)}` : ''}</li>`;
const list = (items) => `<ul class="space-y-2">${items.join('')}</ul>`;

// --- Data ------------------------------------------------------------------

async function api(p) {
  const res = await fetch(API + p, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${p} → HTTP ${res.status}`);
  return res.json();
}

async function mapLimit(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

let bars = [];
try {
  bars = (await api('/bars')).bars ?? [];
} catch (e) {
  console.warn(`[prerender] API unreachable (${e.message}): static pages only`);
}
const cities = groupByCity(bars);
const indexableBars = bars.filter(barIndexable).sort(byScore);

// --- Pages -----------------------------------------------------------------

const sitemap = []; // [urlPath, lastmod?]
await write('app.html', template);

// Home
{
  const how = PAGES['come-funziona'].it;
  const inner = [
    ...how.intro.map(para),
    para(how.sections[0].p.join(' ')),
    cities.some(cityIndexable) &&
      h2(tr('nav.cities')) +
        list(cities.filter(cityIndexable).map((c) => `<li>${link(`/citta/${c.slug}`, tr('city.title', { city: c.name }))} — ${esc(tr('city.bars', { n: c.bars.length }))}</li>`)),
    indexableBars.length > 0 && h2('I bar più votati') + list(indexableBars.slice(0, 10).map(barLine)),
  ].filter(Boolean);
  await page('/', { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, body: layout('rabar — la mappa dei bar valutati dalla community', inner.join('')) });
  sitemap.push(['/']);
}

// Editorial pages
for (const slug of CONTENT_SLUGS) {
  const c = PAGES[slug].it;
  const inner =
    c.intro.map(para).join('') +
    c.sections.map((s) => `<section class="space-y-2">${h2(s.h)}${s.p.map(para).join('')}</section>`).join('');
  const jsonld =
    slug === 'faq'
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: c.sections.map((s) => ({
            '@type': 'Question',
            name: s.h,
            acceptedAnswer: { '@type': 'Answer', text: s.p.join(' ') },
          })),
        }
      : undefined;
  await page(`/${slug}`, { title: `${c.title} — rabar`, description: c.description, body: layout(c.title, inner), jsonld });
  sitemap.push([`/${slug}`]);
}

// Pages rendered by React only: right title and robots, no body.
for (const [urlPath, title, noindex] of [
  ['/classifica', tr('board.title'), false],
  ['/privacy', 'Informativa sul trattamento dei dati personali', false],
  ['/tos', 'Termini e condizioni di servizio', false],
  ['/riconoscimenti', tr('common.credits'), true],
  ['/login', tr('common.login'), true],
  ['/register', 'Registrati', true],
]) {
  await page(urlPath, { title: `${title} — rabar`, description: DEFAULT_DESCRIPTION, noindex });
  if (!noindex) sitemap.push([urlPath]);
}

// Cities
{
  const inner =
    para(tr('city.indexIntro')) +
    list(cities.map((c) => `<li>${link(`/citta/${c.slug}`, c.name)} — ${esc(tr('city.bars', { n: c.bars.length }))}, ${c.rated} ${esc(tr('city.rated').toLowerCase())}</li>`));
  await page('/citta', { title: `${tr('city.indexTitle')} — rabar`, description: tr('city.indexIntro'), body: layout(tr('city.indexTitle'), inner) });
  sitemap.push(['/citta']);
}
for (const c of cities) {
  const sorted = [...c.bars].sort(byScore);
  const rated = sorted.filter((b) => b.total_ratings > 0);
  const unrated = sorted.filter((b) => !(b.total_ratings > 0));
  const vars = { city: c.name, n: c.bars.length, rated: rated.length };
  const inner = [
    para(`${tr('city.intro', vars)} ${rated[0] ? tr('city.best', { bar: rated[0].name, score: score10(rated[0].avg_overall) }) : ''}`),
    rated.length > 0 && h2(tr('city.rated')) + list(rated.map(barLine)),
    unrated.length > 0 &&
      h2(tr('city.unrated')) +
        list(unrated.map((b) => `<li>${link(`/bar/${b.id}`, b.name)}${hasAddress(b) ? ` · ${esc(b.address)}` : ''}</li>`)),
  ].filter(Boolean);
  const indexable = cityIndexable(c);
  await page(`/citta/${c.slug}`, {
    title: `${tr('city.title', { city: c.name })} — rabar`,
    description: tr('city.description', vars),
    noindex: !indexable,
    body: layout(tr('city.title', { city: c.name }), inner.join('')),
  });
  if (indexable) sitemap.push([`/citta/${c.slug}`]);
}

// Bars
const barPages = await mapLimit(indexableBars, 6, async (b) => {
  try {
    const [{ bar }, { ratings }] = await Promise.all([api(`/bars/${b.id}`), api(`/bars/${b.id}/ratings?limit=100`)]);
    const s = bar.bar_ratings_summary ?? {};
    const n = Number(s.total_ratings) || 0;
    const place = barPlace(bar);
    const city = cityName(bar.city);
    const axes = AXES.filter((a) => Number(s[`avg_${a}`]) > 0);
    const reviews = ratings.map((r) => {
      const votes = AXES.filter((a) => r[a] != null).map((a) => `${tr(`axis.${a}`)} ${r[a]}/5`);
      return (
        `<article class="space-y-1 rounded-card border border-ember-line/5 bg-ember-card p-3">` +
        `<p class="text-xs">@${esc(r.profiles?.username ?? 'utente')} · ${esc(r.created_at.slice(0, 10))}</p>` +
        (r.commento?.trim() ? `<p class="text-ember-cream">${esc(r.commento)}</p>` : '') +
        `<p class="text-xs">${esc(votes.join(' · '))}</p>` +
        (r.risposta?.trim() ? `<p class="text-xs">Risposta del proprietario: ${esc(r.risposta)}</p>` : '') +
        `</article>`
      );
    });
    const citySlug = slugify(bar.city);
    const inner = [
      hasAddress(bar) &&
        `<p>${esc(bar.address)}${bar.address.toLowerCase().includes(city.toLowerCase()) ? '' : `, ${esc(city)}`}</p>`,
      `<p>Punteggio della community: <strong>${score10(s.avg_overall)}/10</strong> da ${esc(reviewsLabel(n))}.</p>`,
      axes.length > 0 && h2('Voti per asse') + list(axes.map((a) => `<li>${esc(tr(`axis.${a}`))}: ${score10(s[`avg_${a}`])}/10</li>`)),
      reviews.length > 0 && h2('Recensioni') + reviews.join(''),
      cities.some((c) => c.slug === citySlug) && `<p>${link(`/citta/${citySlug}`, tr('city.title', { city }))}</p>`,
    ].filter(Boolean);

    const withText = ratings.filter((r) => r.commento?.trim()).slice(0, 20);
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'BarOrPub',
      name: bar.name,
      url: `${SITE_URL}/bar/${bar.id}`,
      ...(hasAddress(bar) && {
        address: { '@type': 'PostalAddress', streetAddress: bar.address, addressLocality: city, addressCountry: bar.country || 'IT' },
      }),
      geo: { '@type': 'GeoCoordinates', latitude: bar.lat, longitude: bar.lng },
      ...(bar.website && { sameAs: bar.website }),
      ...(bar.phone && { telephone: bar.phone }),
      aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(s.avg_overall), bestRating: 5, worstRating: 1, ratingCount: n },
      ...(withText.length > 0 && {
        review: withText.map((r) => {
          const v = AXES.map((a) => r[a]).filter((x) => x != null);
          return {
            '@type': 'Review',
            author: { '@type': 'Person', name: r.profiles?.username ?? 'utente' },
            datePublished: r.created_at.slice(0, 10),
            reviewBody: r.commento,
            reviewRating: { '@type': 'Rating', ratingValue: +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1), bestRating: 5, worstRating: 1 },
          };
        }),
      }),
    };

    await page(`/bar/${bar.id}`, {
      title: `${place} — rabar`,
      description: tr('bar.metaDesc', { place, n, score: score10(s.avg_overall) }),
      body: layout(bar.name, inner.join('')),
      jsonld,
    });
    return [`/bar/${bar.id}`, s.last_updated?.slice(0, 10)];
  } catch (e) {
    console.warn(`[prerender] bar ${b.id} skipped: ${e.message}`);
    return null;
  }
});
sitemap.push(...barPages.filter(Boolean));

// 404
await write(
  '404.html',
  render({
    urlPath: '/404',
    title: `${tr('notFound.title')} — rabar`,
    description: tr('notFound.hint'),
    noindex: true,
    body: layout(tr('notFound.title'), para(tr('notFound.hint')) + `<p>${link('/', tr('notFound.back'))}</p>`),
  }),
);

// Sitemap
await write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemap
      .map(([p, lastmod]) => `  <url><loc>${SITE_URL}${p}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    `\n</urlset>\n`,
);

console.log(
  `[prerender] ${sitemap.length} indexable URLs · ${barPages.filter(Boolean).length} bars · ${cities.length} cities (${cities.filter(cityIndexable).length} indexable)`,
);
