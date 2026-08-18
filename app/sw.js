// Cache-først med oppdatering i bakgrunnen: appen virker uten nett i
// klasserommet, og nye versjoner hentes stille neste gang det er nett.
const VERSION = 'klasserommet-v7';

const ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'fonts/InterVariable.woff2',
  'manifest.webmanifest',
  'js/app.js',
  'js/store.js',
  'js/engine.js',
  'js/ui.js',
  'js/fag.js',
  'js/views/verktoy.js',
  'js/views/kart.js',
  'js/views/grupper.js',
  'js/views/trekker.js',
  'js/views/timer.js',
  'js/views/timeplan.js',
  'js/views/aktiviteter.js',
  'js/views/klasser.js',
  'icons/favicon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
