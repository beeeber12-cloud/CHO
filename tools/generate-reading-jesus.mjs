// 리딩지저스 통독표(JSON) → src/data/readingJesus.ts 를 만드는 도구.
// 통독표가 바뀌면 원본 JSON 경로(SRC)를 고쳐서 `node tools/generate-reading-jesus.mjs` 를 돌린다.
import fs from "fs";

const SRC = "C:/Users/beeeb/Downloads/reading_jesus_2025.json";
const OUT = "C:/Users/beeeb/Downloads/CHO/src/data/readingJesus.ts";

// 통독표에 쓰인 줄임말 → 앱이 쓰는 권 이름. bibleBooks.ts 의 shortName 은
// 여호수아·하박국·스바냐가 잘못 들어 있어 여기서 따로 적는다.
const ABBR = [
  ["창","창세기"],["출","출애굽기"],["레","레위기"],["민","민수기"],["신","신명기"],
  ["수","여호수아"],["삿","사사기"],["룻","룻기"],["삼상","사무엘상"],["삼하","사무엘하"],
  ["왕상","열왕기상"],["왕하","열왕기하"],["대상","역대상"],["대하","역대하"],
  ["스","에스라"],["느","느헤미야"],["에","에스더"],["욥","욥기"],["시","시편"],
  ["잠","잠언"],["전","전도서"],["아","아가"],["사","이사야"],["렘","예레미야"],
  ["애","예레미야애가"],["겔","에스겔"],["단","다니엘"],["호","호세아"],["욜","요엘"],
  ["암","아모스"],["옵","오바댜"],["욘","요나"],["미","미가"],["나","나훔"],
  ["합","하박국"],["습","스바냐"],["학","학개"],["슥","스가랴"],["말","말라기"],
  ["마","마태복음"],["막","마가복음"],["눅","누가복음"],["요","요한복음"],["행","사도행전"],
  ["롬","로마서"],["고전","고린도전서"],["고후","고린도후서"],["갈","갈라디아서"],
  ["엡","에베소서"],["빌","빌립보서"],["골","골로새서"],["살전","데살로니가전서"],
  ["살후","데살로니가후서"],["딤전","디모데전서"],["딤후","디모데후서"],["딛","디도서"],
  ["몬","빌레몬서"],["히","히브리서"],["약","야고보서"],["벧전","베드로전서"],
  ["벧후","베드로후서"],["요일","요한1서"],["요이","요한2서"],["요삼","요한3서"],
  ["유","유다서"],["계","요한계시록"]
];
// 통독표에는 "유다서"처럼 권 이름을 그대로 쓴 날도 있다 — 그것도 범위로 읽는다
const SORTED = [...ABBR, ...ABBR.map(([, n]) => [n, n])].sort((a, b) => b[0].length - a[0].length);

// 앱의 권 순서·장 수 (src/data/bibleBooks.ts 와 같아야 한다)
const src = fs.readFileSync("C:/Users/beeeb/Downloads/CHO/src/data/bibleBooks.ts", "utf8");
const BOOKS = [...src.matchAll(/name:\s*"([^"]+)".*?chapters:\s*(\d+)/g)].map(m => ({ name: m[1], chapters: Number(m[2]) }));
if (BOOKS.length !== 66) throw new Error("권 수가 66이 아니다: " + BOOKS.length);
const idxOf = (n) => BOOKS.findIndex(b => b.name === n);

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
    else { right = parseSide(r); if (!right) return []; }
  }

  const fi = idxOf(left.book), li = idxOf(right.book);
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

/**
 * 인쇄된 통독표의 오탈자를 바로잡는다 (목사님 확인을 받은 것만 적는다).
 *  · 2025-10-16 "고전13~15" → "고전13~16": 다음 날이 바로 고린도후서라
 *    고린도전서 16장이 한 해 통독에서 통째로 빠져 있었다. (2026-09-07 확인)
 */
const CORRECTIONS = {
  "2025-10-16": "고전13~16"
};

