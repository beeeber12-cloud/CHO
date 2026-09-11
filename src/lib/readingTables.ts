import {
  READING_JESUS_ENTRIES,
  READING_JESUS_PER_WEEK,
  READING_JESUS_TITLE,
  READING_JESUS_TOTAL_CHAPTERS,
  READING_JESUS_WEEKS,
  ReadingJesusEntry
} from "../data/readingJesus";
import { WTBT_TITLE, WTBT_TOTAL_CHAPTERS, WTBT_WEEKS } from "../data/wtbt";
import {
  buildRjSchedule,
  buildWeeklySchedule,
  RJDay,
  RJSettings,
  WeeklyEntry
} from "./readingJesus";

/**
 * 앱이 아는 **통독표들**.
 *
 * 표는 저마다 다르게 짜여 있지만, 달력에 얹는 일은 한 가지 길로 모은다.
 *
 *  · 리딩지저스 — **날짜별 표**. 270일치가 차례대로 적혀 있어 읽는 날에 하나씩 얹는다.
 *  · 어 성경이 읽어지네 — **주별 표**(52주). 한 주에 읽을 범위만 있고,
 *    그 주 분량을 **그 주의 읽는 날 수로 나누는 일은 앱이 한다**
 *    (월~금이면 하루가 조금 많아지고, 매일 읽으면 가벼워진다).
 */

export type ReadingTableId = "readingJesus" | "wtbt";

export interface ReadingTable {
  id: ReadingTableId;
  /** 설정 화면에 보이는 이름 */
  name: string;
  /** 제목 앞에 붙는 짧은 이름 */
  short: string;
  /** 통독 목표 이름 */
  goalTitle: string;
  /** 표가 짜인 방식 */
  kind: "daily" | "weekly";
  /** 날짜별 표의 순서표 (주별 표는 빈 배열) */
  entries: ReadingJesusEntry[];
  /** 주별 표의 주 목록 (날짜별 표는 빈 배열) */
  weekly: WeeklyEntry[];
  /** 표 전체 주 수 */
  weeks: number;
  /** 한 주에 읽는 날 수 (표가 그렇게 묶여 있을 때) */
  perWeek: number;
  /** 이 표로 읽게 되는 장 수 (겹치는 것은 하나로 센다) */
  totalChapters: number;
}

export const READING_TABLES: Record<ReadingTableId, ReadingTable> = {
  readingJesus: {
    id: "readingJesus",
    name: "리딩지저스 통독표",
    short: "리딩지저스",
    goalTitle: READING_JESUS_TITLE,
    kind: "daily",
    entries: READING_JESUS_ENTRIES,
    weekly: [],
    weeks: READING_JESUS_WEEKS,
    perWeek: READING_JESUS_PER_WEEK,
    totalChapters: READING_JESUS_TOTAL_CHAPTERS
  },
  wtbt: {
    id: "wtbt",
    name: "어 성경이 읽어지네",
    short: "어 성경이 읽어지네",
    goalTitle: WTBT_TITLE,
    kind: "weekly",
    entries: [],
    weekly: WTBT_WEEKS,
    weeks: WTBT_WEEKS.length,
    perWeek: 0,
    totalChapters: WTBT_TOTAL_CHAPTERS
  }
};

export const READING_TABLE_LIST: ReadingTable[] = [
  READING_TABLES.readingJesus,
  READING_TABLES.wtbt
];

/** 모르는 이름이 와도 앱이 멈추지 않게 리딩지저스로 돌려준다 */
export function readingTable(id?: string | null): ReadingTable {
  return READING_TABLES[(id || "") as ReadingTableId] || READING_TABLES.readingJesus;
}

/**
 * 저장된 통독 설정에서 표를 고른다.
 * 통독표를 따르지 않는 방식(한 장씩 · 일반 통독)이면 null 이다.
 */
export function tableIdOf(mode?: string | null): ReadingTableId | null {
  if (mode === "readingJesus") return "readingJesus";
  if (mode === "wtbt") return "wtbt";
  return null;
}

/** 통독표를 따르는 방식인가 (한 장씩 방식이 아닌가) */
export function isTableMode(mode?: string | null): boolean {
  return mode === "readingJesus" || mode === "wtbt";
}

/**
 * 표를 달력에 얹는다 — 어느 표든 여기 하나로 부른다.
 * 주별 표는 그 주 분량을 읽는 날에 나누고, 날짜별 표는 하루치를 하나씩 얹는다.
 */
export function buildTableSchedule(
  table: ReadingTable | null,
  settings: RJSettings | null
): RJDay[] {
  if (!table || !settings) return [];
  return table.kind === "weekly"
    ? buildWeeklySchedule(settings, table.weekly)
    : buildRjSchedule(settings, table.entries);
}

/** 그날이 표에서 어디쯤인지 한 마디로 ("12주 시편") */
export function tableDayLabel(
  _table: ReadingTable,
  _index: number,
  entry?: { week: number; section: string }
): string {
  if (!entry) return "";
  return entry.section ? `${entry.week}주 ${entry.section}` : `${entry.week}주`;
}

/** "12주차 / 52주" */
export function tableProgressLabel(table: ReadingTable, _index: number, week: number): string {
  return week > 0 ? `${week}주차 / ${table.weeks}주` : "";
}
