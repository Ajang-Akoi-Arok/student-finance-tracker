/* ========================================
   Service Worker — Offline-first cache
   Cache-first for static assets; network
   fallback for everything else.
   ======================================== */

const CACHE_NAME   = 'finance-tracker-v7';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles/main.css',
    './styles/a11y.css',
    './scripts/main.js',
    './scripts/state.js',
    './scripts/storage.js',
    './scripts/ui.js',
    './scripts/validators.js',
    './scripts/search.js',
    './scripts/utils.js',
    './seed.json',
    './tests.html',
    './scraper.html'
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: delete stale caches from previous versions
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k  => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: cache-first, fall back to network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (Google Fonts etc.) — let them go to network
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    // Cache successful GET responses dynamically
                    if (response && response.status === 200 && response.type === 'basic') {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                    }
                    return response;
                });
            })
    );
});

