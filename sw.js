const CACHE_VERSION = 'lenta-v25-2026-10-21';
const CORE_ASSETS = [
  './', './index.html', './manifest.json', './icon.png', './road-icon.png', 
  './data.js', './data_services.js', './music.mp3',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(cache => Promise.all(CORE_ASSETS.map(url => cache.add(url).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  if (url.hostname.includes('api.')) { e.respondWith(fetch(req).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))); return; }
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.status === 200 && (res.type === 'basic' || res.type === 'cors')) { const clone = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, clone)).catch(() => {}); }
    return res;
  }).catch(() => { if (req.mode === 'navigate') return caches.match('./index.html'); })));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
