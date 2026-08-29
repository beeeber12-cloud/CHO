/**
 * 비밀번호 보관과 로그인 확인.
 *
 * 예전에는 4자리 PIN 이 그대로 저장돼 있었다. DB 를 한 번 들여다본 사람은
 * 전 교인의 비밀번호를 그대로 손에 넣을 수 있었다.
 * 이제는 되돌릴 수 없는 형태(scrypt)로만 저장한다. 서버조차 원래 PIN 을 알 수 없다.
 *
 * scrypt 는 Node 에 기본으로 들어 있어 따로 설치할 것이 없다.
 * 일부러 느리게 계산되므로(수십 ms) 만 번을 대입해 보는 공격이 현실적으로 어려워진다.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";

const SCRYPT_PREFIX = "scrypt$";

/** 저장용 해시를 만든다 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(String(pin), salt, 32);
  return `${SCRYPT_PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** 이미 해시로 바뀐 값인지 */
export function isHashed(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith(SCRYPT_PREFIX);
}

/**
 * 입력한 PIN 이 맞는지 확인한다.
 * 아직 해시로 안 바뀐 옛 값(평문)도 받아준다 — 그래야 옮겨가는 동안 아무도 못 들어오는 일이 없다.
 */
export function verifyPin(pin: string, stored: string): boolean {
  if (!pin || !stored) return false;
  const input = String(pin).trim();

  if (!isHashed(stored)) {
    // 옛 평문 값. 길이가 달라도 시간차로 새어나가지 않게 길이부터 맞춰 비교한다.
    const a = Buffer.from(input);
    const b = Buffer.from(String(stored).trim());
    return a.length === b.length && timingSafeEqual(a, b);
  }

  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(input, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ── 로그인 시도 제한 ──────────────────────────────────
// 네 자리는 만 번이면 다 열린다. 사람이 손으로 치는 속도로는 넉넉하되,
// 기계가 계속 두드리는 것은 막히는 선으로 잡았다. (어르신 오타를 고려해 여유 있게)

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

interface Attempt {
  count: number;
  firstAt: number;
}
const attempts = new Map<string, Attempt>();

/** 지금 시도해도 되는지. 막혀 있으면 남은 시간(분)을 함께 돌려준다. */
export function checkLoginAllowed(key: string): { allowed: boolean; retryAfterMin?: number } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec) return { allowed: true };

  if (now - rec.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true };
  }
  if (rec.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMin: Math.ceil((WINDOW_MS - (now - rec.firstAt)) / 60000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  rec.count++;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

// ── 로그인 증표(토큰) ─────────────────────────────────
// 예전에는 "내가 관리자다" 라는 말을 그대로 믿었다. 회원 목록은 누구나 볼 수 있으니
// 관리자 ID 를 적어 보내는 것만으로 남의 계정을 지우거나 비밀번호를 바꿀 수 있었다.
// 이제는 로그인할 때 발급한 증표가 있어야만 그런 일을 할 수 있다.

const TOKEN_DAYS = 180; // 어르신들이 자주 로그인하지 않아도 되도록 길게 잡는다

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export interface TokenPayload {
  uid: string;
  role: "admin" | "member";
  /**
   * 어느 공동체 사람인지.
   *
   * ⚠️ 이 값이 **격리의 핵심**이다. 앱이 보낸 값으로 공동체를 정하면
   *    남의 공동체 이름을 적어 보내 그 교회 묵상을 들여다볼 수 있다.
   *    그래서 로그인할 때 서명해서 넣고, 그 뒤로는 이것만 믿는다.
   *
   * 이 값이 생기기 전에 발급된 증표에는 없다. 그런 증표는 기본 공동체로 본다
   * (앱을 갱신하지 않은 분들이 갑자기 로그아웃되지 않게).
   */
  cid?: string;
  exp: number;
}

export function issueToken(
  secret: string,
  uid: string,
  role: "admin" | "member",
  cid: string
): string {
  const payload: TokenPayload = {
    uid,
    role,
    cid,
    exp: Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

/** 증표가 우리 서버가 발급한 것이고 아직 유효한지 확인한다 */
export function verifyToken(secret: string, token: string): TokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as TokenPayload;
    if (!payload?.uid || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
