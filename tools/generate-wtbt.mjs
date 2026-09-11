// '성경이 읽어지네' 통독표(JSON) → src/data/wtbt.ts 를 만드는 도구.
// 통독표가 바뀌면 tools/data/wtbt.json 을 고치고 `node tools/generate-wtbt.mjs` 를 돌린다.
//
// 리딩지저스와 같은 모양의 **날짜 없는 순서표**를 만든다 (120일치 / 240일치).
// 실제 날짜는 앱에서 "시작날 + 읽는 요일 + 방학" 으로 그때그때 계산한다.
//
// 통독표는 사람이 읽는 글이라 "민수기 20장 14절-28장" 처럼 절까지 적힌 곳이 있다.
// 앱의 통독 체크는 **장 단위**이므로, 절은 그 절이 든 장으로 넉넉히 잡는다
// (읽을 범위가 줄지 않도록 시작은 내림, 끝은 그 장까지).
import fs from "fs";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const SRC = path.join(ROOT, "tools/data/wtbt.json");
const OUT = path.join(ROOT, "src/data/wtbt.ts");
const BOOKS_TS = path.join(ROOT, "src/data/bibleBooks.ts");

/** 성경 권 이름 → 장 수 (bibleBooks.ts 를 그대로 읽어 쓴다) */
function loadBooks() {
  const src = fs.readFileSync(BOOKS_TS, "utf8");
  const books = [];
  for (const m of src.matchAll(/name:\s*"([^"]+)"[^}]*chapters:\s*(\d+)/g)) {
    books.push({ name: m[1], chapters: Number(m[2]) });
  }
  if (books.length !== 66) throw new Error(`성경 권을 66권이 아니라 ${books.length}권 읽었습니다`);
  return books;
}

/**
 * 인쇄된 통독표의 오탈자를 바로잡는다 (2026-09-11 목사님 확인).
 *
 * 앞뒤 대목으로 무엇이 맞는지 분명한 것만 적는다.
 * 열쇠는 "<표>/<일차>/<원문 그대로>", 값은 바로잡은 문구다.
 * 되돌리려면 해당 줄만 지우고 다시 돌리면 된다.
 */
const CORRECTIONS = {
  // 요시야·나훔 시대 대목이라 열왕기하다 (열왕기상은 22장까지뿐이다)
  "120/46/열왕기상 1-8장": "열왕기하 1-8장",
  "120/49/열왕기상 14장": "열왕기하 14장",
  "120/50/열왕기상 15:1-12": "열왕기하 15:1-12",
  "120/51/열왕기상 15:13-20장": "열왕기하 15:13-20장",
  "120/55/열왕기상 21:1-18": "열왕기하 21:1-18",
  "120/58/열왕기상 21:19-23:30": "열왕기하 21:19-23:30",
  // 예레미야는 52장까지다
  "120/64/예레미야 13장, 22:20-30, 23-24장, 29-31장, 27-28장, 49:34-39, 50-64장":
    "예레미야 13장, 22:20-30, 23-24장, 29-31장, 27-28장, 49:34-39, 50-52장",
  // 사도행전 18:23 (8:23 은 빌립과 시몬 대목이라 앞뒤가 맞지 않는다)
  "120/106/사도행전 8:23-19:22": "사도행전 18:23-19:22",
  "240/205/사도행전 8:23-14장": "사도행전 18:23-19:22",
  // 사울이 죽은 뒤라 사무엘하다
  "240/58/사무엘상 1:1-2:11": "사무엘하 1:1-2:11",
  // 앞뒤가 모두 시편이다 (사무엘하는 24장까지뿐이다)
  "240/59/사무엘하 21-25장": "시편 21-25편",
  "240/60/사무엘하 26-30장": "시편 26-30편",
  "240/65/사무엘하 46-50장": "시편 46-50편",
  // 오바댜는 1장뿐이다
  "240/85/오바댜 1-3장": "오바댜 1장",
  // 앞뒤가 모두 시편이다 (역대상은 29장까지뿐이다)
  "240/140/역대상 79-84장": "시편 79-84편",
  // 120일치 97일차와 같은 대목이라 마태복음이다
  "240/179/마가복음 4:13-9:17": "마태복음 4:13-9:17",
  // 요한1서 대목이다 (요엘은 3장까지뿐이다)
  "240/234/요엘 1-5장": "요한1서 1-5장"
};

const BOOKS = loadBooks();
const CHAPTERS = new Map(BOOKS.map((b) => [b.name, b.chapters]));

