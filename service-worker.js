// Robust cache for GitHub Pages deploy — versioned to avoid stale assets
const CACHE = "quran-site-static-v20250816170947";
const ASSETS = [
  "./",
  "./index.html",
  "./1.png",
  "./2.png",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations/HTML; cache-first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Treat navigations and HTML accepts as HTML
  const isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req) || await caches.match("./index.html");
        return cached;
      }
    })());
    return;
  }

  // For everything else: cache-first, then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      // Only cache GET
      if (req.method === "GET") {
        const cache = await caches.open(CACHE);
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (e) {
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});
