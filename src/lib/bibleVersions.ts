/**
 * 성경 번역본 선택 (공용).
 *
 * 규칙: 한 번에 최대 두 개까지만 고를 수 있다.
 * 하나면 그 번역본만, 두 개면 위아래로 대조해서 본다.
 * 세 번째를 누르면 먼저 고른 것이 빠지고 새 것이 들어온다.
 */

export type BibleVersionKey = "krv" | "wm" | "niv";

export interface BibleVersionInfo {
  key: BibleVersionKey;
  /** 화면에 보이는 짧은 이름 */
  label: string;
  /** 본문 색 — 대조할 때 두 번역본을 구분한다 */
  color: string;
}

export const BIBLE_VERSIONS: BibleVersionInfo[] = [
  { key: "krv", label: "개역개정", color: "#333333" },
  { key: "wm", label: "우리말", color: "#2F5D50" },
  { key: "niv", label: "NIV", color: "#8A6642" },
];

export const MAX_COMPARE = 2;

const STORAGE_KEY = "bibleVersions";

export function loadSelectedVersions(): BibleVersionKey[] {
  if (typeof window === "undefined") return ["krv"];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = Array.isArray(parsed)
        ? parsed.filter((k: string) => BIBLE_VERSIONS.some((v) => v.key === k)).slice(0, MAX_COMPARE)
        : [];
      if (valid.length > 0) return valid as BibleVersionKey[];
    }
    // 예전 설정("krv" | "niv" | "both") 이 남아 있으면 옮겨준다
    const legacy = window.localStorage.getItem("bibleVersion");
    if (legacy === "niv") return ["niv"];
    if (legacy === "both") return ["krv", "niv"];
  } catch {
    /* 저장소를 못 쓰는 환경이면 기본값 */
  }
  return ["krv"];
}

export function saveSelectedVersions(keys: BibleVersionKey[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_COMPARE)));
  } catch {
    /* 저장 실패는 무시 — 화면 동작에는 영향이 없다 */
  }
}

/**
 * 번역본을 눌렀을 때의 다음 선택 상태.
 * - 이미 골라둔 것을 다시 누르면 뺀다 (단, 마지막 하나는 남긴다)
 * - 두 개가 찬 상태에서 새로 누르면 먼저 고른 것을 밀어낸다
 */
export function toggleVersion(current: BibleVersionKey[], key: BibleVersionKey): BibleVersionKey[] {
  if (current.includes(key)) {
    const next = current.filter((k) => k !== key);
    return next.length === 0 ? current : next; // 최소 하나는 보여야 한다
  }
  if (current.length < MAX_COMPARE) return [...current, key];
  return [current[current.length - 1], key];
}

/** 개역개정 외에 서버에서 더 받아와야 하는 번역본 (요청 크기를 줄이기 위함) */
export function versionsQueryParam(keys: BibleVersionKey[]): string {
  return keys.filter((k) => k !== "krv").join(",");
}
