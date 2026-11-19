/* 见己 PWA · Service Worker
   策略：stale-while-revalidate —— 先给缓存（秒开/离线可用），后台悄悄更新；
   以后上传新版文件后，用户下次或再下次打开即自动拿到新版，无需清缓存。 */

var CACHE = 'jianji-v3';
var CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './store.js',
  './content.js',
  './report.js',
  './ai.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return cached || (req.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error());
      });
      return cached || network;
    })
  );
});
