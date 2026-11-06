const CACHE_NAME = 'sigde-expo-v1';
const EXPO_PATH = '/expo';
const CORE_ASSETS = [EXPO_PATH, '/Logo-login.png'];

async function cacheExpoShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(EXPO_PATH, { cache: 'reload' });
  if (!response.ok) throw new Error('No fue posible preparar el Modo Expo');

  await cache.put(EXPO_PATH, response.clone());
  const html = await response.text();
  const assetUrls = new Set(CORE_ASSETS);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) assetUrls.add(url.pathname + url.search);
  }

  await Promise.allSettled([...assetUrls].map(async (url) => {
    const asset = await fetch(url, { cache: 'reload' });
    if (!asset.ok) return;
    await cache.put(url, asset.clone());

    if (asset.headers.get('content-type')?.includes('text/css')) {
      const css = await asset.text();
      const nestedAssets = [...css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)]
        .map((entry) => new URL(entry[1], new URL(url, self.location.origin)))
        .filter((entry) => entry.origin === self.location.origin)
        .map((entry) => entry.pathname + entry.search);
      await Promise.allSettled(nestedAssets.map(async (nestedUrl) => {
        const nested = await fetch(nestedUrl, { cache: 'reload' });
        if (nested.ok) await cache.put(nestedUrl, nested);
      }));
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheExpoShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('sigde-expo-') && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' && url.pathname === EXPO_PATH) {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) (await caches.open(CACHE_NAME)).put(EXPO_PATH, response.clone());
      return response;
    }).catch(() => caches.match(EXPO_PATH)));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    })));
  }
});
