/* Service worker — "rede primeiro" pro app.
   Online: sempre pega a versão fresca (e atualiza o cache).
   Offline: cai pro cache. Evita ficar preso em versão antiga. */
const VERSAO = "estante-v10";
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

// ===== PUSH: notificação de capítulo novo (chega com o app fechado) =====
self.addEventListener("push", (e) => {
  let dados = {};
  try { dados = e.data ? e.data.json() : {}; } catch { dados = { body: e.data && e.data.text() }; }
  const titulo = dados.title || "Novo capítulo!";
  const opts = {
    body: dados.body || "",
    icon: "icon.svg",
    badge: "icon.svg",
    tag: dados.tag || undefined,          // agrupa notificações do mesmo mangá
    data: { url: dados.url || "./" },
    vibrate: [80, 40, 80],
  };
  e.waitUntil(self.registration.showNotification(titulo, opts));
});

// clicar na notificação abre (ou foca) o app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ("focus" in w) return w.focus(); }
      if (clients.openWindow) return clients.openWindow(alvo);
    })
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
