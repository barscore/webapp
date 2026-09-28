import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from '../utils/seo.js';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function apply({ title, description, robots, path }) {
  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[name="robots"]', 'content', robots);
  setMeta('link[rel="canonical"]', 'href', SITE_URL + path);
  setMeta('meta[property="og:url"]', 'content', SITE_URL + path);
}

// Per-page <title>, description, canonical and robots while navigating inside
// the SPA. The prerendered HTML (scripts/prerender.mjs) carries the same values
// for the first load. On unmount the site defaults come back, so a page that
// doesn't call this never inherits the previous page's title.
// `title` without the brand gets " — rabar" appended.
export function usePageMeta({ title, description, noindex = false } = {}) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} — rabar` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESCRIPTION;
  const robots = noindex ? 'noindex, follow' : 'index, follow';

  useEffect(() => {
    apply({ title: fullTitle, description: desc, robots, path: pathname });
  }, [fullTitle, desc, robots, pathname]);

  useEffect(
    () => () =>
      apply({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, robots: 'index, follow', path: '/' }),
    [],
  );
}
