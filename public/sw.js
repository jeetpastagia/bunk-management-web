// Minimal app service worker — its only job is to exist and pass requests
// straight through, which is what qualifies the site as an installable PWA
// on Chrome/Edge/Android ("Add to Home Screen" / desktop install icon). It
// deliberately does no caching, so users always get the live API/site
// content — no stale-build surprises to debug later.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)));
