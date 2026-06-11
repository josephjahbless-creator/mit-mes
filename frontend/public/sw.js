// MIT M&E System — Service Worker
// Provides offline fallback caching + browser push notifications

const CACHE_NAME = 'mit-mes-v2';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/tanzania-emblem.svg',
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'MIT M&E', body: event.data.text() }; }

  const title   = data.title || 'MIT M&E System';
  const options = {
    body:    data.body || data.message || '',
    icon:    '/logos/mit-logo.png',
    badge:   '/tanzania-emblem.svg',
    tag:     data.tag || 'mit-mes',
    data:    { url: data.url || '/' },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return existing.navigate(url); }
      return self.clients.openWindow(url);
    })
  );
});

// ── Fetch strategy ─────────────────────────────────────────────────────────────
// - API requests: passthrough (never cached)
// - Code (JS/CSS): NETWORK-FIRST — never serve stale code. Vite dev modules and
//   hashed prod bundles change, so cache-first here caused blank pages after a
//   server restart. Cache is only an offline fallback.
// - Media (images/fonts): cache-first (safe; they rarely change)
// - Navigation (HTML): network-first with offline fallback to /index.html
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls — let the network handle them, never cache
  if (url.pathname.startsWith('/api/')) return;
  // Vite internals / source modules in dev — never intercept
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return;

  // Navigation (HTML) — network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  const isCode  = url.pathname.match(/\.(js|mjs|css)$/);
  const isMedia = url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|gif|webp)$/);

  if (isCode) {
    // Network-first: always get fresh code; fall back to cache only if offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (isMedia) {
    // Cache-first for media
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Everything else — straight to network
});
