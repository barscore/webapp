// rabar service worker — static asset caching + offline fallback.
const CACHE = 'rabar-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/', '/index.html', '/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin http(s) GETs. Skip cross-origin (e.g. AdSense),
  // chrome-extension:// and non-GET — they can't be cached and throw on put().
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/api') ||
    request.url.includes(':3000')
  ) {
    return;
  }

  // Navigations: network-first, fall back to offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Static assets: cache-first, then network.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        }),
    ),
  );
});
