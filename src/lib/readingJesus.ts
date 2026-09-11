import {
  READING_JESUS_ENTRIES,
  READING_JESUS_PER_WEEK,
  READING_JESUS_TOTAL_CHAPTERS,
  READING_JESUS_WEEKS,
  ReadingJesusEntry
} from "../data/readingJesus";

/**
 * 리딩지저스 통독표를 달력에 얹는다.
 *
 * 통독표 자체에는 날짜가 없다 — **읽는 순서만** 있다(270개 = 45주 × 6일).
 * 공동체가 아래 세 가지를 정하면 그 순서가 날짜에 차례대로 얹힌다.
 *
 *   ① 시작날     — 공동체마다 다르다
 *   ② 읽는 요일  — 월~금만, 월~토만, 또는 정한 요일만
 *   ③ 방학       — 그 기간은 통째로 건너뛴다 (뒤가 그만큼 밀린다)
 *
 * 하루를 못 읽어도 계획이 앞당겨지거나 밀리지 않는다. 통독표 순서와 날짜는
 * 이 세 가지로만 정해지므로, 공동체 전체가 늘 같은 날 같은 본문을 본다.
 */

export const RJ_ENTRIES = READING_JESUS_ENTRIES;
export const RJ_PER_WEEK = READING_JESUS_PER_WEEK;
export const RJ_WEEKS = READING_JESUS_WEEKS;
export const RJ_TOTAL_CHAPTERS = READING_JESUS_TOTAL_CHAPTERS;
export const RJ_TOTAL_DAYS = READING_JESUS_ENTRIES.length;

export const RJ_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
/** 통독표가 6일씩 묶여 있으니 월~토가 기본이다 */
export const RJ_DEFAULT_READING_DAYS = [1, 2, 3, 4, 5, 6];

/** 쉬는 기간 (방학·특별주간). 양쪽 끝 날짜를 포함한다 */
export interface RJBreak {
  from: string;
  to: string;
  label?: string;
}

/** 공동체가 정하는 통독 일정 */
export interface RJSettings {
  /** 통독을 시작하는 날 ("2026-09-14") */
  startDate: string;
  /** 읽는 요일 (0=일 … 6=토) */
  readingDays: number[];
  /** 쉬는 기간들 */
  breaks: RJBreak[];
}

export interface RJChapter {
  book: string;
  chapter: number;
  /** 통독 체크에 쓰는 열쇠 ("마가복음 11장") — completedChapters 와 같은 형식 */
  key: string;
}

/** 통독표 한 줄이 실제 날짜에 얹힌 것 */
export interface RJDay {
  /** 통독표 순서 (0부터) */
  index: number;
  entry: ReadingJesusEntry;
  date: Date;
  dateKey: string;
  chapters: RJChapter[];
}

// ── 날짜 도구 ────────────────────────────────────────────────

