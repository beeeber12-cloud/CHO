/**
 * 로그인 증표 보관과 사용.
 *
 * 예전에는 "내가 관리자다" 라고 적어 보내면 서버가 그대로 믿었다.
 * 회원 목록은 로그인 없이도 볼 수 있으니, 관리자 ID 만 알면
 * 남의 계정을 지우거나 비밀번호를 바꿀 수 있는 상태였다.
 * 이제 그런 요청에는 로그인할 때 받은 증표를 함께 보낸다.
 */

const TOKEN_KEY = "bible_med_token";

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

/**
 * 증표를 붙여서 보내는 fetch.
 * 보통 요청은 그냥 fetch 를 쓰고, 권한이 필요한 요청에만 이걸 쓴다.
 */
export function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
