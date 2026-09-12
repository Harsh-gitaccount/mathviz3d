// ── MathViz 3D Service Worker ──────────────────────────
// Change version string whenever you update the app
// This forces old cache to be cleared on next visit
const CACHE_NAME = 'mathviz3d-v2';

// Files to cache for offline use
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Three.js is loaded from CDN — cache it too
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// ── INSTALL: cache all files ───────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ── ACTIVATE: clean up old caches ─────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // Take control immediately
});

// ── FETCH: serve from cache, fallback to network ──────
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        // Serve from cache
        return response;
      }
      // Not in cache — fetch from network and cache it
      return fetch(event.request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback — return cached HTML
      return caches.match('/index.html');
    })
  );
});
