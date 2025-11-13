// sw.js — Ozark Invitational PWA service worker (advanced)

// Bump this when you change assets so old caches get cleared.
const CACHE_VERSION = "ozark-v1.0.0";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRECACHE_CACHE = `${CACHE_VERSION}-precache`;

// Core assets that should be available offline
// Adjust this list to match the pages/files you actually have.
const PRECACHE_ASSETS = [
  // Core pages
  "./",
  "./index.html",
  "./scoreboard.html",
  "./scorecard.html",
  "./sponsors.html",
  "./profiles.html",

  // CSS / JS
  "./styles.css",
  "./script.js",
  "./site.webmanifest",

  // Icons & logo
  "./images/icons/icon-192.png",
  "./images/icons/icon-512.png",
  "./images/ozark-logo.png",

  // Optional: hero/generic images & placeholders
  "./images/placeholders/ph-hero-1440x810.svg",
  "./images/placeholders/ph-gallery-4x3.svg",
  "./images/placeholders/ph-sponsor-3x1.svg"
];

// A tiny helper to know if a request is same-origin
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

// INSTALL: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH: advanced strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests and same-origin
  if (request.method !== "GET" || !isSameOrigin(request)) {
    return;
  }

  const url = new URL(request.url);

  // 1) NAVIGATION REQUESTS (HTML pages): network-first, then cache, then fallback
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache a copy for offline
          const copy = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cached page, then to cached index.html, then a simple fallback response
          const cached = await caches.match(request) || await caches.match("./index.html");
          if (cached) return cached;
          return new Response(
            "<h1>Offline</h1><p>The Ozark Invitational site is not available right now. Try again when you’re back online.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
          );
        })
    );
    return;
  }

  // 2) STATIC ASSETS (CSS, JS, images, icons): stale-while-revalidate
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 3) Default: try cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Stale-while-revalidate helper
function staleWhileRevalidate(request) {
  return caches.match(request).then((cachedResponse) => {
    const networkFetch = fetch(request)
      .then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return networkResponse;
      })
      .catch(() => cachedResponse); // if network fails, stick with cache

    // If we have something cached, return it immediately (stale) and update in background
    return cachedResponse || networkFetch;
  });
}
