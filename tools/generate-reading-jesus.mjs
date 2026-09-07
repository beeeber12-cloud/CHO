// 리딩지저스 통독표(JSON) → src/data/readingJesus.ts 를 만드는 도구.
// 통독표가 바뀌면 원본 JSON 경로(SRC)를 고쳐서 `node tools/generate-reading-jesus.mjs` 를 돌린다.
//
// 만들어지는 것은 **날짜 없는 순서표**다. 강해 영상·특별주간·쉬는 날은 전부 빼고
// 읽을 분량이 있는 날만 차례대로 담는다 (270개 = 45주 × 6일).
// 실제 날짜는 앱에서 "시작날 + 읽는 요일 + 방학"으로 그때그때 계산한다.
import fs from "fs";

const SRC = "C:/Users/beeeb/Downloads/reading_jesus_2025.json";
const OUT = "C:/Users/beeeb/Downloads/CHO/src/data/readingJesus.ts";
const BOOKS_TS = "C:/Users/beeeb/Downloads/CHO/src/data/bibleBooks.ts";

/** 한 주에 읽는 날 수 (통독표가 6일씩 묶여 있다) */
const PER_WEEK = 6;

/**
 * 인쇄된 통독표의 오탈자를 바로잡는다 (목사님 확인을 받은 것만 적는다).
 *  · 2025-10-16 "고전13~15" → "고전13~16": 다음 날이 바로 고린도후서라
 *    고린도전서 16장이 한 해 통독에서 통째로 빠져 있었다. (2026-09-07 확인)
 */
const CORRECTIONS = {
  "2025-10-16": "고전13~16"
};

/**
 * 인쇄된 통독표의 주별 제목 (1주부터 차례대로).
 * JSON 의 '편' 이름은 주 단위와 어긋나는 데가 있어서(14주는 '유배기'가 아니라 '역대하')
 * 통독표에 인쇄된 제목을 그대로 적어 둔다.
 */
const WEEK_TITLES = [
  "창세기", "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기·룻기",
  "사무엘상", "사무엘하", "열왕기상", "열왕기하", "역대상", "역대하",
  "에스라·느헤미야·에스더", "욥기",
  "시편", "시편", "시편", "시편", "잠언", "전도서·아가", "이사야", "이사야",
  "예레미야", "예레미야·예레미야애가", "에스겔", "에스겔", "다니엘·호세아",
  "소선지서", "소선지서",
  "복음서", "복음서", "복음서", "복음서", "사도행전", "사도행전", "로마서",
  "바울서신", "바울서신", "바울서신", "일반서신", "일반서신",
  "요한계시록", "요한계시록"
];

// 통독표에 쓰인 줄임말 → 앱이 쓰는 권 이름. bibleBooks.ts 의 shortName 은
// 여호수아·하박국·스바냐가 잘못 들어 있어 여기서 따로 적는다.
const ABBR = [
  ["창", "창세기"], ["출", "출애굽기"], ["레", "레위기"], ["민", "민수기"], ["신", "신명기"],
  ["수", "여호수아"], ["삿", "사사기"], ["룻", "룻기"], ["삼상", "사무엘상"], ["삼하", "사무엘하"],
  ["왕상", "열왕기상"], ["왕하", "열왕기하"], ["대상", "역대상"], ["대하", "역대하"],
  ["스", "에스라"], ["느", "느헤미야"], ["에", "에스더"], ["욥", "욥기"], ["시", "시편"],
  ["잠", "잠언"], ["전", "전도서"], ["아", "아가"], ["사", "이사야"], ["렘", "예레미야"],
  ["애", "예레미야애가"], ["겔", "에스겔"], ["단", "다니엘"], ["호", "호세아"], ["욜", "요엘"],
  ["암", "아모스"], ["옵", "오바댜"], ["욘", "요나"], ["미", "미가"], ["나", "나훔"],
  ["합", "하박국"], ["습", "스바냐"], ["학", "학개"], ["슥", "스가랴"], ["말", "말라기"],
  ["마", "마태복음"], ["막", "마가복음"], ["눅", "누가복음"], ["요", "요한복음"], ["행", "사도행전"],
  ["롬", "로마서"], ["고전", "고린도전서"], ["고후", "고린도후서"], ["갈", "갈라디아서"],
  ["엡", "에베소서"], ["빌", "빌립보서"], ["골", "골로새서"], ["살전", "데살로니가전서"],
  ["살후", "데살로니가후서"], ["딤전", "디모데전서"], ["딤후", "디모데후서"], ["딛", "디도서"],
  ["몬", "빌레몬서"], ["히", "히브리서"], ["약", "야고보서"], ["벧전", "베드로전서"],
  ["벧후", "베드로후서"], ["요일", "요한1서"], ["요이", "요한2서"], ["요삼", "요한3서"],
  ["유", "유다서"], ["계", "요한계시록"]
];
// 통독표에는 "유다서"처럼 권 이름을 그대로 쓴 날도 있다 — 그것도 범위로 읽는다
const SORTED = [...ABBR, ...ABBR.map(([, n]) => [n, n])].sort((a, b) => b[0].length - a[0].length);

