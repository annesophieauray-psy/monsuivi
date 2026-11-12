/* Hors connexion : l'application reste utilisable sans réseau. Aucune donnée patient ne transite ici. */
const CACHE = "es-202611121356";
const SHELL = ["./", "./index.html", "./praticienne.html", "./config.js", "./manifest.json", "./manifest-pro.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
/* Notification sans contenu : rien de personnel ne transite par le service de notification */
self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let body = "Nouveau message dans Entre-Séances.", tag = "es-msg";
    try {
      const c = await caches.open("es-meta"), r = await c.match("meta"), m = r ? await r.json() : null;
      if (m && m.rem && m.rem.on) {
        const now = new Date(), d = now.getDay() || 7, mins = now.getHours() * 60 + now.getMinutes();
        const t = Number(m.rem.time.slice(0, 2)) * 60 + Number(m.rem.time.slice(3, 5));
        if (m.rem.days.indexOf(d) >= 0 && mins - t >= -5 && mins - t <= 75) { body = m.tv === "vous" ? "Petit rappel : un moment pour vos exercices ?" : "Petit rappel : un moment pour tes exercices ?"; tag = "es-rappel"; }
      }
    } catch (e) {}
    await self.registration.showNotification("Entre-Séances", { body, icon: "icon-192.png", badge: "icon-192.png", tag, renotify: true });
    const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cl.forEach(c => c.postMessage("es-refresh"));
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const app = cl.find(c => /index\.html|\/$/.test(new URL(c.url).pathname));
    if (app) { app.postMessage("es-refresh"); return app.focus(); }
    return self.clients.openWindow("./index.html");
  })());
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // Réseau d'abord (mises à jour immédiates), cache si hors ligne
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
  } else if (url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com") || url.host === "cdn.jsdelivr.net") {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
  }
});
