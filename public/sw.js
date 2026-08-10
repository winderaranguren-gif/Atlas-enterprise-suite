const CACHE = 'atlas-core-services-v1.1.0';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/core-services.css',
  '/core-services.js',
  '/music-core.js',
  '/update-core.js',
  '/app.js',
  '/manifest.webmanifest'
];

function sameOrigin(url) { return url.origin === self.location.origin; }
function networkOnly(url){return url.pathname==='/atlas.config.json'||url.pathname==='/atlas.release.json';}
function cacheableStatic(url) {
  if (!sameOrigin(url)) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (networkOnly(url)) return false;
  return /\.(?:css|js|mjs|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|webmanifest)$/i.test(url.pathname);
}
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
self.addEventListener('fetch', event => {
  const request = event.request;if (request.method !== 'GET') return;
  const url = new URL(request.url);if (!sameOrigin(url) || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {event.respondWith(fetch(request, { cache: 'no-store' }).then(response => response.ok ? response : Promise.reject(new Error(`navigation_${response.status}`))).catch(async () => (await caches.match(request)) || caches.match('/index.html') || caches.match('/')));return;}
  if (networkOnly(url)) {event.respondWith(fetch(request, { cache: 'no-store' }));return;}
  if (!cacheableStatic(url)) return;
  event.respondWith(caches.match(request).then(cached => {const refresh = fetch(request, { cache: 'no-cache' }).then(response => {if (response.ok && response.type === 'basic') {caches.open(CACHE).then(cache => cache.put(request, response.clone()));}return response;});return cached || refresh;}));
});
self.addEventListener('message', event => {if (event.data === 'SKIP_WAITING') self.skipWaiting();});
