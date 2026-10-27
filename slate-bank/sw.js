const CACHE_NAME = 'novabank-v2';
const ASSETS = ['./', './index.html', './manifest.json', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap', 'https://cdn.jsdelivr.net/npm/chart.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))); });