/** 통독표에 쓰인 줄임말 → 정식 이름 */
const ALIASES = {
  "살전": "데살로니가전서",
  "살후": "데살로니가후서",
  "고전": "고린도전서",
  "고후": "고린도후서",
  "딤전": "디모데전서",
  "딤후": "디모데후서",
  "요일": "요한1서",
  "요한일서": "요한1서",
  "요한이서": "요한2서",
  "요한삼서": "요한3서",
  "요이": "요한2서",
  "요삼": "요한3서",
  "계": "요한계시록"
};

/** 긴 이름부터 맞춰 본다 ('요한복음' 이 '요한일서' 보다 먼저 걸리지 않도록) */
const NAMES = [...BOOKS.map((b) => b.name), ...Object.keys(ALIASES)].sort((a, b) => b.length - a.length);

function bookAt(text) {
  const t = text.trimStart();
  for (const name of NAMES) {
    if (t.startsWith(name)) {
      return { book: ALIASES[name] || name, rest: t.slice(name.length).trimStart() };
    }
  }
  return null;
}

/** "4:12", "14a", "9장", "13" → 장 번호 (절만 적힌 것은 null) */
function chapterOf(token) {
  const t = token.trim();
  const colon = t.match(/^(\d+)\s*:\s*\d+/);
  if (colon) return { chapter: Number(colon[1]), hadVerse: true };
  const plain = t.match(/^(\d+)/);
  if (!plain) return null;
  const marked = /[장편]/.test(t);
  return { chapter: Number(plain[1]), hadVerse: false, marked };
}

/**
 * 한 덩어리("창세기 1-9장", "시편 1-2, 4, 6, 8-17편")를 [권, 시작장, 끝장][] 로.
 * 앞에서 나온 권을 뒤 칸이 물려받는다 ("시편 1-2, 4" → 둘 다 시편).
 */
function parseReading(text, carriedBook) {
  const ranges = [];
  const problems = [];
  let book = carriedBook;

  const head = bookAt(text);
  let body = text.trim();
  if (head) {
    book = head.book;
    body = head.rest;
  }
  if (!book) {
    problems.push(`권 이름을 찾지 못함: "${text}"`);
    return { ranges, problems, book: carriedBook };
  }

  for (const rawPart of body.split(",")) {
    let part = rawPart.trim();
    if (!part) continue;

    // 이 칸이 새 권으로 시작하면 권을 갈아탄다
    const inner = bookAt(part);
    if (inner) {
      book = inner.book;
      part = inner.rest;
      if (!part) {
        // "오바댜 1장" 처럼 권만 남은 경우는 없지만, 있으면 1장으로 본다
        ranges.push([book, 1, 1]);
        continue;
      }
    }

    // "사무엘상 25장-사무엘하 2:11" 처럼 권을 건너뛰는 범위
    const dash = part.split(/\s*[-~]\s*/);
    const left = dash[0];
    const right = dash.length > 1 ? dash.slice(1).join("-") : null;

    const a = chapterOf(left);
    if (!a) {
      problems.push(`장을 읽지 못함: "${book} ${part}"`);
      continue;
    }

    if (right) {
      const rightBook = bookAt(right);
      if (rightBook) {
        // 권이 바뀌는 범위 — 앞 권은 끝까지, 뒤 권은 1장부터
        const b = chapterOf(rightBook.rest);
        const lastOfA = CHAPTERS.get(book);
        if (!lastOfA) problems.push(`모르는 권: "${book}"`);
        else ranges.push([book, a.chapter, lastOfA]);
        if (b && CHAPTERS.get(rightBook.book)) ranges.push([rightBook.book, 1, b.chapter]);
        else problems.push(`끝을 읽지 못함: "${right}"`);
        book = rightBook.book;
        continue;
      }

      const b = chapterOf(right);
      if (!b) {
        problems.push(`끝을 읽지 못함: "${book} ${part}"`);
        continue;
      }
      /*
        앞이 절까지 적혀 있고(3:1) 뒤가 그냥 숫자(14)면 그건 **같은 장의 절**이다.
        "마가복음 1:1-14a" 는 1장 안에서 끝난다. 뒤에 장/편 표시나 콜론이 있으면 장이다.
      */
      const endIsVerse = a.hadVerse && !b.hadVerse && !b.marked;
      ranges.push([book, a.chapter, endIsVerse ? a.chapter : b.chapter]);
    } else {
      ranges.push([book, a.chapter, a.chapter]);
    }
  }

  return { ranges, problems, book };
}

