
const TOKEN = 'lksadjf8474jfjf7474keld94i';
const SHARE_URL = 'https://ef77-91-113-85-122.ngrok.io/memory/share';
const cacheName = 'memori';

// Files to cache
const contentToCache = [
    '/pwa/index.html',
    '/pwa/app.js',
    '/pwa/style.css',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Cache content via Service Worker
self.addEventListener('install', (e) => {
    console.info('[Memori] Installing Service Worker');
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        console.log('[Memori] Caching all: app shell and content');
        await cache.addAll(contentToCache);
    })());
});

// Fetching content using Service Worker
// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
self.addEventListener('fetch', (e) => {

    // // If this is an incoming POST request for the registered "action" URL, respond to it.
    // https://developer.mozilla.org/en-US/docs/Web/API/Request
    if (e.request.method == 'POST' && new URL(e.request.url).pathname.endsWith('/pwa/memory/share')) {

        e.respondWith((async () => {

            // Create headers necessary to call Memori server
            const h = new Headers();
            h.append('Authorization', `Bearer ${TOKEN}`)

            // Remember resource on Memori server
            const formData = await e.request.formData();
            const response = await fetch(SHARE_URL, {
                method: 'POST',
                body: formData,
                headers: h,
                mode: "same-origin"
            });

            // GET the newly created memory url
            const thingResponse = await fetch(response.url, {
                headers: h
            });

            // TODO Cache Memori response
            // const cache = await caches.open(cacheName);
            // cache.put(e.request, thingResponse.clone());

            return thingResponse;
        })());

        // otherwise just cache it
    } else {
        e.respondWith((async () => {
            const r = await caches.match(e.request);
            console.log(`[Memori] Service Worker fetching resource: ${e.request.url}`);
            if (r)
                return r;
            const response = await fetch(e.request);
            const cache = await caches.open(cacheName);
            console.log(`[Memroi] Service Worker caching new resource: ${e.request.url}`);
            cache.put(e.request, response.clone());
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
            return caches.delete(key);
        }))
    }));
});
