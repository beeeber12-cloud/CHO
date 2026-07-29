/**
 * 웹 푸시 구독 헬퍼.
 *
 * 중요한 제약(교인 안내용):
 *  - 아이폰은 iOS 16.4 이상이면서 "홈 화면에 앱으로 설치"한 경우에만 푸시가 온다.
 *    사파리로 그냥 접속한 상태에서는 애플이 막아둬서 어떤 방법으로도 안 된다.
 *  - 안드로이드/PC 크롬은 설치하지 않아도 동작한다.
 */

export type PushSupport =
  | "ready"          // 바로 켤 수 있음
  | "ios-needs-install" // 아이폰인데 홈 화면 설치가 안 된 상태
  | "unsupported";   // 브라우저가 지원하지 않음

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function checkPushSupport(): PushSupport {
  const hasApi =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!hasApi) {
    // 아이폰은 설치 전에는 PushManager 자체가 없다 → 설치 안내가 맞는 메시지
    return isIos() && !isStandalone() ? "ios-needs-install" : "unsupported";
  }
  if (isIos() && !isStandalone()) return "ios-needs-install";
  return "ready";
}

/** base64url → Uint8Array (VAPID 공개키 변환용) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface EnableResult {
  ok: boolean;
  reason?: "denied" | "unsupported" | "ios-needs-install" | "error";
  message?: string;
}

/** 알림 권한을 받고 서버에 구독을 등록한다. */
export async function enablePush(userId: string): Promise<EnableResult> {
  const support = checkPushSupport();
  if (support === "ios-needs-install") {
    return {
      ok: false,
      reason: "ios-needs-install",
      message:
        "아이폰은 홈 화면에 앱으로 설치해야 알림을 받을 수 있습니다.\n공유 버튼 → '홈 화면에 추가' 후 그 아이콘으로 열어 다시 시도해 주세요."
    };
  }
  if (support === "unsupported") {
    return { ok: false, reason: "unsupported", message: "이 브라우저는 알림을 지원하지 않습니다." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message:
          "알림이 차단되어 있습니다. 브라우저 주소창의 자물쇠(설정) → 알림 → '허용'으로 바꿔 주세요."
      };
    }

    const reg = await navigator.serviceWorker.ready;

    const keyRes = await fetch("/api/push/public-key");
    if (!keyRes.ok) return { ok: false, reason: "error", message: "서버 푸시 설정을 불러오지 못했습니다." };
    const { publicKey } = await keyRes.json();

    // 이미 구독돼 있으면 재사용, 없으면 새로 만든다
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource
      });
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
    const saveRes = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscription: { endpoint: json.endpoint, keys: json.keys },
        userAgent: navigator.userAgent
      })
    });

    if (!saveRes.ok) return { ok: false, reason: "error", message: "구독 저장에 실패했습니다." };
    return { ok: true };
  } catch (err: any) {
    console.error("enablePush failed:", err);
    return { ok: false, reason: "error", message: err?.message || "알림 설정 중 오류가 발생했습니다." };
  }
}

/** 이 기기의 알림을 끈다. */
export async function disablePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint })
    });
    return true;
  } catch (err) {
    console.error("disablePush failed:", err);
    return false;
  }
}

/** 이 기기가 현재 구독 중인지 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    if (checkPushSupport() !== "ready") return false;
    if (Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** 서버에 테스트 푸시 요청 */
export async function sendTestPush(userId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.error || "테스트 발송에 실패했습니다." };
    return { ok: true };
  } catch {
    return { ok: false, message: "서버와 통신하지 못했습니다." };
  }
}
