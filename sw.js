/* ════════════════════════════════════════
   Creador@s3D — Service Worker
   Estrategia: Cache First (estáticos) + Network First (navegación)
   ════════════════════════════════════════ */

const CACHE_VER     = 'v2';
const CACHE_STATIC  = `creadores3d-static-${CACHE_VER}`;
const CACHE_DYNAMIC = `creadores3d-dynamic-${CACHE_VER}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

/* ─── Install: precachear recursos estáticos ─── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate: limpiar cachés viejas ─── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ─── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar GET del mismo origen
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Navegación → Network First con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Recursos estáticos → Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // El resto → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

/* ─── Estrategias ─── */

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_DYNAMIC);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match('/offline.html');
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Recurso no disponible sin conexión.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_DYNAMIC);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? fetchPromise;
}

function isStaticAsset(pathname) {
  return (
    STATIC_ASSETS.includes(pathname) ||
    pathname.startsWith('/css/') ||
    pathname.startsWith('/js/') ||
    pathname.startsWith('/icons/')
  );
}

/* ─── Background Sync: mensajes del formulario ─── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contact-messages') {
    event.waitUntil(notifyClientsOfSync());
  }
});

async function notifyClientsOfSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) =>
    client.postMessage({ type: 'SYNC_COMPLETE' })
  );
}
