/**
 * 말씀 체크 — 형광펜 색.
 *
 * 예전에는 고른 구절을 `#FFFBEE`(거의 흰 크림색)로 칠했다. 본문 흰 바탕과 차이가
 * 거의 없어서 **골랐는지 안 골랐는지 눈에 띄지 않았다.** 형광펜은 눈에 띄라고 칠하는 것이다.
 *
 * 색은 두 가지만 둔다. 더 늘리면 고르는 일이 일이 된다.
 * **파스텔로 눕힌다** — 성경 본문 위에 칠하는 것이라 색이 진하면 글자보다 색이 먼저
 * 눈에 든다. 흰 바탕과는 분명히 다르되, 읽는 것을 방해하지 않을 만큼만.
 *
 * 이 색은 **꾸미기(테마)에 휘둘리지 않는다** — 사람이 직접 고른 색이라
 * 인라인 style 로 칠한다. 테마가 바뀌어도 내가 칠한 곳은 그대로여야 한다.
 */
export type HighlightColor = "yellow" | "green";

export const HIGHLIGHT_COLORS: Record<
  HighlightColor,
  { bg: string; num: string; label: string }
> = {
  yellow: { bg: "#F3E8CC", num: "#7A5600", label: "노랑" },
  green: { bg: "#D6E5DA", num: "#1F6B3A", label: "초록" }
};

export const HIGHLIGHT_ORDER: HighlightColor[] = ["yellow", "green"];

export function isHighlightColor(v: unknown): v is HighlightColor {
  return v === "yellow" || v === "green";
}

const KEY = "verseHighlightColor";

/** 마지막에 고른 색 — 다음에 체크할 때 이 색으로 칠한다 */
export function defaultHighlight(): HighlightColor {
  try {
    const v = localStorage.getItem(KEY);
    return isHighlightColor(v) ? v : "yellow";
  } catch {
    return "yellow";
  }
}

export function setDefaultHighlight(c: HighlightColor): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    // 무시 — 저장이 막힌 기기에서는 그때그때 노랑으로 시작한다
  }
}
