/* Neighbours service worker: keeps the app working on a bad connection and shows push alerts. */
const CACHE = 'neighbours-v4';
const SHELL = ['/', '/index.html', '/app.js', '/styles.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/** Network first so updates arrive at once; the cached copy is used offline or when the network is too slow. */
function networkFirst(req, cacheKey) {
  const fromNetwork = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(cacheKey || req, copy)); }
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000)).then(() => caches.match(cacheKey || req));
  return Promise.race([fromNetwork.catch(() => caches.match(cacheKey || req)), slow.then((hit) => hit || fromNetwork)]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, '/index.html')); return; }
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/vendor/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  event.respondWith(networkFirst(req));
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Neighbours', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Neighbours', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(target).catch(() => {}); return w.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
