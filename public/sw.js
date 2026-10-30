const CACHE = 'daily-atlas-shell-v2';

// App 外壳：安装时预缓存，保证「没网也能点开」而不是等首次加载后才可用
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
      )
      .catch(() => {
        /* 单个资源失败不阻断安装，运行时缓存会补上 */
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(res) {
  return (
    res &&
    res.status === 200 &&
    (res.type === 'basic' || res.type === 'default' || res.type === 'cors')
  );
}

function putInCache(req, res) {
  const clone = res.clone();
  caches
    .open(CACHE)
    .then((cache) => cache.put(req, clone))
    .catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 数据库接口只走网络：数据必须实时，失败交给页面层提示重试，绝不回退到过期数据
  if (url.pathname.startsWith('/api/')) return;

  // 页面导航：网络优先（保证拿到最新版本），离线时回退到已缓存的 App 外壳
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isCacheable(res)) putInCache(req, res);
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // 静态资源（带 hash 的 js/css、图标、字体）：缓存优先 + 后台刷新，秒开且离线可用
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (isCacheable(res)) putInCache(req, res);
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
