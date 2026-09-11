// 날마다 다르게 올라가는 '위로와 격려 한 구절' 을 만드는 도구.
// 구절을 더하거나 빼려면 아래 PICKS 를 고치고 `node tools/generate-daily-cheer.mjs` 를 돌린다.
//
// 본문은 **앱이 이미 가지고 있는 개역개정**에서 그대로 가져온다 (server/data/books).
// 따로 받아오지 않으니 비행기모드에서도 뜨고, 본문이 앱의 다른 곳과 어긋나지 않는다.
import fs from "fs";
import path from "path";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"),
  ".."
);
const BOOKS_DIR = path.join(ROOT, "server/data/books");
const OUT = path.join(ROOT, "src/data/dailyCheer.ts");

/**
 * 고른 구절들 — "시편 23:1" 또는 "시편 23:1-3" (같은 장 안에서만).
 *
 * 위로·격려·힘이 되는 말씀으로 골랐다.
 * **덧붙이는 말은 쓰지 않는다** — 사람이 쓴 말이 아니면 금방 티가 나고,
 * 말씀 한 구절이 그 자체로 충분하다. (2026-09-11 목사님)
 */
const PICKS = [
  "시편 23:1", "시편 23:4", "시편 121:1-2",
  "시편 46:1", "시편 46:10", "이사야 41:10",
  "이사야 40:31", "이사야 43:1", "이사야 43:19",
  "예레미야 29:11", "마태복음 11:28", "마태복음 6:34",
  "빌립보서 4:6-7", "빌립보서 4:13", "빌립보서 4:19",
  "로마서 8:28", "로마서 8:38-39", "여호수아 1:9",
  "신명기 31:8", "시편 34:18", "시편 55:22",
  "베드로전서 5:7", "시편 119:105", "시편 37:5",
  "잠언 3:5-6", "잠언 16:9", "애가 3:22-23",
  "시편 30:5", "시편 126:5", "고린도후서 12:9",
  "고린도후서 4:16", "고린도후서 5:17", "갈라디아서 6:9",
  "에베소서 2:10", "요한복음 14:27", "요한복음 16:33",
  "요한복음 15:5", "요한일서 4:18", "요한일서 1:9",
  "히브리서 4:16", "히브리서 13:5", "히브리서 12:1-2",
  "야고보서 1:5", "시편 27:1", "시편 27:14",
  "시편 31:24", "시편 42:11", "시편 62:1-2",
  "시편 73:26", "시편 84:11", "시편 91:1-2",
  "시편 103:2-3", "시편 116:1-2", "시편 118:24",
  "시편 133:1", "시편 139:9-10", "시편 139:14",
  "시편 143:8", "시편 147:3", "이사야 26:3",
  "이사야 30:15", "이사야 46:4", "이사야 55:8-9",
  "이사야 58:11", "예레미야 17:7-8", "예레미야 31:3",
  "에스겔 34:11-12", "미가 6:8", "스바냐 3:17",
  "하박국 3:17-18", "말라기 3:10", "마태복음 5:4",
  "마태복음 6:33", "마태복음 7:7", "마태복음 28:20",
  "마가복음 9:24", "누가복음 12:7", "요한복음 3:16",
  "사도행전 20:35", "로마서 5:3-4", "로마서 12:12",
  "로마서 15:13", "고린도전서 10:13", "고린도전서 13:4-7",
  "고린도전서 15:58", "갈라디아서 5:22-23", "에베소서 3:20",
  "빌립보서 1:6", "골로새서 3:23", "데살로니가전서 5:16-18",
  "디모데후서 1:7", "베드로전서 2:9", "요한계시록 21:4"
];

/** 한글 권 이름 → 파일 이름 */
function loadBooks() {
  const byName = new Map();
  for (const file of fs.readdirSync(BOOKS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, file), "utf8"));
    if (data?.name) byName.set(data.name, data);
  }
  return byName;
}

const BOOKS = loadBooks();
/** 통독표와 달리 여기서는 줄임말을 쓰지 않는다 — 한 군데서만 쓰는 목록이라 정식 이름으로 적는다 */
const ALIASES = { "애가": "예레미야애가", "요한일서": "요한1서", "요한이서": "요한2서", "요한삼서": "요한3서" };

function verseText(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`구절을 못 읽었습니다: "${ref}"`);
  const name = ALIASES[m[1]] || m[1];
  const book = BOOKS.get(name);
  if (!book) throw new Error(`모르는 권: "${name}" (${ref})`);

  const chapter = book.chapters[m[2]];
  if (!chapter) throw new Error(`${name}에 ${m[2]}장이 없습니다 (${ref})`);

  const from = Number(m[3]);
  const to = Number(m[4] || m[3]);
  const picked = chapter.filter((v) => v.verse >= from && v.verse <= to);
  if (picked.length === 0) throw new Error(`${ref} 절을 찾지 못했습니다`);
  if (picked.length !== to - from + 1) throw new Error(`${ref} 중 빠진 절이 있습니다`);

  // 여러 절이면 한 문단으로 잇는다 (절 번호는 넣지 않는다 — 읽는 글이지 본문 대조가 아니다)
  return picked.map((v) => v.text.trim()).join(" ");
}

const rows = PICKS.map((ref) => ({
  ref: ref.replace(/^애가/, "예레미야애가"),
  text: verseText(ref)
}));

const tooLong = rows.filter((r) => r.text.length > 120);

const out = `/**
 * 날마다 다르게 올라가는 **위로와 격려 한 구절**.
 *
 * 하루 첫 화면(TodayVerseIntro)에 오늘 것 하나가 뜬다.
 * 날짜로 고르므로 **공동체 모두가 같은 날 같은 구절**을 본다.
 *
 * 본문은 앱이 가진 개역개정에서 그대로 가져왔다 — 따로 받아오지 않으니
 * 비행기모드에서도 뜨고, 앱의 다른 곳과 본문이 어긋나지 않는다.
 *
 * 이 파일은 도구로 만들어졌다. 손으로 고치지 말고
 * \`node tools/generate-daily-cheer.mjs\` 로 다시 만들어라.
 */

export interface DailyCheer {
  /** 구절명 ("시편 23:1") */
  ref: string;
  /** 개역개정 본문 */
  text: string;
}

export const DAILY_CHEERS: DailyCheer[] = [
${rows.map((r) => `  { ref: ${JSON.stringify(r.ref)}, text: ${JSON.stringify(r.text)} }`).join(",\n")}
];

/**
 * 그날의 구절.
 *
 * 날짜를 숫자로 바꿔 차례대로 고른다 — 어느 기기에서 보든, 누가 보든 같은 날은 같은 구절이다.
 * (하루가 바뀌는 기준은 부르는 쪽에서 넘겨 주는 날짜 문자열 "2026-09-11" 이다)
 */
export function cheerOf(dateKey: string): DailyCheer {
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(dateKey || "");
  const days = m
    ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000)
    : 0;
  const i = ((days % DAILY_CHEERS.length) + DAILY_CHEERS.length) % DAILY_CHEERS.length;
  return DAILY_CHEERS[i];
}
`;

fs.writeFileSync(OUT, out, "utf8");
console.log(`만듦: ${OUT}`);
console.log(`  구절 ${rows.length}개 — ${rows.length}일마다 한 바퀴`);
console.log(`  가장 긴 본문 ${Math.max(...rows.map((r) => r.text.length))}자`);
if (tooLong.length) {
  console.log(`\n⚠ 첫 화면에 길어 보일 수 있는 구절 ${tooLong.length}개:`);
  for (const r of tooLong) console.log(`  · ${r.ref} (${r.text.length}자)`);
}
