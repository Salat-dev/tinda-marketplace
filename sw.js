const CACHE_NAME = 'tinda-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/cart.html',
    '/checkout.html',
    '/faqs.html',
    '/conditions.html',
    '/help.html',
    '/login.html',
    '/responsive.css',
    '/responsive.js',
    '/dashboard.html',
    '/product.html',
    '/categories.html',
    'assets/icons/icone phone.svg',
    'assets/icons/logo.svg'
];

// Installation
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activation
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Stratégie : Network First, puis cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});