/* Service worker: l'app funziona offline dopo la prima visita. Cambia VERSION quando pubblichi modifiche. */
const VERSION = 'sg-v2';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/data.js', 'js/figures.js', 'js/store.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.hostname.endsWith('supabase.co')) return;            // le chiamate al database vanno sempre in rete
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); } return res; }).catch(() => hit);
    return hit || net;                                          // cache first, aggiorna in background
  }));
});
