// sw.js — Ozark Invitational PWA service worker (advanced, rewritten)

"use strict";

// Bump this when you change assets so old caches get cleared.
const CACHE_VERSION = "ozark-v1.0.0";
const PRECACHE_CACHE = `${CACHE_VERSION}-precache`;
const RUNTIME_CACHE  = `${CACHE_VERSION}-runtime`;

// Core assets that should be available offline
// Adjust this list to match the pages/files you actually have.
const PRECACHE_ASSETS = [
  // Core pages
  "./",
  "./index.html",
  "./scoreboard.html",
  "./scorecard.html",
  "./sponsors.html",
  "./players.html",

  // CSS / JS
  "./styles.css",
  "./script.js",
  "./site.webmanifest",

  // Icons & logo
  "./images/icons/icon-192.png",
  "./images/icons/icon-512.png",
  "./images/ozark-logo.png",

  // Hero / placeholders
  "./images/placeholders/ph-hero-1440x810.svg",
  "./images/placeholders/ph-gallery-4x3.svg",
  "./images/placeholders/ph-sponsor-3x1.svg"
];

// Helper: same-origin check
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

// INSTALL: pre-cache core assets
self.addEventListener("install", (event) => {
  console.log("[SW] install", CACHE_VERSION);

  event.waitUntil(
    caches.open(PRECACHE_CACHE)
      .then((cache) => {
        console.log("[SW] precaching", PRECACHE_ASSETS.length, "assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("[SW] skipWaiting");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("[SW] install error while precaching:", err);
      })
  );
});

// ACTIVATE: clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] activate", CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => {
              console.log("[SW] deleting old cache", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => {
        console.log("[SW] claim clients");
        return self.clients.claim();
      })
  );
});

// FETCH: routing + strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  const acceptHeader = request.headers.get("accept") || "";

  // 1) NAVIGATION / HTML: network-first with offline fallback
  if (request.mode === "navigate" || acceptHeader.includes("text/html")) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 2) STATIC ASSETS (CSS, JS, images, fonts): stale-while-revalidate
  if (
    request.destination === "style"  ||
    request.destination === "script" ||
    request.destination === "image"  ||
    request.destination === "font"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 3) Default: cache-first, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Network-first for navigations
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const copy = networkResponse.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
    return networkResponse;
  } catch (err) {
    console.warn("[SW] navigation fetch failed, using cache:", err);
    const cached = (await caches.match(request)) || (await caches.match("./index.html"));
    if (cached) return cached;

    return new Response(
      "<h1>Offline</h1><p>The Ozark Invitational site is not available right now. Try again when you’re back online.</p>",
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 503
      }
    );
  }
}

// Stale-while-revalidate for static assets
function staleWhileRevalidate(request) {
  return caches.match(request).then((cachedResponse) => {
    const networkFetch = fetch(request)
      .then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return networkResponse;
      })
      .catch((err) => {
        console.warn("[SW] asset fetch failed, using cache:", err);
        return cachedResponse;
      });

    // If cached, return it immediately and update in background; else wait for network.
    return cachedResponse || networkFetch;
  });
}
