// Service Worker for Bible Meditation Share PWA
// 아이콘/매니페스트 갱신 시 버전을 올리면 이전 캐시가 자동 삭제됩니다.
const CACHE_NAME = "bible-meditation-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ── 웹 푸시 수신 ───────────────────────────────────────────
// 앱이 완전히 닫혀 있어도 이 핸들러는 OS 가 깨워서 실행한다.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    data = { title: "말씀나눔", body: e.data ? e.data.text() : "" };
  }

  const title = data.title || "말씀나눔";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // 같은 tag 면 알림이 쌓이지 않고 최신 것으로 대체된다
    tag: data.tag || "default",
    renotify: true,
    data: { url: data.url || "/" }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// 알림을 누르면 이미 열린 탭이 있으면 그 탭으로, 없으면 새로 연다.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});

self.addEventListener("fetch", (e) => {
  // Only handle GET requests and local assets
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Exclude API routes from SW caching to prevent stale DB reads
  if (e.request.url.includes("/api/")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, but fetch fresh in background (Stale-While-Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch((err) => {
        const acceptHeader = e.request.headers.get("accept");
        if (acceptHeader && acceptHeader.includes("text/html")) {
          return caches.match("/");
        }
      });
    })
  );
});