/** 성경에 없는 장을 가리키는지 본다 */
function validate(ranges, where) {
  const problems = [];
  for (const [book, from, to] of ranges) {
    const last = CHAPTERS.get(book);
    if (!last) {
      problems.push(`${where}: 모르는 권 "${book}"`);
      continue;
    }
    if (from < 1 || to < from) problems.push(`${where}: 범위가 거꾸로 "${book} ${from}-${to}"`);
    if (to > last) problems.push(`${where}: ${book}는 ${last}장까지인데 "${from}-${to}장"`);
  }
  return problems;
}

function build(list, name) {
  const entries = [];
  const problems = [];
  const fixed = [];

  for (const row of list) {
    const ranges = [];
    let book = null;
    for (const raw of row.reading) {
      const key = `${name}/${row.day}/${raw}`;
      const reading = CORRECTIONS[key] || raw;
      if (CORRECTIONS[key]) fixed.push(`${name} ${row.day}일차: "${raw}" → "${reading}"`);
      const r = parseReading(reading, book);
      ranges.push(...r.ranges);
      book = r.book;
      problems.push(...r.problems.map((p) => `${name} ${row.day}일차 — ${p}`));
    }
    problems.push(...validate(ranges, `${name} ${row.day}일차`));

    entries.push({
      day: row.day,
      label: row.reading.map((t) => CORRECTIONS[`${name}/${row.day}/${t}`] || t).join(" · "),
      ranges
    });
  }

  return { entries, problems, fixed };
}

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));
const d120 = build(raw.schedules["120_days"], "120");
const d240 = build(raw.schedules["240_days"], "240");

const countChapters = (entries) =>
  entries.reduce((sum, e) => sum + e.ranges.reduce((s, [, a, b]) => s + (b - a + 1), 0), 0);

const fmt = (entries) =>
  entries
    .map(
      (e) =>
        `  { day:${e.day}, label:${JSON.stringify(e.label)}, ranges:[${e.ranges
          .map(([b, f, t]) => `["${b}",${f},${t}]`)
          .join(",")}] }`
    )
    .join(",\n");

const out = `/**
 * '성경이 읽어지네' 통독표 — **날짜 없는 순서표** (120일치 · 240일치).
 *
 * 실제 날짜는 공동체가 정한 **시작날 · 읽는 요일 · 방학**으로 앱에서 계산한다
 * (lib/readingJesus.ts 의 달력 얹기를 그대로 쓴다).
 *
 * 통독표는 사람이 읽는 글이라 절까지 적힌 곳이 있는데, 앱의 통독 체크는 장 단위라
 * 절은 그 절이 든 장으로 넉넉히 잡았다. 화면에는 통독표에 적힌 문구(label)를 그대로 쓴다.
 *
 * 이 파일은 도구로 만들어졌다. 손으로 고치지 말고
 * \`node tools/generate-wtbt.mjs\` 로 다시 만들어라 (원본: tools/data/wtbt.json).
 */

export interface WtbtEntry {
  /** 통독표의 몇째 날 (1부터) */
  day: number;
  /** 통독표에 적힌 그대로의 문구 ("창세기 1-9장") */
  label: string;
  /** 읽을 범위 [권 이름, 시작 장, 끝 장][] */
  ranges: [string, number, number][];
}

/** 통독 목표 이름 — 이 모드에서는 이 이름으로 고정된다 */
export const WTBT_TITLE = "어 성경이 읽어지네 통독";

export const WTBT_120: WtbtEntry[] = [
${fmt(d120.entries)}
];

export const WTBT_240: WtbtEntry[] = [
${fmt(d240.entries)}
];

/** 120일 / 240일 — 공동체가 고른다 */
export type WtbtLength = 120 | 240;

export function wtbtEntries(length: WtbtLength): WtbtEntry[] {
  return length === 240 ? WTBT_240 : WTBT_120;
}
`;

fs.writeFileSync(OUT, out, "utf8");

console.log(`만듦: ${OUT}`);
console.log(`  120일치 ${d120.entries.length}일 · 읽는 장 수 ${countChapters(d120.entries)}`);
console.log(`  240일치 ${d240.entries.length}일 · 읽는 장 수 ${countChapters(d240.entries)}`);

const fixedAll = [...d120.fixed, ...d240.fixed];
if (fixedAll.length) {
  console.log(`\n바로잡은 곳 ${fixedAll.length}군데 (목사님 확인):`);
  for (const f of fixedAll) console.log("  · " + f);
}

const problems = [...d120.problems, ...d240.problems];
if (problems.length) {
  console.log(`\n⚠ 통독표에서 이상한 곳 ${problems.length}군데 — 목사님 확인이 필요합니다:`);
  for (const p of problems) console.log("  · " + p);
} else {
  console.log("\n이상한 곳 없음.");
}