const src = fs.readFileSync(BOOKS_TS, "utf8");
const BOOKS = [...src.matchAll(/name:\s*"([^"]+)".*?chapters:\s*(\d+)/g)].map((m) => ({
  name: m[1],
  chapters: Number(m[2])
}));
if (BOOKS.length !== 66) throw new Error("권 수가 66이 아니다: " + BOOKS.length);
const idxOf = (n) => BOOKS.findIndex((b) => b.name === n);

/** "창1" / "딛" / "암3" → { book, chapter|null } */
function parseSide(sRaw) {
  const s = sRaw.trim();
  for (const [ab, name] of SORTED) {
    if (!s.startsWith(ab)) continue;
    const rest = s.slice(ab.length).trim();
    if (rest === "") return { book: name, chapter: null };
    if (/^\d+$/.test(rest)) return { book: name, chapter: Number(rest) };
    return null; // "창세기1" 처럼 뒤에 글자가 붙으면 편 이름이지 범위가 아니다
  }
  return null;
}

/** "창1~4" / "욜1~암3" / "딛~몬" / "계22" → [[권, 시작장, 끝장], …] */
function parseReading(raw) {
  if (!raw) return [];
  const parts = raw.split("~");
  if (parts.length > 2) return [];
  const left = parseSide(parts[0]);
  if (!left) return [];

  let right;
  if (parts.length === 1) {
    right = { book: left.book, chapter: left.chapter };
  } else {
    const r = parts[1].trim();
    if (/^\d+$/.test(r)) right = { book: left.book, chapter: Number(r) };
    else {
      right = parseSide(r);
      if (!right) return [];
    }
  }

  const fi = idxOf(left.book);
  const li = idxOf(right.book);
  if (fi < 0 || li < 0 || li < fi) return [];
  const from = left.chapter ?? 1;
  const to = right.chapter ?? BOOKS[li].chapters;

  const out = [];
  for (let i = fi; i <= li; i++) {
    const b = BOOKS[i];
    const s = i === fi ? from : 1;
    const e = i === li ? to : b.chapters;
    if (s < 1 || e > b.chapters || e < s) return [];
    out.push([b.name, s, e]);
  }
  return out;
}

/** "시편2" → "시편", "이사야b" → "이사야", "일반서신1(히)" → "일반서신" */
function sectionTitle(name) {
  return (name || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/[0-9a-zA-Z]+$/, "").trim();
}

// ── 통독표를 순서표로 옮긴다 ─────────────────────────────────
const plan = JSON.parse(fs.readFileSync(SRC, "utf8"));
const entries = [];
let section = "";
const unparsed = [];

for (const d of plan.days) {
  if (CORRECTIONS[d.date]) {
    console.log(`바로잡음 ${d.date}: ${d.reading} → ${CORRECTIONS[d.date]}`);
    d.reading = CORRECTIONS[d.date];
  }
  // 강해 편이 시작되는 날은 그 편 이름만 알려 준다 (읽을 분량은 없다)
  if (d.isSectionStart && d.sectionName) {
    section = sectionTitle(d.sectionName);
    continue;
  }
  const ranges = parseReading(d.reading);
  if (ranges.length === 0) {
    if (d.reading) unparsed.push(d.reading);
    continue; // 영상만 보는 날·특별주간·쉬는 날은 순서표에 넣지 않는다
  }
  entries.push({ label: d.reading, section, ranges });
}

