import {
  READING_JESUS_ENTRIES,
  READING_JESUS_PER_WEEK,
  READING_JESUS_TITLE,
  READING_JESUS_WEEKS,
  ReadingJesusEntry
} from "../data/readingJesus";
import { WTBT_120, WTBT_240, WTBT_TITLE, WtbtEntry } from "../data/wtbt";

/**
 * 앱이 아는 **통독표들**.
 *
 * 통독표는 저마다 다르지만 쓰임새는 같다 — 날짜 없는 순서표이고,
 * 공동체가 정한 시작날·읽는 요일·방학으로 달력에 얹힌다(lib/readingJesus.ts).
 * 그래서 표만 갈아 끼우면 나머지는 그대로 돈다.
 *
 *  · readingJesus — 더공감하는교회 리딩지저스 (45주 × 6일)
 *  · wtbt120 · wtbt240 — 성경이 읽어지네 (120일치 · 240일치)
 */

export type ReadingTableId = "readingJesus" | "wtbt120" | "wtbt240";

export interface ReadingTable {
  id: ReadingTableId;
  /** 설정 화면에 보이는 이름 ("어 성경이 읽어지네 120일") */
  name: string;
  /** 오늘의 말씀 제목 앞에 붙는 짧은 이름 ("성경이 읽어지네") */
  short: string;
  /** 통독 목표 이름 */
  goalTitle: string;
  entries: ReadingJesusEntry[];
  /** 한 주에 읽는 날 수 (표가 그렇게 묶여 있을 때) */
  perWeek: number;
  totalDays: number;
  /** 표 자체가 주로 묶여 있을 때의 주 수 (날짜별 표는 0 — 달력으로 센다) */
  weeks: number;
  /** 이 표로 읽게 되는 장 수 (같은 장을 두 번 읽어도 하나로 센다) */
  totalChapters: number;
}

/**
 * '성경이 읽어지네' 표를 리딩지저스와 같은 모양으로 맞춘다.
 *
 * 그쪽 표에는 **'주' 가 없다** — 날짜별로만 적혀 있다.
 * 없는 주를 지어내지 않는다(week: 0). 전체 스케줄은 **달력으로** 묶는다
 * (rjWeekBlocksByDate) — 읽는 요일을 월~금으로 잡으면 한 주에 5일이 들어간다.
 */
function fromWtbt(list: WtbtEntry[]): ReadingJesusEntry[] {
  return list.map((e) => ({
    week: 0,
    section: e.ranges[0]?.[0] || "성경",
    label: e.label,
    ranges: e.ranges
  }));
}

/** 같은 장을 여러 번 읽는 표도 있으므로(복음서 나란히 읽기) 겹치는 것은 하나로 센다 */
function uniqueChapters(entries: ReadingJesusEntry[]): number {
  const seen = new Set<string>();
  for (const e of entries) {
    for (const [book, from, to] of e.ranges) {
      for (let c = from; c <= to; c++) seen.add(`${book} ${c}`);
    }
  }
  return seen.size;
}

function table(
  id: ReadingTableId,
  name: string,
  short: string,
  goalTitle: string,
  entries: ReadingJesusEntry[],
  perWeek: number,
  weeks: number
): ReadingTable {
  return {
    id,
    name,
    short,
    goalTitle,
    entries,
    perWeek,
    totalDays: entries.length,
    weeks,
    totalChapters: uniqueChapters(entries)
  };
}

const WTBT_120_ENTRIES = fromWtbt(WTBT_120);
const WTBT_240_ENTRIES = fromWtbt(WTBT_240);

export const READING_TABLES: Record<ReadingTableId, ReadingTable> = {
  readingJesus: table(
    "readingJesus",
    "리딩지저스 통독표",
    "리딩지저스",
    READING_JESUS_TITLE,
    READING_JESUS_ENTRIES,
    READING_JESUS_PER_WEEK,
    READING_JESUS_WEEKS
  ),
  wtbt120: table(
    "wtbt120",
    "어 성경이 읽어지네 120일",
    "어 성경이 읽어지네",
    `${WTBT_TITLE} 120일`,
    WTBT_120_ENTRIES,
    6,
    0
  ),
  wtbt240: table(
    "wtbt240",
    "어 성경이 읽어지네 240일",
    "어 성경이 읽어지네",
    `${WTBT_TITLE} 240일`,
    WTBT_240_ENTRIES,
    6,
    0
  )
};

export const READING_TABLE_LIST: ReadingTable[] = [
  READING_TABLES.readingJesus,
  READING_TABLES.wtbt120,
  READING_TABLES.wtbt240
];

/** 모르는 이름이 와도 앱이 멈추지 않게 리딩지저스로 돌려준다 */
export function readingTable(id?: string | null): ReadingTable {
  return READING_TABLES[(id || "") as ReadingTableId] || READING_TABLES.readingJesus;
}

/**
 * 저장된 통독 설정에서 표를 고른다.
 *
 * 예전 자료에는 `mode: "readingJesus"` 만 있고 표 이름이 없다 — 그때는 리딩지저스다.
 * '성경이 읽어지네' 는 `mode: "wtbt"` 와 `wtbtLength`(120·240)로 적힌다.
 */
export function tableIdOf(mode?: string | null, wtbtLength?: number | null): ReadingTableId | null {
  if (mode === "readingJesus") return "readingJesus";
  if (mode === "wtbt") return wtbtLength === 240 ? "wtbt240" : "wtbt120";
  return null;
}

/**
 * 그날이 표에서 어디쯤인지 한 마디로.
 * 리딩지저스는 주 단위로 묶여 있어 "12주 시편", 날짜별 표는 "34일차" 가 자연스럽다.
 */
export function tableDayLabel(table: ReadingTable, index: number, entry?: { week: number; section: string }): string {
  if (table.id === "readingJesus" && entry) return `${entry.week}주 ${entry.section}`;
  return `${index + 1}일차${entry?.section ? ` · ${entry.section}` : ""}`;
}

/** "12주차 / 45주" · "34일차 / 120일" */
export function tableProgressLabel(table: ReadingTable, index: number, week: number): string {
  if (table.id === "readingJesus") return week > 0 ? `${week}주차 / ${table.weeks}주` : "";
  return index >= 0 ? `${index + 1}일차 / ${table.totalDays}일` : "";
}

/** 통독표를 따르는 방식인가 (한 장씩 방식이 아닌가) */
export function isTableMode(mode?: string | null): boolean {
  return mode === "readingJesus" || mode === "wtbt";
}
