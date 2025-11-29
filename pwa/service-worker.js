// pwa/service-worker.js
// Simple but robust service worker for Spendrill PWA.
// Cache static shell, update on new SW, provide offline fallback for navigation and assets.
// Version this value when releasing updates.
const SW_VERSION = 'spendrill-v1';
const CORE_CACHE = `${SW_VERSION}-core`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// Files to precache: update if you add/remove build files.
const PRECACHE_URLS = [
  '/',                            // index.html (if served at root)
  '/index.html',
  '/css/theme.css',
  '/css/app.css',
  '/css/tab-bar.css',
  '/css/header-bar.css',
  '/css/home-screen.css',
  '/css/ai-screen.css',
  '/css/stats-screen.css',
  '/css/settings-screen.css',
  '/css/entry-sheet.css',
  '/css/pin-screen.css',

  '/js/app.js',
  '/js/state.js',
  '/js/db.js',
  '/js/event-bus.js',
  '/js/utils.js',
  '/js/constants.js',
  '/js/worker-stats.js',

  '/components/tab-bar.js',
  '/components/header-bar.js',
  '/components/home-screen.js',
  '/components/ai-screen.js',
  '/components/stats-screen.js',
  '/components/settings-screen.js',
  '/components/entry-sheet.js',
  '/components/pin-screen.js',

  '/pwa/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png'
];

// A minimal offline fallback page (optional). If you have a dedicated offline HTML, include it in PRECACHE_URLS.
const OFFLINE_FALLBACK = '/index.html';

// Install: pre-cache the application shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS.map(normalizeURL)).catch((err) => {
        // Some URLs may 404 during development — ignore those but still complete install.
        console.warn('SW precache partial failure', err);
        return Promise.resolve();
      });
    })
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== CORE_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch:
