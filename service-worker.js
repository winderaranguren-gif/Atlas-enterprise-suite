const VERSION = 'atlas-core-v16-identity-audit';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/atlas-suite.css',
  '/atlas-os-modules.css',
  '/atlas-technical-support.css',
  '/atlas-accessibility.css',
  '/app.js',
  '/atlas-accessibility.js',
  '/atlas-dragdrop.js',
  '/atlas-cars-entry.js',
  '/atlas-cars.html',
  '/atlas-cars.css',
  '/atlas-cars.js',
  '/atlas-gps-entry.js',
  '/atlas-gps-4d.html',
  '/atlas-gps-4d.css',
  '/atlas-gps-4d.js',
  '/atlas-gps-cloud-provider.js',
  '/atlas-regional-navigation.js',
  '/atlas-legacy-migrate.js',
  '/atlas-suite.js',
  '/atlas-os-operational.js',
  '/atlas-technical-support.js',
  '/atlas-support-runbooks.js',
  '/atlas-fleet-intelligence.html',
  '/atlas-fleet-intelligence.css',
  '/atlas-fleet-intelligence.js',
  '/atlas-calendar.html',
  '/atlas-calendar-system-events.js',
  '/atlas-calendar.js',
  '/manifest.webmanifest',
  '/offline.html',
  '/public/icons/atlas-icon.svg'
];

const IDENTITY_NETWORK_ONLY = new Set([
  '/cloud-auth.html',
  '/cloud-auth.js',
  '/cloud-auth.css',
  '/atlas-config.js',
  '/atlas-identity.js',
  '/atlas-identity-invitations.js',
  '/atlas-identity-audit.js',
  '/private-beta.html',
  '/private-beta.js',
  '/private-beta-recovery.js'
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && IDENTITY_NETWORK_ONLY.has(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match('/offline.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text?.() || '' }; }
  const title = payload.title || 'ATLAS Calendar';
  const options = {
    body: payload.body || 'Tienes un recordatorio programado en ATLAS.',
    icon: '/public/icons/atlas-icon.svg',
    badge: '/public/icons/atlas-icon.svg',
    tag: payload.tag || 'atlas-calendar-reminder',
    renotify: true,
    data: { url: payload.url || '/atlas-calendar.html', ...(payload.data || {}) }
  };

  const mirrorToOpenAtlasWindows = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => Promise.all(clients.map(client => client.postMessage({
      type: 'atlas:alert',
      title,
      message: options.body,
      tag: options.tag,
      data: options.data
    }))));

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    mirrorToOpenAtlasWindows
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/atlas-calendar.html', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
