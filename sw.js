/* Recetas de Raíz PWA: same website, not a duplicate recipe feed. */
/* IMPORTANT: HTML, JS, CSS, JSON and images are fetched from the network FIRST.
   Thus publishing a new recipe to the website also updates the installed PWA.
   The cache only serves as a fallback when offline. */
const CACHE_PREFIX = 'recetas-de-raiz-pwa-';
const CACHE_VERSION = '3';
const PAGES_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const IMAGES_CACHE = `${CACHE_PREFIX}images-${CACHE_VERSION}`;
const IMAGE_CACHE_LIMIT = 90;
const scopeUrl = new URL(self.registration.scope);
const urlInScope = (path) => new URL(path, scopeUrl).href;
const OFFLINE_URL = urlInScope('offline.html');
const HOME_URL = urlInScope('index.html');
const PRECACHE = [
  '', 'index.html', 'offline.html', 'instalar-app.html',
  'manifest.webmanifest',
  'assets/site-v14-1.css', 'assets/site-v14-1.js',
  'assets/pwa.js', 'assets/pwa-promo.css',
  'assets/home-carousel-v17.css', 'assets/home-carousel-v17.js',
  'assets/ideas-v17.css', 'assets/consent-v15.js',
  'assets/logo-recetas-de-raiz.svg',
  'assets/pwa/icon-192.png', 'assets/pwa/icon-512.png',
  'assets/pwa/icon-maskable-512.png'
].map(urlInScope);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES_CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== PAGES_CACHE && name !== IMAGES_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function keepImageCacheSmall(cache) {
  const requests = await cache.keys();
  const surplus = requests.length - IMAGE_CACHE_LIMIT;
  if (surplus > 0) {
    await Promise.all(requests.slice(0, surplus).map((request) => cache.delete(request)));
  }
}

async function fetchLatestOrCached(request, isDocument, isImage) {
  const cache = await caches.open(isImage ? IMAGES_CACHE : PAGES_CACHE);
  try {
    // Revalidate browser HTTP cache; do not serve a stale HTML page when online.
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok && response.type === 'basic') {
      // Wait until the response is stored, so a visited recipe can work offline.
      await cache.put(request, response.clone());
      if (isImage) await keepImageCacheSmall(cache);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: isDocument });
    if (cached) return cached;
    if (isDocument) {
      const home = await cache.match(HOME_URL);
      if (new URL(request.url).pathname === new URL(HOME_URL).pathname && home) return home;
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(scopeUrl.pathname)) return;

  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  const isImage = request.destination === 'image';
  const shouldCache = isDocument || isImage ||
    ['style', 'script', 'font', 'manifest'].includes(request.destination) ||
    /\.(?:js|css|json|webmanifest|svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(url.pathname);

  if (shouldCache) {
    event.respondWith(fetchLatestOrCached(request, isDocument, isImage));
  }
});