const plan = JSON.parse(fs.readFileSync(SRC, "utf8"));
const rows = [];
let chapterTotal = 0;
const unparsed = [];

for (const d of plan.days) {
  if (CORRECTIONS[d.date]) {
    console.log(`바로잡음 ${d.date}: ${d.reading} → ${CORRECTIONS[d.date]}`);
    d.reading = CORRECTIONS[d.date];
  }
  const label = d.reading || d.specialLabel || "";
  const ranges = d.isSectionStart ? [] : parseReading(d.reading);
  if (d.reading && ranges.length === 0 && !d.isSectionStart) unparsed.push(d.reading);
  chapterTotal += ranges.reduce((n, r) => n + (r[2] - r[1] + 1), 0);
  rows.push({
    date: d.date,
    label,
    ...(d.isSectionStart && d.sectionName ? { section: d.sectionName, sectionCode: d.sectionCode } : {}),
    ...(d.isSpecial && d.specialLabel ? { special: d.specialLabel } : {}),
    ...(d.hasVideo ? { video: true } : {}),
    ranges
  });
}

console.log("전체 날 수:", rows.length, "/ 읽는 날:", rows.filter(r => r.ranges.length).length);
console.log("장 합계:", chapterTotal);
console.log("범위로 못 읽은 문구:", [...new Set(unparsed)].join(", ") || "(없음)");

const lit = (r) => {
  const bits = [`date:"${r.date}"`, `label:"${r.label}"`];
  if (r.section) bits.push(`section:"${r.section}"`, `sectionCode:"${r.sectionCode}"`);
  if (r.special) bits.push(`special:"${r.special}"`);
  if (r.video) bits.push(`video:true`);
  bits.push(`ranges:[${r.ranges.map(([b, s, e]) => `["${b}",${s},${e}]`).join(",")}]`);
  return `  { ${bits.join(", ")} }`;
};

const header = `/**
 * 더공감하는교회 리딩지저스(그리스도중심성경읽기) 통독표.
 *
 * 교회가 나눠 준 2025년 통독표를 그대로 옮긴 것이다 — 날짜·문구·강해 영상 편은
 * 손대지 않았고, "창1~4" 같은 문구를 앱이 쓰는 권 이름과 장 범위로 풀어 두었을 뿐이다.
 * 이 파일은 도구로 만들어졌다. 통독표가 바뀌면 손으로 고치지 말고 다시 만들어라.
 *
 * 주일에는 강해 영상(편 시작)이 오고, 월~토에 읽을 분량이 온다.
 * 읽을 분량이 없는 날(강해·특별주간)은 ranges 가 비어 있다.
 */

export interface ReadingJesusDay {
  /** 통독표에 적힌 날짜 (${plan.year}년 기준) */
  date: string;
  /** 통독표에 적힌 그대로의 문구 ("창1~4", "복음서1", "성탄절") */
  label: string;
  /** 그날부터 시작하는 강해 편 이름 */
  section?: string;
  sectionCode?: string;
  /** 특별주간 안내 문구 */
  special?: string;
  /** 강해 영상이 있는 날 */
  video?: boolean;
  /** 읽을 범위 [권 이름, 시작 장, 끝 장][]. 읽을 분량이 없으면 빈 배열 */
  ranges: [string, number, number][];
}

/** 통독표가 쓰인 해 */
export const READING_JESUS_YEAR = ${plan.year};
/** 통독 목표 이름 — 리딩지저스 모드에서는 이 이름으로 고정된다 */
export const READING_JESUS_TITLE = "리딩지저스 통독";
/** 통독표 전체에서 읽는 장 수 */
export const READING_JESUS_TOTAL_CHAPTERS = ${chapterTotal};

export const READING_JESUS_DAYS: ReadingJesusDay[] = [
`;

fs.writeFileSync(OUT, header + rows.map(lit).join(",\n") + "\n];\n", "utf8");
console.log("wrote", OUT);
