// Service Worker for Bible Meditation Share PWA
// 아이콘/매니페스트 갱신 시 버전을 올리면 이전 캐시가 자동 삭제됩니다.
const CACHE_NAME = "bible-meditation-v6";
// 성경 본문 전용 캐시 — 내용이 변하지 않으므로 버전을 올려도 지우지 않는다
const BIBLE_CACHE = "bible-text-v1";
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
          // 성경 본문 캐시는 앱 버전이 올라가도 그대로 둔다 (다시 받을 이유가 없다)
          if (key !== CACHE_NAME && key !== BIBLE_CACHE) {
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

// 알림을 누르면 그 글이 있는 화면으로 바로 들어간다.
// 알림에 담긴 주소(예: "/?tab=gratitude")의 tab 값이 열어야 할 화면이다.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";

  let tab = null;
  try {
    tab = new URL(target, self.location.origin).searchParams.get("tab");
  } catch (err) {
    tab = null;
  }

  e.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of list) {
        if (!client.url.startsWith(self.location.origin)) continue;

        let win = client;
        try {
          if ("focus" in client) win = (await client.focus()) || client;
        } catch (err) {}

        // 이미 열려 있던 앱이 응답하면 새로고침 없이 탭만 바꾼다 (훨씬 빠르다).
        // 응답이 없으면(옛 버전이 열려 있는 경우) 주소를 바꿔 다시 띄운다.
        const handled = tab ? await askToOpenTab(win, tab) : false;
        if (!handled) {
          try {
            await win.navigate(target);
          } catch (err) {}
        }
        return;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })()
  );
});

/** 열려 있는 화면에게 "이 탭 열어줘" 하고 0.5초 안에 대답이 오는지 본다. */
function askToOpenTab(client, tab) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => finish(true);
      client.postMessage({ type: "open-tab", tab: tab }, [channel.port2]);
    } catch (err) {
      finish(false);
      return;
    }
    setTimeout(() => finish(false), 500);
  });
}

self.addEventListener("fetch", (e) => {
  // Only handle GET requests and local assets
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // 성경 본문은 절대 바뀌지 않으므로 따로 오래 보관한다.
  // 한 번 읽은 장은 통신 없이 즉시 열리고, 비행기모드·지하철에서도 볼 수 있다.
  if (e.request.url.includes("/api/bible/search")) {
    e.respondWith(
      caches.open(BIBLE_CACHE).then((cache) =>
        cache.match(e.request).then((hit) => {
          if (hit) return hit;
          return fetch(e.request).then((res) => {
            if (res && res.status === 200) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 그 밖의 API 는 캐시하지 않는다 (묵상·댓글은 항상 최신이어야 한다)
  if (e.request.url.includes("/api/")) {
    return;
  }

  // 화면 문서(HTML)는 항상 새로 받아온다.
  // 예전에는 저장해 둔 HTML 을 먼저 보여줘서, 앱을 새로 배포해도
  // 옛 화면이 계속 보이고 여러 번 껐다 켜야 반영되는 문제가 있었다.
  // (HTML 이 옛것이면 그 안에 적힌 옛 파일들을 계속 불러오게 된다)
  const isDocument =
    e.request.mode === "navigate" ||
    (e.request.destination === "document") ||
    e.request.headers.get("accept")?.includes("text/html");

  if (isDocument) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        // 오프라인이면 저장해 둔 화면으로 대신한다
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/index.html")))
    );
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
