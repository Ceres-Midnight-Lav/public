// 点呼 ・ 海 — Service Worker
//
// Android(Chrome) にアプリとして認めてもらうために必要なのと、
// もうひとつ大事な役目がある。電波が無くても開けるようにすること。
//
// 海の底では電話は繋がらない。それでも、最後に確かめた事実は手元に残る。

const CACHE = "tenko-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 点呼の結果は、まず取りに行く。届かなければ最後に持ち帰った分を出す
  if (url.pathname.endsWith("status.json")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./status.json", copy));
          return res;
        })
        .catch(() => caches.match("./status.json"))
    );
    return;
  }

  // それ以外は手元のものをすぐ出しつつ、裏で新しいものを取ってくる
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
