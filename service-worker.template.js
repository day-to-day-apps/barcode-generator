const CACHE_NAME = 'barcode-tools-__PWA_VERSION__';
const PRECACHE = __PRECACHE__;

const PUBLIC_NAVIGATION = [
    /^\/$/,
    /^\/(?:pl|de|fr|es|it|pt|nl|cs|uk)\/$/,
    /^\/(?:(?:pl|de|fr|es|it|pt|nl|cs|uk)\/)?decoder\/?$/,
    /^\/(?:(?:pl|de|fr|es|it|pt|nl|cs|uk)\/)?(?:ean-13|code-128|upc-a|code-39|itf-14|codabar)\/?$/,
    /^\/(?:bulk-barcode-generator|gs1-barcode-generator|2d-barcode-generator|avery-label-printing|warehouse-barcode-labels|thermal-barcode-label-printing)\/?$/,
    /^\/pl\/(?:generator-kodow-z-csv|generator-kodow-gs1|generator-kodow-2d|drukowanie-etykiet-avery|etykiety-kreskowe-dla-magazynu|druk-kodow-na-drukarce-termicznej)\/?$/,
    /^\/guides\/[a-z0-9-]+\/?$/,
    /^\/pl\/poradniki\/[a-z0-9-]+\/?$/
];

function isPublicNavigation(pathname) {
    return PUBLIC_NAVIGATION.some((pattern) => pattern.test(pathname));
}

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('barcode-tools-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        if (!isPublicNavigation(url.pathname)) return;
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => cached || caches.match('/')))
        );
        return;
    }

    if (!['script', 'style', 'image', 'font', 'worker'].includes(request.destination)) return;
    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then((cached) => {
            const refresh = fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
                }
                return response;
            }).catch(() => cached);
            return cached || refresh;
        })
    );
});
