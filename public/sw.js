const CACHE_NAME = 'englishbridge-shell-v2';
const OFFLINE_URL = '/offline.html';

const APP_SHELL_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore cross-origin, mutations and API routes from hard offline caching
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Network-first navigation with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Cache-first for local static assets
  if (url.pathname.startsWith('/_next/static') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
