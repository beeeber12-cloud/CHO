/**
 * 로그인 증표와 공동체 기억.
 *
 * 예전에는 "내가 관리자다" 라고 적어 보내면 서버가 그대로 믿었다.
 * 회원 목록은 로그인 없이도 볼 수 있으니, 관리자 ID 만 알면
 * 남의 계정을 지우거나 비밀번호를 바꿀 수 있는 상태였다.
 * 이제 그런 요청에는 로그인할 때 받은 증표를 함께 보낸다.
 *
 * 공동체(교회·모임)도 여기에 기억해 둔다. 처음 한 번 가입코드를 넣으면
 * 그 뒤로는 이 기기가 알아서 기억하므로, 어르신들은 예전처럼
 * **이름 누르고 비밀번호 4자리**만 하시면 된다.
 */

const TOKEN_KEY = "bible_med_token";
const COMMUNITY_KEY = "bible_med_community";

export interface StoredCommunity {
  id: string;
  name: string;
}

export function saveToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 앱은 계속 돌아가야 한다
  }
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 무시
  }
}

// ── 공동체 기억 ────────────────────────────────────────────

export function saveCommunity(c: StoredCommunity): void {
  try {
    if (c?.id) localStorage.setItem(COMMUNITY_KEY, JSON.stringify(c));
  } catch {
    // 무시
  }
}

export function getCommunity(): StoredCommunity | null {
  try {
    const raw = localStorage.getItem(COMMUNITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCommunity(): void {
  try {
    localStorage.removeItem(COMMUNITY_KEY);
  } catch {
    // 무시
  }
}

/**
 * 앱이 서버에 보내는 모든 요청에 **증표와 공동체 표시를 자동으로 붙인다.**
 *
 * 화면 곳곳에서 fetch 를 백 군데 넘게 쓰고 있어서, 한 곳만 빠뜨려도
 * 그 요청이 엉뚱한 공동체로 간다. 한 자리에서 붙이면 빠뜨릴 곳이 없다.
 *
 * ⚠️ 공동체 표시는 어디까지나 **참고용**이다. 서버는 로그인한 요청이라면
 *    증표 안에 서명돼 있는 공동체만 믿는다. 이 머리말을 바꿔 보내도
 *    남의 공동체 글은 나오지 않는다. (server.ts 의 cidOf 주석 참고)
 */
export function installApiInterceptor(): void {
  const w = window as any;
  if (w.__choApiInterceptorInstalled) return;
  w.__choApiInterceptorInstalled = true;

  const original = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else if (input && typeof (input as Request).url === "string") url = (input as Request).url;

    // 우리 서버의 /api 요청에만 붙인다. 성경 CDN 등 바깥 요청은 건드리지 않는다.
    const isOurApi = url.startsWith("/api/") || url.includes(window.location.origin + "/api/");
    if (!isOurApi) return original(input as any, init);

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token = getToken();
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    const community = getCommunity();
    if (community && !headers.has("x-community")) headers.set("x-community", community.id);

    return original(input as any, { ...init, headers });
  };
}

/**
 * 증표를 붙여서 보내는 fetch.
 * 위 interceptor 가 이미 붙여 주지만, 예전부터 이걸 쓰던 자리를 그대로 두기 위해 남긴다.
 */
export function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
