
const cacheName = 'memori';

// Files to cache
const contentToCache = [
    '/index.html',
    '/build/bundle.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Cache content via Service Worker
self.addEventListener('install', (e) => {
    console.info('[Memori] Installing Service Worker');
    e.waitUntil((async () => {
        // TODO cache
        // console.log('[Memori] Caching all: app shell and content');
        // const cache = await caches.open(cacheName);
        // await cache.addAll(contentToCache);
    })());
});

function isShareEvent(fetchEvent) {
    return ( fetchEvent.request.method == 'POST' 
        && new URL(fetchEvent.request.url).pathname.endsWith('/memory/webshare') )
}

// Fetching content using Service Worker
// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
self.addEventListener('fetch', (fetchEvent) => {

    // If this is an incoming POST request for the registered "action" URL, respond to it.
    // https://developer.mozilla.org/en-US/docs/Web/API/Request
    if (isShareEvent(fetchEvent)) {

        // Calls to /memory/webshare can take a long time since they do
        // things call download web pages.

        // Background POST /memory/webshare
        fetch('/memory/webshare', {
            method: 'POST',
            body: await fetchEvent.request.formData(),
            mode: "same-origin",
            credentials: "same-origin"
        });

        // Immediately render 'share in progress' page in PWA
        fetchEvent.respondWith((async () => {
            return await fetch('/webshare');
        })());

    // otherwise just cache it
    } else {

        fetchEvent.respondWith((async () => {
            const r = await caches.match(fetchEvent.request);
            console.log(`[Memori] Service Worker fetching resource: ${fetchEvent.request.url}`);
            if (r)
                return r;
            const response = await fetch(fetchEvent.request);

            // TODO cache
            // console.log(`[Memroi] Service Worker caching new resource: ${e.request.url}`);
            // const cache = await caches.open(cacheName);
            // cache.put(e.request, response.clone());

            return response;
        })());
    }

});

// Reload the cache
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {

            if (key === cacheName)
                return;

            // TODO cache
            // return caches.delete(key);
            return true;

        }))
    }));
});
