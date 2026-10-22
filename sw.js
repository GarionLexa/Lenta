const CACHE_NAME = 'lenta-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './data.js',
  './data_services.js',
  './stories.js',
  './animations.css',
  './icon.png',
  './manifest.json',
  './offline.html'
];

// Установка: кэшируем локальные + пытаемся внешние
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(ASSETS);
      // Внешние ресурсы — опционально (не ломают установку при ошибке)
      try {
        await cache.addAll([
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap'
        ]);
      } catch (err) {
        console.warn('[SW] Внешние ресурсы не закэшированы:', err);
      }
    })
  );
});

// Активация: чистим старые кэши
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const request = e.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Навигация (HTML) — Network First → fallback на кэш → offline.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // 2. Локальная статика (CSS, JS, изображения, шрифты) — Stale-While-Revalidate
  if (url.origin === location.origin && url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ttf|eot)$/)) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Внешние CDN (Tailwind, Google Fonts) — Cache First с обновлением в фоне
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // 4. Остальное — просто из сети
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
