// ============================================================
// sw.js — Service Worker — My Vinyl Collector
// Met en cache l'app + les pochettes pour fonctionner offline
// ============================================================

const CACHE_NAME  = 'vinyl-collector-v11';
const COVER_CACHE = 'vinyl-covers-v1';

// Fichiers de l'app à mettre en cache au premier chargement
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/favicon.svg',
  '/assets/icon-512.svg',

  // CSS
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/collection.css',
  '/css/valeur.css',
  '/css/ecouter.css',
  '/css/stats.css',
  '/css/modals.css',
  '/css/auth.css',
  '/css/toast.css',
  '/css/spotify.css',
  '/css/responsive.css',

  // JS
  '/js/main.js',
  '/js/config.js',
  '/js/data.js',
  '/js/storage.js',
  '/js/state.js',
  '/js/theme.js',
  '/js/canvas.js',
  '/js/loop.js',
  '/js/swipe.js',
  '/js/search.js',
  '/js/collection.js',
  '/js/valeur.js',
  '/js/ecouter.js',
  '/js/stats.js',
  '/js/csv.js',
  '/js/modal-add.js',
  '/js/modal-detail.js',
  '/js/modal-auth.js',
  '/js/modal-edit.js',
  '/js/modal-share.js',
  '/js/navigation.js',
  '/js/auth.js',
  '/js/cloud-sync.js',
  '/js/toast.js',
  '/js/share.js',
  '/js/share-view.js',
  '/js/spotify.js',
  '/js/spotify-ui.js',
  '/js/actions-menu.js',
  '/js/api/discogs.js',
  '/js/api/musicbrainz.js',
];

// ---- Installation : précache des fichiers statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// ---- Activation : suppression des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== COVER_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Interception des requêtes
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pochettes : cache-first
  if (url.hostname === 'coverartarchive.org') {
    e.respondWith(
      caches.open(COVER_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // Polices Google : cache-first
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // Proxy Discogs (/api/*) : network-only (jamais en cache offline)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // App statique : network-first avec fallback cache
  if (url.hostname === self.location.hostname) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // MusicBrainz et autres : network-only
  e.respondWith(
    fetch(e.request).catch(() =>
      new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
});
