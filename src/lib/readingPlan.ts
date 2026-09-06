import { BIBLE_BOOKS, BibleBookInfo } from "../data/bibleBooks";
import { UserBibleProgress } from "../types";

/**
 * 통독 주간 계획.
 *
 * "구약을 하루 3장씩, 월~금" 이라고 정해 두면 이번 주 요일마다 읽을 범위를 뽑아 준다.
 *
 * 핵심은 **밀려도 당겨서 보여준다**는 것.
 * 화요일을 못 읽고 수요일에 열면, 달력대로면 7~9장이겠지만 아직 안 읽은 4~6장을 보여준다.
 * 지난 요일 칸은 지어내지 않는다 — 그날 실제로 읽은 기록(readLog)만 보여준다.
 */

export type PlanScope = "all" | "OT" | "NT";

export interface PlanChapter {
  book: BibleBookInfo;
  chapter: number;
  /** 통독 체크에 쓰는 열쇠 ("창세기 1장") — completedChapters 와 같은 형식 */
  key: string;
}

export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
export const DEFAULT_READING_DAYS = [1, 2, 3, 4, 5];

/** 예전 자료에는 planScope 가 없다. 목표 장 수로 미루어 짐작한다. */
export function scopeOf(progress: UserBibleProgress | null | undefined): PlanScope {
  if (progress?.planScope) return progress.planScope;
  const t = progress?.targetChapters;
  if (t === 260) return "NT";
  if (t === 929) return "OT";
  return "all";
}

export function readingDaysOf(progress: UserBibleProgress | null | undefined): number[] {
  const d = progress?.readingDays;
  return d && d.length > 0 ? [...d].sort((a, b) => a - b) : DEFAULT_READING_DAYS;
}

/** 그 범위에서 통독을 시작할 권 (정해둔 것이 없으면 첫 권) */
export function startBookOf(progress: UserBibleProgress | null | undefined): string {
  const scope = scopeOf(progress);
  const books = BIBLE_BOOKS.filter((b) => scope === "all" || b.testament === scope);
  const picked = progress?.planStartBook;
  if (picked && books.some((b) => b.name === picked)) return picked;
  return books[0]?.name || "창세기";
}

/**
 * 정한 범위의 장을 성경 순서대로 늘어놓는다 (창 1장 → … → 계 22장).
 * startBook 을 주면 그 권부터 시작한다 — 앞쪽 권은 이번 통독에 넣지 않는다.
 */
export function planSequence(scope: PlanScope, startBook?: string): PlanChapter[] {
  let books = BIBLE_BOOKS.filter((b) => scope === "all" || b.testament === scope);
  if (startBook) {
    const from = books.findIndex((b) => b.name === startBook);
    if (from > 0) books = books.slice(from);
  }
  const out: PlanChapter[] = [];
  for (const book of books) {
    for (let c = 1; c <= book.chapters; c++) {
      out.push({ book, chapter: c, key: `${book.name} ${c}장` });
    }
  }
  return out;
}

/** "창세기 1~3장" / 권이 바뀌면 "창세기 50장 ~ 출애굽기 2장" */
export function rangeLabel(chapters: PlanChapter[]): string {
  if (chapters.length === 0) return "";
  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  if (first.book.name === last.book.name) {
    return first.chapter === last.chapter
      ? `${first.book.name} ${first.chapter}장`
      : `${first.book.name} ${first.chapter}~${last.chapter}장`;
  }
  return `${first.book.name} ${first.chapter}장 ~ ${last.book.name} ${last.chapter}장`;
}

/** 그 주의 월요일 0시 */
function startOfWeek(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shift = (d.getDay() + 6) % 7; // 월요일을 주의 시작으로
  d.setDate(d.getDate() - shift);
  return d;
}

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface PlanRow {
  /** 0=일 … 6=토 */
  weekday: number;
  label: string;
  date: Date;
  dateKey: string;
  when: "past" | "today" | "future";
  /** 이 칸에서 읽을(또는 읽은) 장들. 다 읽어서 남은 게 없으면 빈 배열 */
  chapters: PlanChapter[];
  /** 그 장들을 전부 읽었는지 */
  done: boolean;
}

