// Gravstein-service-worker: appen bodde tidligere på roten. Denne avregistrerer
// den gamle installasjonen, tømmer gamle cacher og laster klientene på nytt,
// slik at eksisterende hjemskjerm-installasjoner får ny struktur (/app/).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