export function rjDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function rjParseDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026년 9월 14일 (월)" */
export function rjDateLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${RJ_DAY_LABELS[d.getDay()]})`;
}

/** "9월 14일" */
export function rjShortDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 설정 ─────────────────────────────────────────────────────

/** 설정이 쓸 만한지 보고, 빠진 곳은 기본값으로 채운다 */
export function rjNormalizeSettings(raw?: Partial<RJSettings> | null): RJSettings | null {
  const start = rjParseDate(raw?.startDate || "");
  if (!start) return null;

  const days = Array.from(
    new Set((raw?.readingDays || RJ_DEFAULT_READING_DAYS).map(Number))
  )
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0) return null;

  const breaks = (raw?.breaks || [])
    .filter((b) => b && rjParseDate(b.from) && rjParseDate(b.to))
    // 거꾸로 적었어도 알아서 바로잡는다
    .map((b) => (b.from <= b.to ? b : { ...b, from: b.to, to: b.from }))
    .sort((a, b) => a.from.localeCompare(b.from));

  return { startDate: rjDateKey(start), readingDays: days, breaks };
}

/** 그날이 쉬는 기간에 들어 있으면 그 기간을 돌려준다 */
export function rjBreakOn(settings: RJSettings | null, dateKey: string): RJBreak | null {
  if (!settings) return null;
  return settings.breaks.find((b) => b.from <= dateKey && dateKey <= b.to) || null;
}

// ── 통독표를 달력에 얹기 ─────────────────────────────────────

/** 하루씩 걸어가다 끝없이 돌지 않도록 하는 울타리 (270일치를 다 얹기엔 넉넉하다) */
const MAX_SPAN_DAYS = 4000;

/**
 * 통독표를 실제 날짜에 차례대로 얹는다.
 * 읽는 요일이 아니거나 방학인 날은 건너뛴다.
 *
 * 표를 주지 않으면 리딩지저스 표를 쓴다 — '성경이 읽어지네' 같은 다른 표는
 * 그 표의 순서표를 넘겨 주면 된다 (lib/readingTables.ts).
 */
export function buildRjSchedule(
  settings: RJSettings | null,
  entries: ReadingJesusEntry[] = RJ_ENTRIES
): RJDay[] {
  const start = settings && rjParseDate(settings.startDate);
  if (!settings || !start) return [];

  const out: RJDay[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  for (let step = 0; step < MAX_SPAN_DAYS && out.length < entries.length; step++) {
    const key = rjDateKey(cursor);
    if (settings.readingDays.includes(cursor.getDay()) && !rjBreakOn(settings, key)) {
      const entry = entries[out.length];
      out.push({
        index: out.length,
        entry,
        date: new Date(cursor),
        dateKey: key,
        chapters: rjChaptersOf(entry)
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** 날짜로 그날의 통독표를 찾는다 (읽는 날이 아니면 null) */
export function rjDayOn(schedule: RJDay[], dateKey: string): RJDay | null {
  return schedule.find((d) => d.dateKey === dateKey) || null;
}

/** 아직 안 읽은 첫 날 (다 읽었으면 null) */
export function rjNextUnread(schedule: RJDay[], completed: Set<string>): RJDay | null {
  return schedule.find((d) => !d.chapters.every((c) => completed.has(c.key))) || null;
}

// ── 읽을 범위 ────────────────────────────────────────────────

export function rjChaptersOf(entry: ReadingJesusEntry | null | undefined): RJChapter[] {
  const out: RJChapter[] = [];
  for (const [book, from, to] of entry?.ranges || []) {
    for (let c = from; c <= to; c++) out.push({ book, chapter: c, key: `${book} ${c}장` });
  }
  return out;
}

/** "마가복음 11~16장" / 권이 바뀌면 "요엘 1장 ~ 아모스 3장" */
export function rjRangeLabel(entry: ReadingJesusEntry | null | undefined): string {
  const ranges = entry?.ranges || [];
  if (ranges.length === 0) return "";
  if (ranges.length === 1) {
    const [book, from, to] = ranges[0];
    return from === to ? `${book} ${from}장` : `${book} ${from}~${to}장`;
  }
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  return `${first[0]} ${first[1]}장 ~ ${last[0]} ${last[2]}장`;
}

// ── 이번 주 표 ───────────────────────────────────────────────

/** 읽는 날이 아닌 칸에 무엇이라고 적을지 */
export type RJRestReason = "break" | "off" | "before" | "after";

export interface RJWeekRow {
  date: Date;
  dateKey: string;
  /** 0=일 … 6=토 */
  weekday: number;
  when: "past" | "today" | "future";
  /** 그날 읽을 통독표 (읽는 날이 아니면 null) */
  day: RJDay | null;
  /** 읽는 날이 아닐 때 그 까닭 */
  rest: RJRestReason | null;
  /** 쉬는 기간이면 그 이름 */
  restLabel?: string;
  done: boolean;
}

/** 그 주의 월요일 0시 */
function startOfWeek(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** 이번 주 월~일 */
export function rjWeekRows(
  schedule: RJDay[],
  settings: RJSettings | null,
  today: Date,
  completed: Set<string>
): RJWeekRow[] {
  const monday = startOfWeek(today);
  const todayKey = rjDateKey(today);
  const first = schedule[0]?.dateKey;
  const last = schedule[schedule.length - 1]?.dateKey;

  const rows: RJWeekRow[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = rjDateKey(date);
    const day = rjDayOn(schedule, key);

    let rest: RJRestReason | null = null;
    let restLabel: string | undefined;
    if (!day) {
      const br = rjBreakOn(settings, key);
      if (br) {
        rest = "break";
        restLabel = br.label;
      } else if (first && key < first) rest = "before";
      else if (last && key > last) rest = "after";
      else rest = "off";
    }

    rows.push({
      date,
      dateKey: key,
      weekday: date.getDay(),
      when: key === todayKey ? "today" : key < todayKey ? "past" : "future",
      day,
      rest,
      restLabel,
      done: !!day && day.chapters.every((c) => completed.has(c.key))
    });
  }
  return rows;
}

/** 읽는 날이 아닌 칸에 적을 말 */
export function rjRestText(row: RJWeekRow): string {
  switch (row.rest) {
    case "break":
      return row.restLabel || "쉬는 기간";
    case "before":
      return "통독 시작 전";
    case "after":
      return "통독 마침";
    default:
      return "쉬는 날";
  }
}

// ── 전체 스케줄 ──────────────────────────────────────────────

export interface RJWeekBlock {
  /** 1부터 */
  week: number;
  /** 그 주의 제목 ("시편") */
  section: string;
  days: RJDay[];
}

/** 통독표 전체를 주별로 묶는다 (전체 스케줄 팝업) */
export function rjWeekBlocks(schedule: RJDay[]): RJWeekBlock[] {
  const blocks: RJWeekBlock[] = [];
  for (const day of schedule) {
    let bucket = blocks[blocks.length - 1];
    if (!bucket || bucket.week !== day.entry.week) {
      bucket = { week: day.entry.week, section: day.entry.section, days: [] };
      blocks.push(bucket);
    }
    bucket.days.push(day);
  }
  return blocks;
}

/** 통독표를 마치는 날 */
export function rjFinishDate(schedule: RJDay[]): Date | null {
  return schedule[schedule.length - 1]?.date || null;
}

/** 자주 쓰는 읽는 요일 묶음 */
export const RJ_DAY_PRESETS = [
  { label: "월~금", days: [1, 2, 3, 4, 5] },
  { label: "월~토", days: [1, 2, 3, 4, 5, 6] },
  { label: "월~일 (매일)", days: [0, 1, 2, 3, 4, 5, 6] }
] as const;
