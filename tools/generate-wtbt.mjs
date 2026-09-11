// '어 성경이 읽어지네' 통독표(JSON) → src/data/wtbt.ts 를 만드는 도구.
// 통독표가 바뀌면 tools/data/wtbt.json 을 고치고 `node tools/generate-wtbt.mjs` 를 돌린다.
//
// 이 표는 **주 단위**다 (52주). 하루치로 나누는 일은 앱이 한다 —
// 공동체가 정한 시작날·읽는 요일·쉬는 기간에 따라 한 주 분량을 그 주의 읽는 날에 고르게 나눈다
// (lib/readingJesus.ts 의 buildWeeklySchedule).
//
// 도구가 하는 일은 둘이다.
//   ① 성경에 없는 장을 가리키는지 본다 (bibleBooks.ts 의 장 수와 맞춰 본다)
//   ② **한 번도 안 읽고 지나가는 곳**을 알려 준다 — 통독표의 빈 구멍은 눈에 잘 띄지 않는다
import fs from "fs";
import path from "path";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
  ".."
);
const SRC = path.join(ROOT, "tools/data/wtbt.json");
const OUT = path.join(ROOT, "src/data/wtbt.ts");
const BOOKS_TS = path.join(ROOT, "src/data/bibleBooks.ts");

function loadBooks() {
  const src = fs.readFileSync(BOOKS_TS, "utf8");
  const books = [];
  for (const m of src.matchAll(/name:\s*"([^"]+)"[^}]*chapters:\s*(\d+)/g)) {
    books.push({ name: m[1], chapters: Number(m[2]) });
  }
  if (books.length !== 66) throw new Error(`성경 권을 66권이 아니라 ${books.length}권 읽었습니다`);
  return books;
}

const BOOKS = loadBooks();
const CHAPTERS = new Map(BOOKS.map((b) => [b.name, b.chapters]));

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));
const weeks = raw.weeks;

/* ① 성경에 없는 곳을 가리키지 않는지 */
const problems = [];
for (const w of weeks) {
  for (const [book, from, to] of w.ranges) {
    const last = CHAPTERS.get(book);
    if (!last) problems.push(`${w.week}주: 모르는 권 "${book}"`);
    else if (from < 1 || to < from) problems.push(`${w.week}주: 범위가 거꾸로 "${book} ${from}-${to}"`);
    else if (to > last) problems.push(`${w.week}주: ${book}는 ${last}장까지인데 "${from}-${to}장"`);
  }
}

/* ② 한 번도 안 읽고 지나가는 곳 */
const read = new Set();
for (const w of weeks) {
  for (const [book, from, to] of w.ranges) {
    for (let c = from; c <= to; c++) read.add(`${book} ${c}`);
  }
}
const missing = [];
for (const b of BOOKS) {
  let runFrom = 0;
  for (let c = 1; c <= b.chapters + 1; c++) {
    const has = c <= b.chapters && read.has(`${b.name} ${c}`);
    if (!has && runFrom === 0) runFrom = c;
    if (has && runFrom > 0) {
      missing.push(runFrom === c - 1 ? `${b.name} ${runFrom}장` : `${b.name} ${runFrom}~${c - 1}장`);
      runFrom = 0;
    }
  }
  if (runFrom > 0 && runFrom <= b.chapters) {
    missing.push(runFrom === b.chapters ? `${b.name} ${runFrom}장` : `${b.name} ${runFrom}~${b.chapters}장`);
  }
}

/** "창세기 1~11장 · 욥기 1~20장" */
function label(ranges) {
  return ranges.map(([b, f, t]) => (f === t ? `${b} ${f}장` : `${b} ${f}~${t}장`)).join(" · ");
}

const totalChapters = read.size;
const perWeek = weeks.map((w) => w.ranges.reduce((s, [, f, t]) => s + (t - f + 1), 0));

const out = `/**
 * '어 성경이 읽어지네' 통독표 — **주 단위 52주표**.
 *
 * 연대기 흐름을 따라 한 주에 읽을 범위가 정해져 있다.
 * **하루치로 나누는 일은 앱이 한다** — 공동체가 정한 시작날·읽는 요일·쉬는 기간에 따라
 * 그 주 분량을 그 주의 읽는 날에 고르게 나눈다 (lib/readingJesus.ts 의 buildWeeklySchedule).
 * 그래서 월~금이면 하루 분량이 조금 많아지고, 매일 읽으면 조금 가벼워진다.
 *
 * 이 파일은 도구로 만들어졌다. 손으로 고치지 말고
 * \`node tools/generate-wtbt.mjs\` 로 다시 만들어라 (원본: tools/data/wtbt.json).
 */

export interface WtbtWeek {
  /** 몇째 주 (1부터) */
  week: number;
  /** 그 주에 읽을 범위 [권 이름, 시작 장, 끝 장][] */
  ranges: [string, number, number][];
  /** 통독표에 적힌 그대로의 문구 ("창세기 1~11장 · 욥기 1~20장") */
  label: string;
}

/** 통독 목표 이름 */
export const WTBT_TITLE = "어 성경이 읽어지네 통독";
/** 이 표로 읽게 되는 장 수 (겹치는 것은 하나로 셌다) */
export const WTBT_TOTAL_CHAPTERS = ${totalChapters};

export const WTBT_WEEKS: WtbtWeek[] = [
${weeks
  .map(
    (w) =>
      `  { week: ${w.week}, ranges: [${w.ranges
        .map(([b, f, t]) => `["${b}",${f},${t}]`)
        .join(",")}], label: ${JSON.stringify(label(w.ranges))} }`
  )
  .join(",\n")}
];
`;

fs.writeFileSync(OUT, out, "utf8");

console.log(`만듦: ${OUT}`);
console.log(`  ${weeks.length}주 · 읽는 장 수 ${totalChapters} (성경 전체 1189장)`);
console.log(`  한 주 분량 ${Math.min(...perWeek)}~${Math.max(...perWeek)}장`);

if (problems.length) {
  console.log(`\n⚠ 성경에 없는 곳 ${problems.length}군데:`);
  for (const p of problems) console.log("  · " + p);
} else {
  console.log("\n성경에 없는 곳: 없음");
}

if (missing.length) {
  console.log(`\n⚠ 이 표로는 한 번도 안 읽고 지나가는 곳 (${1189 - totalChapters}장):`);
  for (const m of missing) console.log("  · " + m);
}