// ── 검산 ────────────────────────────────────────────────────
const chapterTotal = entries.reduce(
  (n, e) => n + e.ranges.reduce((m, r) => m + (r[2] - r[1] + 1), 0),
  0
);
console.log(`읽는 날 ${entries.length}개 · ${chapterTotal}장`);
if (entries.length % PER_WEEK !== 0) {
  throw new Error(`읽는 날이 ${PER_WEEK} 로 나누어떨어지지 않는다: ${entries.length}`);
}
const weeks = entries.length / PER_WEEK;
console.log(`= ${weeks}주 × ${PER_WEEK}일`);
console.log("범위로 못 읽은 문구:", [...new Set(unparsed)].join(", ") || "(없음)");

// 성경 전체가 빠짐없이, 겹치지 않게 들어갔는지
const have = new Map();
for (const e of entries)
  for (const [b, s, t] of e.ranges)
    for (let c = s; c <= t; c++) {
      const k = `${b} ${c}장`;
      have.set(k, (have.get(k) || 0) + 1);
    }
const all = BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.name} ${i + 1}장`));
const missing = all.filter((k) => !have.has(k));
const dup = [...have].filter(([, v]) => v > 1);
console.log("빠진 장:", missing.join(", ") || "(없음)");
console.log("겹친 장:", dup.map(([k, v]) => `${k}x${v}`).join(", ") || "(없음)");

// 주 제목은 인쇄본을 그대로 쓴다
if (WEEK_TITLES.length !== weeks) {
  throw new Error(`주 제목이 ${WEEK_TITLES.length}개인데 통독표는 ${weeks}주다`);
}
entries.forEach((e, i) => {
  e.section = WEEK_TITLES[Math.floor(i / PER_WEEK)];
});

// 눈으로 맞춰볼 수 있게 전부 찍어 둔다
for (let w = 0; w < weeks; w++) {
  const block = entries.slice(w * PER_WEEK, (w + 1) * PER_WEEK);
  console.log(`${w + 1}주 ${block[0].section}: ${block.map((e) => e.label).join(" | ")}`);
}

// ── 파일로 ──────────────────────────────────────────────────
const lit = (e, i) =>
  `  { week:${Math.floor(i / PER_WEEK) + 1}, section:"${e.section}", label:"${e.label}", ` +
  `ranges:[${e.ranges.map(([b, s, t]) => `["${b}",${s},${t}]`).join(",")}] }`;

const header = `/**
 * 더공감하는교회 리딩지저스(그리스도중심성경읽기) 통독표 — **날짜 없는 순서표**.
 *
 * 교회가 나눠 준 통독표에서 읽을 분량이 있는 날만 차례대로 옮겼다.
 * 강해 영상만 보는 날·특별주간·쉬는 날은 넣지 않았다 — 읽기 순서만 남긴다.
 * 실제 날짜는 공동체가 정한 **시작날 · 읽는 요일 · 방학**으로 앱에서 계산한다
 * (lib/readingJesus.ts 참고).
 *
 * 이 파일은 도구로 만들어졌다. 통독표가 바뀌면 손으로 고치지 말고
 * \`node tools/generate-reading-jesus.mjs\` 로 다시 만들어라.
 */

export interface ReadingJesusEntry {
  /** 몇째 주 (1부터). 통독표가 ${PER_WEEK}일씩 한 주로 묶여 있다 */
  week: number;
  /** 그 주의 편 이름 ("시편", "바울서신") */
  section: string;
  /** 통독표에 적힌 그대로의 문구 ("시 1-6") */
  label: string;
  /** 읽을 범위 [권 이름, 시작 장, 끝 장][] */
  ranges: [string, number, number][];
}

/** 한 주에 읽는 날 수 */
export const READING_JESUS_PER_WEEK = ${PER_WEEK};
/** 통독표 전체 주 수 */
export const READING_JESUS_WEEKS = ${weeks};
/** 통독 목표 이름 — 리딩지저스 모드에서는 이 이름으로 고정된다 */
export const READING_JESUS_TITLE = "리딩지저스 통독";
/** 통독표 전체에서 읽는 장 수 */
export const READING_JESUS_TOTAL_CHAPTERS = ${chapterTotal};

export const READING_JESUS_ENTRIES: ReadingJesusEntry[] = [
`;

fs.writeFileSync(OUT, header + entries.map(lit).join(",\n") + "\n];\n", "utf8");
console.log("wrote", OUT);
