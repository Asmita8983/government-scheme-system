const CACHE_NAME = "govportal-cache-v2";
const OFFLINE_URL = "/index.html";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
  "/manifest.json",
  "/robots.txt"
];

// ⬇️ Install Service Worker & Cache Core Shell Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("🔋 [Service Worker] Pre-caching offline portal shell Assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 🔄 Activate Service Worker & Delete Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("🧹 [Service Worker] Wiping outdated PWA Cache", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 🌐 Intercept Fetch Requests & Apply Network-First Caching Strategy
// Ideal for Government Scheme portals where live data is preferred, but offline loading is fallback!
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip API/Backend endpoints or hot-reloading websockets
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("ws://") ||
    event.request.url.includes("sockjs-node")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Double check response is valid before caching
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone response to put a copy in the cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Fail-safe: If network fails (Offline mode), try loading from Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page/asset is completely missing from cache, fallback to main index.html
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
