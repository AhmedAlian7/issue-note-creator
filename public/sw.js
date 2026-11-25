const CACHE = "warehouse-shell-v1";
const SHELL = "/offline";
const CORE = [
  "/manifest.webmanifest",
  "/icons/warehouse-192.png",
  "/icons/warehouse-512.png",
  "/icons/warehouse-maskable.png",
];

let refreshing;
function refreshShell() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(SHELL, {
      cache: "reload",
      credentials: "omit",
    });
    if (!response.ok || response.redirected)
      throw new Error("Offline shell unavailable");
    const html = await response.clone().text();
    const assets = [
      ...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"#]+)"/g),
    ].map((match) => match[1].replaceAll("&amp;", "&"));
    await cache.addAll([...new Set([...CORE, ...assets])]);
    await cache.put(SHELL, response);
  })().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}

self.addEventListener("install", (event) => {
  event.waitUntil(refreshShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("warehouse-shell-") && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "refresh-shell")
    event.waitUntil(refreshShell().catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(SHELL)) || Response.error();
      }),
    );
  } else if (
    url.pathname.startsWith("/_next/static/") ||
    CORE.includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
