// Minimal service worker: makes the Game Jam installable. HTML/JS/CSS are always revalidated so updates show immediately.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const d = e.request.destination;
  if (d === "document" || d === "script" || d === "style") e.respondWith(fetch(e.request, { cache: "no-cache" }));
  else e.respondWith(fetch(e.request));
});
