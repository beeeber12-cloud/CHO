/**
 * 초대 링크와 '브라우저로 열기'.
 *
 * 예전에는 새 지체가 앱에 들어오려면 ① 주소를 치고 ② '다른 공동체로 들어가기' 를 눌러
 * ③ 6자리 가입코드를 옮겨 적어야 했다. 어르신께는 이 세 걸음이 너무 멀었다.
 *
 * 이제 초대 링크 하나(`.../?join=코드`)를 누르면 **그 공동체 로그인 화면이 바로** 열린다.
 * 코드는 링크 안에 들어 있고, 앱이 알아서 그 공동체를 기억한 뒤 주소에서 지운다.
 */

import { clearToken, getCommunity, saveCommunity, StoredCommunity } from "./session";

/** 초대 링크에 실려 온 가입코드를 읽는다 (?join=ABC123) */
export function readInviteCode(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("join") || p.get("invite") || "";
    return raw.trim().toUpperCase().slice(0, 12);
  } catch {
    return "";
  }
}

/** 주소창에서 초대 코드를 지운다 (새로고침해도 다시 처리되지 않게) */
function stripInviteFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
  } catch {
    // 무시 — 주소가 조금 지저분해질 뿐이다
  }
}

const INVITED_KEY = "bible_med_invited_name";

/** 초대로 들어오셨다는 표시 (로그인 화면에서 한 번 알려 드린다) */
export function takeInvitedName(): string {
  try {
    const v = sessionStorage.getItem(INVITED_KEY) || "";
    if (v) sessionStorage.removeItem(INVITED_KEY);
    return v;
  } catch {
    return "";
  }
}

/**
 * 초대 링크를 처리한다. 앱을 그리기 **전에** 부른다 —
 * 그래야 로그인 화면이 처음부터 초대받은 공동체로 열린다.
 *
 * 다른 공동체에 로그인해 있었다면 그곳에서는 나온다(자료는 그대로 남는다).
 * 원래 있던 곳은 로그인 화면의 '다른 공동체로 들어가기' 에서 한 번에 돌아갈 수 있다.
 */
export async function applyInviteFromUrl(): Promise<StoredCommunity | null> {
  const code = readInviteCode();
  if (!code) return null;

  try {
    const res = await Promise.race([
      fetch("/api/communities/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code })
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("초대 확인이 늦어집니다")), 6000)
      )
    ]);
    if (!res.ok) return null;

    const c = (await res.json()) as StoredCommunity;
    if (!c?.id) return null;

    const here = getCommunity();
    if (here?.id !== c.id) {
      // 다른 공동체에 로그인돼 있었다면 그 증표를 놓고 간다
      clearToken();
      try {
        localStorage.removeItem("bible_med_user");
      } catch {
        // 무시
      }
    }
    saveCommunity({ id: c.id, name: c.name });
    try {
      sessionStorage.setItem(INVITED_KEY, c.name);
    } catch {
      // 무시
    }
    return c;
  } catch {
    return null;
  } finally {
    stripInviteFromUrl();
  }
}

/* ── 카카오톡 같은 '앱 안의 브라우저' ───────────────────────
   그 안에서는 홈 화면에 설치가 되지 않는다(브라우저만 할 수 있는 일이다).
   그래서 눌러서 바깥 브라우저로 넘어가게 도와 드린다. */

export type InApp = "kakao" | "line" | "instagram" | "facebook" | "naver" | "daum" | "other" | null;

export function inAppBrowser(): InApp {
  try {
    const ua = navigator.userAgent || "";
    if (/KAKAOTALK/i.test(ua)) return "kakao";
    if (/Line\//i.test(ua)) return "line";
    if (/Instagram/i.test(ua)) return "instagram";
    if (/FBAN|FBAV/i.test(ua)) return "facebook";
    if (/NAVER\(inapp/i.test(ua)) return "naver";
    if (/DaumApps/i.test(ua)) return "daum";
    // 웹뷰로 보이지만 어느 앱인지 모르는 경우 (안드로이드 wv)
    if (/; wv\)/i.test(ua)) return "other";
    return null;
  } catch {
    return null;
  }
}

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  } catch {
    return false;
  }
}

export function isIos(): boolean {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * 지금 주소를 **바깥 브라우저**에서 다시 연다.
 *
 * 카카오톡은 자기만 아는 길(kakaotalk://web/openExternal)이 있어 안드로이드·아이폰 모두 열린다.
 * 라인은 주소에 openExternalBrowser=1 만 붙이면 된다.
 * 그 밖의 안드로이드 앱은 크롬을 직접 부른다. 아이폰은 방법이 없어 손으로 하셔야 한다.
 */
export function openInExternalBrowser(): void {
  const app = inAppBrowser();
  const here = window.location.href;

  if (app === "kakao") {
    window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(here);
    return;
  }
  if (app === "line") {
    window.location.href = here + (here.includes("?") ? "&" : "?") + "openExternalBrowser=1";
    return;
  }
  if (!isIos()) {
    // 안드로이드: 크롬으로 넘긴다 (크롬이 없으면 아무 일도 일어나지 않는다)
    const u = new URL(here);
    window.location.href =
      "intent://" + u.host + u.pathname + u.search + "#Intent;scheme=https;package=com.android.chrome;end";
    return;
  }
  // 아이폰의 나머지 앱들 — 안내만 드린다 (화면에서 손으로 여셔야 한다)
}

/** 이 앱 안 브라우저에서 '바깥으로 열기' 버튼이 통하는지 */
export function canOpenExternally(): boolean {
  const app = inAppBrowser();
  if (!app) return false;
  if (app === "kakao" || app === "line") return true;
  return !isIos();
}

/** 손으로 여실 때의 안내 문구 */
export function externalHint(): string {
  const app = inAppBrowser();
  if (app === "kakao") return "안 열리면 오른쪽 아래 ⋮ 를 누르고 '다른 브라우저로 열기' 를 골라주세요.";
  if (isIos()) return "오른쪽 아래 ⋯ 를 누르고 'Safari로 열기' 를 골라주세요.";
  return "안 열리면 오른쪽 위 ⋮ 를 누르고 '다른 브라우저로 열기' 를 골라주세요.";
}
