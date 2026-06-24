const CACHE_NAME = "fostec-iot-v1";
const STATIC_ASSETS = ["/", "/index.html", "/Logo.png", "/valve.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip API calls to Node-RED - let them go directly
  if (url.hostname === "192.168.100.155" || url.hostname === "192.168.100.107") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request);
    }),
  );
});
