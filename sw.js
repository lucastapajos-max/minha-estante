/* Service worker — "rede primeiro" pro app.
   Online: sempre pega a versão fresca (e atualiza o cache).
   Offline: cai pro cache. Evita ficar preso em versão antiga. */
const VERSAO = "estante-v7";
const SHELL = [
  "./", "index.html", "styles.css",
  "config.js", "vendor/supabase.js",
  "store.js", "apis.js", "app.js",
  "manifest.webmanifest", "icon.svg", "icon-maskable.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Só o próprio app (mesma origem). Buscas externas (Google Books/Jikan) vão direto pra rede.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSAO).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
  );
});