export interface WeeklyPlan {
  rows: PlanRow[];
  /** 계획을 다 마쳤는지 (더 읽을 장이 없음) */
  finished: boolean;
  /** 이번 주에 읽기로 한 날 수 */
  totalDays: number;
  /** 그중 실제로 읽은 날 수 */
  doneDays: number;
}

/**
 * 이번 주 계획을 만든다.
 *
 * - 지난 요일: 그날 실제로 읽은 장(readLog)을 그대로 보여준다. 없으면 빈 칸.
 * - 오늘과 앞으로의 요일: **아직 안 읽은 장**부터 하루 분량씩 차례로 채운다.
 *   그래서 하루 밀리면 다음 날 칸이 저절로 당겨진다.
 */
export function buildWeeklyPlan(
  progress: UserBibleProgress | null | undefined,
  today: Date = new Date()
): WeeklyPlan {
  const scope = scopeOf(progress);
  const days = readingDaysOf(progress);
  const perDay = Math.max(1, Number(progress?.dailyTarget) || 3);
  const sequence = planSequence(scope, startBookOf(progress));
  const completed = new Set(progress?.completedChapters || []);
  const readLog = progress?.readLog || {};

  const indexOfKey = new Map(sequence.map((c, i) => [c.key, i]));
  /** n 번째 하루치 (0부터). 하루 3장이면 0 = 1~3장, 1 = 4~6장 … */
  const blockAt = (n: number) => sequence.slice(n * perDay, n * perDay + perDay);
  const totalBlocks = Math.ceil(sequence.length / perDay);

  /** 아직 다 읽지 않은 첫 하루치 */
  let firstUnreadBlock = totalBlocks;
  for (let n = 0; n < totalBlocks; n++) {
    if (!blockAt(n).every((c) => completed.has(c.key))) {
      firstUnreadBlock = n;
      break;
    }
  }

  const monday = startOfWeek(today);
  const todayKey = dateKey(today);

  // 이번 주에 읽은 장이 있으면, 그중 가장 앞선 하루치를 이번 주의 시작점으로 삼는다.
  // 이렇게 해야 월요일 몫을 읽어도 월요일 칸이 그대로 있고 화·수가 밀려 나가지 않는다.
  let anchorBlock = firstUnreadBlock;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    for (const key of readLog[dateKey(d)] || []) {
      const idx = indexOfKey.get(key);
      if (idx == null) continue;
      anchorBlock = Math.min(anchorBlock, Math.floor(idx / perDay));
    }
  }

  const rows: PlanRow[] = [];
  let slot = 0;

  /**
   * 이번 주(월~일) 중 읽기로 정한 요일에 하루치를 **차례대로** 놓는다.
   * 하루 3장이면 월 1~3장, 화 4~6장, 수 7~9장 — 중간에 하루를 건너뛰어도 이 순서는 그대로다.
   * 읽었는지 여부는 색으로만 구별한다 (읽은 날은 진하게, 아직 안 읽은 날은 연하게).
   */
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const weekday = date.getDay();
    if (!days.includes(weekday)) continue;

    const key = dateKey(date);
    const when: PlanRow["when"] =
      key === todayKey ? "today" : key < todayKey ? "past" : "future";

    const chapters = blockAt(anchorBlock + slot);
    slot += 1;

    rows.push({
      weekday,
      label: DAY_LABELS[weekday],
      date,
      dateKey: key,
      when,
      chapters,
      done: chapters.length > 0 && chapters.every((c) => completed.has(c.key))
    });
  }

  return {
    rows,
    finished: firstUnreadBlock >= totalBlocks,
    totalDays: rows.length,
    doneDays: rows.filter((r) => r.done).length
  };
}
