/**
 * 고른 절의 구절명을 만드는 곳.
 *
 * 예전에는 장을 떼고 "마가복음 3,5절" 처럼 만들었는데,
 * 이러면 어느 장인지 알 수 없을 뿐 아니라 나중에 다시 읽을 때
 * **3장**으로 잘못 해석된다. 장은 반드시 남긴다.
 */

/** "요한복음 3:16", "마가복음 1장 5절" 등에서 장까지만 남긴다 */
export function chapterRefOf(reference: string): string {
  const ref = (reference || "").trim();
  if (!ref) return ref;

  // "요한복음 3:16", "요한복음 3:16-20" 형태
  const colon = ref.match(/^(.+?)\s+(\d+):\d+/);
  if (colon) {
    const book = colon[1].trim();
    return `${book} ${colon[2]}${book === "시편" ? "편" : "장"}`;
  }

  // 이미 "마가복음 1장" / "시편 23편" 이면 그대로,
  // 뒤에 절 표기가 붙어 있으면("마가복음 1장 3,5절") 그것만 떼어낸다.
  return ref.replace(/\s*[\d,\s~\-]+절\s*$/, "").trim();
}

/**
 * 장을 포함한 구절명을 만든다.
 * 예) ("마가복음 1장", ["5","3"]) -> "마가복음 1장 3,5절"
 * 고른 절이 없으면 원래 구절명을 그대로 돌려준다.
 */
export function buildVerseReference(
  reference: string,
  verseNumbers: Iterable<string | number>
): string {
  const nums = [...verseNumbers]
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (nums.length === 0) return reference;
  return `${chapterRefOf(reference)} ${nums.join(",")}절`;
}
