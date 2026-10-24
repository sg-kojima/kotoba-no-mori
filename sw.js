// オフライン用の Service Worker
// アプリ本体と courses.json に載っている教材をすべて端末に保存する。
// 教材JSONを追加したら courses.json に載せるだけでよい（ここを書き換える必要はない）。
// アプリ本体（html/css/js）を更新したら VERSION を上げる。
const VERSION = 'v1.0.0';
const CACHE = 'kotobanomori-' + VERSION;
const FONT_CACHE = 'kotobanomori-fonts';

const SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'mofurun.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'data/courses.json'
];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const res = await cache.match('data/courses.json');
  const { courses } = await res.json();
  const files = courses.flatMap(c => c.lessons.map(l => 'data/' + l.file));
  await cache.addAll(files);
}

self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('kotobanomori-') && k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts：一度読んだ文字データを保存しておく
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // ページ遷移：オフラインでも index.html を返す
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  // 教材：手元の版をすぐ返し、裏で新しい版を取りに行く
  if (url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  event.respondWith(cacheFirst(req, CACHE));
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') (await caches.open(name)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || update;
}
