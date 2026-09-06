import {
  READING_JESUS_DAYS,
  READING_JESUS_TOTAL_CHAPTERS,
  ReadingJesusDay
} from "../data/readingJesus";

/**
 * 리딩지저스 통독표를 날짜에 맞춰 읽는 도구.
 *
 * 통독표는 **52주(364일)를 한 바퀴**로 돌린다. 364는 정확히 52주라서
 * 한 바퀴를 돌아도 요일이 그대로 맞는다 — 주일에 강해 영상이 오고 월~토에 읽는
 * 통독표의 짜임새가 해가 바뀌어도 흐트러지지 않는다.
 *
 * 시작점(anchor)을 정해 두면 "통독표의 이 날부터, 실제로는 이 날에 시작"으로 맞춘다.
 * 관리자가 오늘의 말씀에서 통독표의 한 날을 고르면 그것이 시작점이 된다.
 * 정해 두지 않으면 통독표 첫날(1월 1일)을 그 해 1월 1일에 맞춘 것으로 본다.
 */

/** 한 바퀴 = 52주. 요일이 그대로 맞아떨어지는 길이다 */
export const RJ_CYCLE = 364;

export const RJ_DAYS = READING_JESUS_DAYS;
export const RJ_TOTAL_CHAPTERS = READING_JESUS_TOTAL_CHAPTERS;

/** 통독표에서 시작할 자리 */
export interface RJAnchor {
  /** 통독표의 날짜 ("2025-08-24") */
  planDate: string;
  /** 그 자리를 실제로 시작한 날 ("2026-09-06") */
  startDate: string;
}

export interface RJChapter {
  book: string;
  chapter: number;
  /** 통독 체크에 쓰는 열쇠 ("마가복음 11장") — completedChapters 와 같은 형식 */
  key: string;
}

const MS_DAY = 86400000;

export function rjDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 자정 기준으로만 뺀다 — 시각이 섞이면 하루가 어긋난다 */
function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / MS_DAY);
}

/** 음수도 한 바퀴 안으로 접는다 */
const wrap = (n: number) => ((n % RJ_CYCLE) + RJ_CYCLE) % RJ_CYCLE;

const INDEX_OF_PLAN_DATE = new Map(RJ_DAYS.map((d, i) => [d.date, i]));

export function rjIndexOfPlanDate(planDate: string): number {
  return INDEX_OF_PLAN_DATE.get(planDate) ?? 0;
}

/** 시작점이 제대로 갖춰졌는지 */
export function rjValidAnchor(a?: RJAnchor | null): RJAnchor | null {
  if (!a?.planDate || !a?.startDate) return null;
  if (!INDEX_OF_PLAN_DATE.has(a.planDate) || !parseKey(a.startDate)) return null;
  return a;
}

/** 실제 날짜 → 통독표의 몇 번째 날인지 */
export function rjIndexFor(real: Date, anchor?: RJAnchor | null): number {
  const a = rjValidAnchor(anchor);
  if (a) {
    const start = parseKey(a.startDate)!;
    return wrap(rjIndexOfPlanDate(a.planDate) + daysBetween(start, real));
  }
  // 시작점이 없으면 통독표 첫날을 그 해 1월 1일에 맞춘 것으로 본다
  const first = parseKey(RJ_DAYS[0].date)!;
  return wrap(daysBetween(first, real));
}

export function rjDayAt(index: number): ReadingJesusDay {
  return RJ_DAYS[wrap(index)];
}

export function rjDayFor(real: Date, anchor?: RJAnchor | null): ReadingJesusDay {
  return rjDayAt(rjIndexFor(real, anchor));
}

/** 그날 읽을 장들 */
export function rjChaptersOf(day: ReadingJesusDay | null | undefined): RJChapter[] {
  const out: RJChapter[] = [];
  for (const [book, from, to] of day?.ranges || []) {
    for (let c = from; c <= to; c++) out.push({ book, chapter: c, key: `${book} ${c}장` });
  }
  return out;
}

/** "마가복음 11~16장" / 권이 바뀌면 "요엘 1장 ~ 아모스 3장" */
export function rjRangeLabel(day: ReadingJesusDay | null | undefined): string {
  const ranges = day?.ranges || [];
  if (ranges.length === 0) return "";
  if (ranges.length === 1) {
    const [book, from, to] = ranges[0];
    return from === to ? `${book} ${from}장` : `${book} ${from}~${to}장`;
  }
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  return `${first[0]} ${first[1]}장 ~ ${last[0]} ${last[2]}장`;
}

/** 화면에 한 줄로 적을 문구 — 읽을 분량이 없는 날은 통독표에 적힌 말을 그대로 */
export function rjDayLabel(day: ReadingJesusDay | null | undefined): string {
  if (!day) return "";
  return rjRangeLabel(day) || day.section || day.special || day.label || "쉬는 날";
}

/** 성경 본문을 열 때 쓸 검색어 (그날 첫 장) */
export function rjFirstChapter(day: ReadingJesusDay | null | undefined): RJChapter | null {
  return rjChaptersOf(day)[0] || null;
}

export interface RJWeekRow {
  date: Date;
  dateKey: string;
  /** 0=일 … 6=토 */
  weekday: number;
  index: number;
  day: ReadingJesusDay;
  chapters: RJChapter[];
  /** 그날 읽을 장을 다 읽었는지 (읽을 분량이 없는 날은 false) */
  done: boolean;
  when: "past" | "today" | "future";
}

/** 이번 주 월요일 0시 */
function startOfWeek(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** 이번 주 월~일 — 리딩지저스 모드에서 늘 보여주는 표 */
export function rjWeek(
  today: Date,
  anchor: RJAnchor | null,
  completed: Set<string>
): RJWeekRow[] {
  const monday = startOfWeek(today);
  const todayKey = rjDateKey(today);
  const rows: RJWeekRow[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const index = rjIndexFor(date, anchor);
    const day = rjDayAt(index);
    const chapters = rjChaptersOf(day);
    const key = rjDateKey(date);
    rows.push({
      date,
      dateKey: key,
      weekday: date.getDay(),
      index,
      day,
      chapters,
      done: chapters.length > 0 && chapters.every((c) => completed.has(c.key)),
      when: key === todayKey ? "today" : key < todayKey ? "past" : "future"
    });
  }
  return rows;
}

export interface RJMonth {
  /** 1~12 */
  month: number;
  rows: { index: number; day: ReadingJesusDay }[];
}

/** 통독표 전체를 달별로 (전체 스케줄 확인 / 시작할 날 고르기 팝업) */
export function rjMonths(): RJMonth[] {
  const months: RJMonth[] = [];
  RJ_DAYS.forEach((day, index) => {
    const month = Number(day.date.slice(5, 7));
    let bucket = months[months.length - 1];
    if (!bucket || bucket.month !== month) {
      bucket = { month, rows: [] };
      months.push(bucket);
    }
    bucket.rows.push({ index, day });
  });
  return months;
}

/** "9월 7일" */
export function rjPlanDateLabel(day: ReadingJesusDay): string {
  return `${Number(day.date.slice(5, 7))}월 ${Number(day.date.slice(8, 10))}일`;
}
