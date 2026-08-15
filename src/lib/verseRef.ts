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
 * 옛 묵상 글은 성경 구절과 묵상이 한 덩어리로 저장돼 있다.
 * 앞머리의 "3 본문..." 줄들을 갈라내어 따로 보여줄 수 있게 한다.
 *
 * 구절을 넣을 때 "본문\n\n묵상" 형태로 넣었으므로,
 * **숫자 줄 뒤에 빈 줄이 오는 경우만** 성경으로 본다.
 * 이 조건이 없으면 "3 가지 은혜를 받았습니다" 같은 첫 줄을 성경으로 잘못 볼 수 있다.
 */
export function splitLeadingVerses(content: string): { quote: string; body: string } {
  const text = content || "";
  const lines = text.split("\n");

  let i = 0;
  while (i < lines.length && /^\s*\d+\s+\S/.test(lines[i])) i++;
  if (i === 0) return { quote: "", body: text };

  // 숫자 줄로만 끝났거나, 바로 뒤가 빈 줄일 때만 성경으로 인정한다
  const endsHere = i === lines.length;
  const blankAfter = !endsHere && lines[i].trim() === "";
  if (!endsHere && !blankAfter) return { quote: "", body: text };

  return {
    quote: lines.slice(0, i).join("\n").trim(),
    body: lines.slice(i).join("\n").trim()
  };
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
