// Dad's Morse — Service Worker v1
const CACHE_NAME = 'dmm-v8';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './turtle.png',
  './turtle.mp4'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await Promise.all(
          ASSETS.map(async asset => {
            try {
              await cache.add(asset);
            } catch (_) {
              // Ignore individual cache misses so SW install still succeeds.
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigations: network-first with cached index fallback.
// - Other same-origin GET: cache-first with network fallback.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const isNavigation = event.request.mode === 'navigate';
      const isSameOrigin = event.request.url.startsWith(self.location.origin);

      if (isNavigation) {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('./index.html', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (_) {
          const cachedIndex = await caches.match('./index.html') || await caches.match('./');
          if (cachedIndex) return cachedIndex;
          return new Response('Offline - cached version not available', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      }

      if (!isSameOrigin) {
        return fetch(event.request);
      }

      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (_) {
        return new Response('Offline - cached version not available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});
