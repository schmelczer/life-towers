/*
 * Safety service worker — shipped ONLY in the dev / e2e Docker image
 * (Dockerfile build arg SERVICE_WORKER=disabled) in place of Angular's real
 * ngsw-worker.js.
 *
 * Why it exists: the dev compose builds a production SPA bundle, so the PWA
 * service worker is enabled (`enabled: !isDevMode()` in app.config.ts). On the
 * fixed localhost:8000 origin it would keep serving a stale, client-cached app
 * shell across `docker compose -f docker-compose.dev.yml up --build` rebuilds,
 * shadowing freshly-built FE assets.
 *
 * This worker's only job is to disappear: it claims any open clients, deletes
 * every Cache Storage entry, then unregisters itself. Any previously-installed
 * real service worker is evicted on its next update check (the browser fetches
 * this changed ngsw-worker.js and replaces the old one with this), and no
 * service worker is ever left controlling the page — so assets are always
 * fetched from network, where index.html is `no-cache` and bundles are
 * content-hashed.
 *
 * It deliberately does NOT call client.navigate(): the bundle re-registers on
 * every load, so a forced reload would create a loop. The only cost is a
 * harmless register -> unregister cycle per load.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
