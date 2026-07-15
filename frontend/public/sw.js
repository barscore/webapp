// rabar service worker — static asset caching + offline fallback.
const CACHE = 'rabar-v4';
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

// Web Push: show the notification; tapping it focuses (or opens) the app on
// the payload's internal link.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    /* non-JSON payload — show a generic notification */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'rabar', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { link: data.link || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        win.focus();
        return win.navigate(link);
      }
      return clients.openWindow(link);
    }),
  );
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
