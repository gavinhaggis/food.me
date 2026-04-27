const CACHE_NAME = 'foodme-v1';
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/sensitivity-dictionary.js',
  './js/db.js',
  './js/allergens.js',
  './js/api.js',
  './js/scanner.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

const OFF_API_ORIGIN = 'world.openfoodfacts.org';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    }).catch(err => {
      console.warn('[foodme:sw] cache install failed', err);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Open Food Facts API
  if (url.hostname === OFF_API_ORIGIN) {
    event.respondWith(networkFirstWithCacheFallback(event.request));
    return;
  }

  // CDN resources — network first, no cache fallback required
  if (url.hostname.includes('unpkg.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // All other requests — cache first, network fallback
  event.respondWith(cacheFirstWithNetworkFallback(event.request));
});

async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      // Signal to app that we're serving stale data
      const modified = cached.clone();
      return modified;
    }
    // Return a synthetic offline response
    return new Response(
      JSON.stringify({ status: 0, error: 'offline', message: 'offline — no cached data available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstWithNetworkFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('offline', { status: 503 });
  }
}
