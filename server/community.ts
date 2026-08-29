/**
 * 공동체(교회·모임) 이름표와 가입코드.
 *
 * 앱 하나를 여러 공동체가 나눠 쓴다. 주소는 같아도 서로의 글은 보이지 않는다.
 * 아파트 정문이 하나여도 옆집 거실이 보이지 않는 것과 같다 —
 * 현관에서 누구인지 확인하고 자기 집으로만 들여보내기 때문이다.
 */
import { randomBytes } from "crypto";

/**
 * 공동체 이름표.
 *
 * 짐작할 수 없게 만든다. 이 값을 알면 그 공동체의 **이름 목록**(로그인 화면)까지는
 * 볼 수 있기 때문이다. 글은 로그인 증표가 있어야 보이지만, 명단도 아무나 훑을 수
 * 있으면 곤란하다. 헷갈리기 쉬운 글자(0/O, 1/l/I)는 뺐다.
 */
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * 가입코드는 **사람이 불러주고 받아 적는다.** 어르신이 많은 곳이라
 * 대문자 6자리로 짧게 하고, 헷갈리는 글자는 아예 쓰지 않는다.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function pick(alphabet: string, length: number): string {
  // Math.random 이 아니라 암호용 난수를 쓴다. 가입코드를 미리 계산할 수 없어야 한다.
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** 새 공동체 이름표 (예: "c-k7m2p9qx") */
export function newCommunityId(): string {
  return "c-" + pick(ID_ALPHABET, 8);
}

/** 새 가입코드 (예: "K7M2PQ") */
export function newJoinCode(): string {
  return pick(CODE_ALPHABET, 6);
}

/** 사람이 입력한 가입코드를 비교할 수 있는 모양으로 다듬는다 */
export function normalizeJoinCode(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

/** 공동체 이름표로 쓸 수 있는 값인지 (Firestore 문서 이름 규칙 포함) */
export function isValidCommunityId(raw: unknown): boolean {
  const id = String(raw ?? "");
  if (!id || id.length > 64) return false;
  if (id.includes("/") || id === "." || id === "..") return false;
  if (/^__.*__$/.test(id)) return false; // Firestore 예약
  return /^[A-Za-z0-9_-]+$/.test(id);
}

/** 공동체 이름 다듬기. 빈 이름이면 null */
export function normalizeCommunityName(raw: unknown): string | null {
  const name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return null;
  return name;
}
