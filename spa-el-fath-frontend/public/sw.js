// Versioned application-shell cache. Bump SW_VERSION on every deploy so the
// activate handler removes the previous runtime cache. Authenticated API
// responses are never cached: /api requests bypass the service worker.
const SW_VERSION = 'v2';
const STATIC_CACHE = `spa-el-fath-static-${SW_VERSION}`;
const RUNTIME_CACHE = `spa-el-fath-runtime-${SW_VERSION}`;
const APP_SHELL = '/index.html';

const isSameOrigin = url => url.origin === self.location.origin;
const isApiRequest = url => url.pathname === '/api' || url.pathname.startsWith('/api/');
const isNavigation = request =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));

// Only cache successful, same-origin, non-sensitive responses.
function isCacheable(response) {
  if (!response || !response.ok || response.status !== 200) return false;
  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  if (response.headers.get('set-cookie')) return false;
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.add(APP_SHELL)).catch(() => undefined)
  );
  // A waiting worker is intentionally kept until the page asks for the update,
  // so an in-flight session is never swapped mid-request.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url) || isApiRequest(url)) return;

  if (isNavigation(request)) {
    // Network-first navigation guarantees a new deployment is picked up.
    // The cached shell is only an offline fallback.
    event.respondWith(
      fetch(request)
        .then(response => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(APP_SHELL, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => (await caches.match(APP_SHELL)) || Response.error())
    );
    return;
  }

  // Static hashed assets: stale-while-revalidate keeps startup fast while
  // refreshing the cache in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
