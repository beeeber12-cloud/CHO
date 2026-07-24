// 개역개정 성경 데이터 및 참조 파서 모듈 (Bible Engine)
import fs from "fs";
import path from "path";

export interface BibleBookInfo {
  id: string;
  name: string;
  abbr: string;
  testament: "OT" | "NT";
  totalChapters: number;
}

export const BIBLE_BOOKS: BibleBookInfo[] = [
  // 구약 39권
  { id: "gen", name: "창세기", abbr: "창", testament: "OT", totalChapters: 50 },
  { id: "exo", name: "출애굽기", abbr: "출", testament: "OT", totalChapters: 40 },
  { id: "lev", name: "레위기", abbr: "레", testament: "OT", totalChapters: 27 },
  { id: "num", name: "민수기", abbr: "민", testament: "OT", totalChapters: 36 },
  { id: "deu", name: "신명기", abbr: "신", testament: "OT", totalChapters: 34 },
  { id: "jos", name: "여호수아", abbr: "수", testament: "OT", totalChapters: 24 },
  { id: "jdg", name: "사사기", abbr: "삿", testament: "OT", totalChapters: 21 },
  { id: "rut", name: "룻기", abbr: "룻", testament: "OT", totalChapters: 4 },
  { id: "1sa", name: "사무엘상", abbr: "삼상", testament: "OT", totalChapters: 31 },
  { id: "2sa", name: "사무엘하", abbr: "삼하", testament: "OT", totalChapters: 24 },
  { id: "1ki", name: "열왕기상", abbr: "왕상", testament: "OT", totalChapters: 22 },
  { id: "2ki", name: "열왕기하", abbr: "왕하", testament: "OT", totalChapters: 25 },
  { id: "1ch", name: "역대상", abbr: "대상", testament: "OT", totalChapters: 29 },
  { id: "2ch", name: "역대하", abbr: "대하", testament: "OT", totalChapters: 36 },
  { id: "ezr", name: "에스라", abbr: "스", testament: "OT", totalChapters: 10 },
  { id: "neh", name: "느헤미야", abbr: "느", testament: "OT", totalChapters: 13 },
  { id: "est", name: "에스더", abbr: "에", testament: "OT", totalChapters: 10 },
  { id: "job", name: "욥기", abbr: "욥", testament: "OT", totalChapters: 42 },
  { id: "psa", name: "시편", abbr: "시", testament: "OT", totalChapters: 150 },
  { id: "pro", name: "잠언", abbr: "잠", testament: "OT", totalChapters: 31 },
  { id: "ecc", name: "전도서", abbr: "전", testament: "OT", totalChapters: 12 },
  { id: "sng", name: "아가", abbr: "아", testament: "OT", totalChapters: 8 },
  { id: "isa", name: "이사야", abbr: "사", testament: "OT", totalChapters: 66 },
  { id: "jer", name: "예레미야", abbr: "렘", testament: "OT", totalChapters: 52 },
  { id: "lam", name: "예레미야애가", abbr: "애", testament: "OT", totalChapters: 5 },
  { id: "ezk", name: "에스겔", abbr: "겔", testament: "OT", totalChapters: 48 },
  { id: "dan", name: "다니엘", abbr: "단", testament: "OT", totalChapters: 12 },
  { id: "hos", name: "호세아", abbr: "호", testament: "OT", totalChapters: 14 },
  { id: "jol", name: "요엘", abbr: "욜", testament: "OT", totalChapters: 3 },
  { id: "amo", name: "아모스", abbr: "암", testament: "OT", totalChapters: 9 },
  { id: "oba", name: "오바댜", abbr: "옵", testament: "OT", totalChapters: 1 },
  { id: "jon", name: "요나", abbr: "욘", testament: "OT", totalChapters: 4 },
  { id: "mic", name: "미가", abbr: "미", testament: "OT", totalChapters: 7 },
  { id: "nam", name: "나훔", abbr: "나", testament: "OT", totalChapters: 3 },
  { id: "hab", name: "하박국", abbr: "합", testament: "OT", totalChapters: 3 },
  { id: "zep", name: "스바냐", abbr: "습", testament: "OT", totalChapters: 3 },
  { id: "hag", name: "학개", abbr: "학", testament: "OT", totalChapters: 2 },
  { id: "zec", name: "스가랴", abbr: "슥", testament: "OT", totalChapters: 14 },
  { id: "mal", name: "말라기", abbr: "말", testament: "OT", totalChapters: 4 },

  // 신약 27권
  { id: "mat", name: "마태복음", abbr: "마", testament: "NT", totalChapters: 28 },
  { id: "mrk", name: "마가복음", abbr: "막", testament: "NT", totalChapters: 16 },
  { id: "luk", name: "누가복음", abbr: "눅", testament: "NT", totalChapters: 24 },
  { id: "jhn", name: "요한복음", abbr: "요", testament: "NT", totalChapters: 21 },
  { id: "act", name: "사도행전", abbr: "행", testament: "NT", totalChapters: 28 },
  { id: "rom", name: "로마서", abbr: "롬", testament: "NT", totalChapters: 16 },
  { id: "1co", name: "고린도전서", abbr: "고전", testament: "NT", totalChapters: 16 },
  { id: "2co", name: "고린도후서", abbr: "고후", testament: "NT", totalChapters: 13 },
  { id: "gal", name: "갈라디아서", abbr: "갈", testament: "NT", totalChapters: 6 },
  { id: "eph", name: "에베소서", abbr: "엡", testament: "NT", totalChapters: 6 },
  { id: "php", name: "빌립보서", abbr: "빌", testament: "NT", totalChapters: 4 },
  { id: "col", name: "골로새서", abbr: "골", testament: "NT", totalChapters: 4 },
  { id: "1th", name: "데살로니가전서", abbr: "살전", testament: "NT", totalChapters: 5 },
  { id: "2th", name: "데살로니가후서", abbr: "살후", testament: "NT", totalChapters: 3 },
  { id: "1ti", name: "디모데전서", abbr: "딤전", testament: "NT", totalChapters: 6 },
  { id: "2ti", name: "디모데후서", abbr: "딤후", testament: "NT", totalChapters: 4 },
  { id: "tit", name: "디도서", abbr: "딛", testament: "NT", totalChapters: 3 },
  { id: "phm", name: "빌레몬서", abbr: "몬", testament: "NT", totalChapters: 1 },
  { id: "heb", name: "히브리서", abbr: "히", testament: "NT", totalChapters: 13 },
  { id: "jas", name: "야고보서", abbr: "야", testament: "NT", totalChapters: 5 },
  { id: "1pe", name: "베드로전서", abbr: "벧전", testament: "NT", totalChapters: 5 },
  { id: "2pe", name: "베드로후서", abbr: "벧후", testament: "NT", totalChapters: 3 },
  { id: "1jn", name: "요한1서", abbr: "요일", testament: "NT", totalChapters: 5 },
  { id: "2jn", name: "요한2서", abbr: "요이", testament: "NT", totalChapters: 1 },
  { id: "3jn", name: "요한3서", abbr: "요삼", testament: "NT", totalChapters: 1 },
  { id: "jud", name: "유다서", abbr: "유", testament: "NT", totalChapters: 1 },
  { id: "rev", name: "요한계시록", abbr: "계", testament: "NT", totalChapters: 22 }
];

// 성경 데이터셋 로드
const BOOK_CACHE = new Map<string, any>();

export const BOOK_ID_MAP: Record<string, string> = {
  "창세기": "gen", "출애굽기": "exo", "레위기": "lev", "민수기": "num", "신명기": "deu",
  "여호수아": "jos", "사사기": "jdg", "룻기": "rut", "사무엘상": "1sa", "사무엘하": "2sa",
  "열왕기상": "1ki", "열왕기하": "2ki", "역대상": "1ch", "역대하": "2ch", "에스라": "ezr",
  "느헤미야": "neh", "에스더": "est", "욥기": "job", "시편": "psa", "잠언": "pro",
  "전도서": "ecc", "아가": "sng", "이사야": "isa", "예레미야": "jer", "예레미야애가": "lam",
  "에스겔": "ezk", "다니엘": "dan", "호세아": "hos", "요엘": "jol", "아모스": "amo",
  "오바댜": "oba", "요나": "jon", "미가": "mic", "나훔": "nam", "하박국": "hab",
  "스바냐": "zep", "학개": "hag", "스가랴": "zec", "말라기": "mal",
  "마태복음": "mat", "마가복음": "mrk", "누가복음": "luk", "요한복음": "jhn", "사도행전": "act",
  "로마서": "rom", "고린도전서": "1co", "고린도후서": "2co", "갈라디아서": "gal", "에베소서": "eph",
  "빌립보서": "php", "골로새서": "col", "데살로니가전서": "1th", "데살로니가후서": "2th", "디모데전서": "1ti",
  "디모데후서": "2ti", "디도서": "tit", "빌레몬서": "phm", "히브리서": "heb", "야고보서": "jas",
  "베드로전서": "1pe", "베드로후서": "2pe", "요한1서": "1jn", "요한2서": "2jn", "요한3서": "3jn",
  "유다서": "jud", "요한계시록": "rev"
};

export function getBookDataByName(bookName: string) {
  if (BOOK_CACHE.has(bookName)) return BOOK_CACHE.get(bookName);

  const bookId = BOOK_ID_MAP[bookName];
  if (!bookId) return null;

  try {
    // ESM(tsx)에서는 __dirname 이 없으므로 안전 가드 (typeof 로 참조 에러 방지)
    const baseDir = (typeof __dirname !== "undefined") ? __dirname : process.cwd();
    const pathsToTry = [
      path.join(process.cwd(), "server", "data", "books", `${bookId}.json`),
      path.join(baseDir, "data", "books", `${bookId}.json`),
      path.join(baseDir, "..", "server", "data", "books", `${bookId}.json`)
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, "utf-8"));
        BOOK_CACHE.set(bookName, data);
        return data;
      }
    }
  } catch (e) {
    console.warn(`[Bible Engine] Could not load book data for ${bookName}:`, e);
  }
  return null;
}

export function saveChapterData(bookName: string, chapter: number, verses: { verse: number; text: string }[]) {
  const bookId = BOOK_ID_MAP[bookName];
  if (!bookId) return;

  const dir = path.join(process.cwd(), "server", "data", "books");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let bookData = getBookDataByName(bookName) || { name: bookName, chaptersCount: 150, chapters: {} };
  if (!bookData.chapters) bookData.chapters = {};
  bookData.chapters[String(chapter)] = verses;

  BOOK_CACHE.set(bookName, bookData);

  try {
    const bookFilePath = path.join(dir, `${bookId}.json`);
    fs.writeFileSync(bookFilePath, JSON.stringify(bookData, null, 2));
    console.log(`[Bible Engine] Successfully saved ${bookName} ${chapter}장 to ${bookFilePath}`);
  } catch (e) {
    console.error(`[Bible Engine] Failed to save chapter data for ${bookName} ${chapter}장:`, e);
  }
}

// 서버 시작 시 66권 전체를 캐시에 적재 (키워드 검색 지원 + 첫 요청 지연 제거)
let preloaded = false;
export function preloadAllBooks(): number {
  if (preloaded) return BOOK_CACHE.size;
  for (const book of BIBLE_BOOKS) {
    if (!BOOK_CACHE.has(book.name)) {
      getBookDataByName(book.name);
    }
  }
  preloaded = true;
  return BOOK_CACHE.size;
}

// 오늘의 추천 구절 (날짜 기반 결정론적 순환 — 내장 개역개정 본문에서 추출)
const DAILY_VERSE_REFS = [
  "요한복음 3:16", "시편 23:1", "빌립보서 4:13", "이사야 41:10", "여호수아 1:9",
  "잠언 3:5", "로마서 8:28", "마태복음 11:28", "시편 46:1", "예레미야 29:11",
  "시편 118:24", "고린도전서 13:4", "베드로전서 5:7", "갈라디아서 2:20", "요한복음 14:6",
  "시편 121:1", "빌립보서 4:6", "이사야 40:31", "마태복음 6:33", "히브리서 11:1",
  "시편 27:1", "잠언 16:9", "로마서 12:2", "고린도후서 5:17", "시편 37:4",
  "에베소서 2:8", "요한복음 15:5", "시편 91:1", "데살로니가전서 5:16", "골로새서 3:23"
];

export function getDailyVerse(): { reference: string; text: string } {
  preloadAllBooks();
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayIndex = Math.floor(kst.getTime() / 86400000) % DAILY_VERSE_REFS.length;
  const ref = DAILY_VERSE_REFS[dayIndex];
  const parsed = parseAndGenerateBibleText(ref);
  if (parsed.isExactMatch && parsed.text) {
    // "16 하나님이..." 형태에서 절번호 접두어 제거
    const cleanText = parsed.text.replace(/^\d+\s*/, "").trim();
    return { reference: parsed.reference || ref, text: cleanText };
  }
  return { reference: "요한복음 3:16", text: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라" };
}

// 66권 별칭 지도 (Alias Mapping)
const BOOK_ALIAS_MAP: Record<string, string> = {
  // 구약
  "창세기": "창세기", "창": "창세기", "창세": "창세기", "gen": "창세기",
  "출애굽기": "출애굽기", "출": "출애굽기", "출애": "출애굽기", "exo": "출애굽기",
  "레위기": "레위기", "레": "레위기", "레위": "레위기", "lev": "레위기",
  "민수기": "민수기", "민": "민수기", "민수": "민수기", "num": "민수기",
  "신명기": "신명기", "신": "신명기", "신명": "신명기", "deu": "신명기",
  "여호수아": "여호수아", "수": "여호수아", "여호": "여호수아", "jos": "여호수아",
  "사사기": "사사기", "삿": "사사기", "사사": "사사기", "jdg": "사사기",
  "룻기": "룻기", "룻": "룻기", "rut": "룻기",
  "사무엘상": "사무엘상", "삼상": "사무엘상", "삼전": "사무엘상", "사상": "사무엘상", "1사": "사무엘상", "1sa": "사무엘상",
  "사무엘하": "사무엘하", "삼하": "사무엘하", "삼후": "사무엘하", "사하": "사무엘하", "2사": "사무엘하", "2sa": "사무엘하",
  "열왕기상": "열왕기상", "왕상": "열왕기상", "왕전": "열왕기상", "열상": "열왕기상", "1왕": "열왕기상", "1ki": "열왕기상",
  "열왕기하": "열왕기하", "왕하": "열왕기하", "왕후": "열왕기하", "열하": "열왕기하", "2왕": "열왕기하", "2ki": "열왕기하",
  "역대상": "역대상", "대상": "역대상", "대전": "역대상", "역상": "역대상", "1역": "역대상", "1ch": "역대상",
  "역대하": "역대하", "대하": "역대하", "대후": "역대하", "역하": "역대하", "2역": "역대하", "2ch": "역대하",
  "에스라": "에스라", "스": "에스라", "에스": "에스라", "ezr": "에스라",
  "느헤미야": "느헤미야", "느": "느헤미야", "느헤": "느헤미야", "neh": "느헤미야",
  "에스더": "에스더", "에": "에스더", "est": "에스더",
  "욥기": "욥기", "욥": "욥기", "job": "욥기",
  "시편": "시편", "시": "시편", "psa": "시편",
  "잠언": "잠언", "잠": "잠언", "pro": "잠언",
  "전도서": "전도서", "전": "전도서", "전도": "전도서", "ecc": "전도서",
  "아가": "아가", "아": "아가", "sng": "아가",
  "이사야": "이사야", "사": "이사야", "이사": "이사야", "isa": "이사야",
  "예레미야": "예레미야", "렘": "예레미야", "예레": "예레미야", "jer": "예레미야",
  "예레미야애가": "예레미야애가", "애": "예레미야애가", "애가": "예레미야애가", "예애": "예레미야애가", "lam": "예레미야애가",
  "에스겔": "에스겔", "겔": "에스겔", "에스겔서": "에스겔", "ezk": "에스겔",
  "다니엘": "다니엘", "단": "다니엘", "다니": "다니엘", "dan": "다니엘",
  "호세아": "호세아", "호": "호세아", "hos": "호세아",
  "요엘": "요엘", "욜": "요엘", "jol": "요엘",
  "아모스": "아모스", "암": "아모스", "amo": "아모스",
  "오바댜": "오바댜", "옵": "오바댜", "oba": "오바댜",
  "요나": "요나", "욘": "요나", "jon": "요나",
  "미가": "미가", "미": "미가", "mic": "미가",
  "나훔": "나훔", "나": "나훔", "nam": "나훔",
  "하박국": "하박국", "합": "하박국", "하박": "하박국", "hab": "하박국",
  "스바냐": "스바냐", "습": "스바냐", "zep": "스바냐",
  "학개": "학개", "학": "학개", "hag": "학개",
  "스가랴": "스가랴", "슥": "스가랴", "zec": "스가랴",
  "말라기": "말라기", "말": "말라기", "mal": "말라기",

  // 신약
  "마태복음": "마태복음", "마태": "마태복음", "마": "마태복음", "mat": "마태복음",
  "마가복음": "마가복음", "마가": "마가복음", "막": "마가복음", "mrk": "마가복음",
  "누가복음": "누가복음", "누가": "누가복음", "눅": "누가복음", "luk": "누가복음",
  "요한복음": "요한복음", "요한": "요한복음", "요": "요한복음", "jhn": "요한복음",
  "사도행전": "사도행전", "행전": "사도행전", "행": "사도행전", "act": "사도행전",
  "로마서": "로마서", "로마": "로마서", "롬": "로마서", "rom": "로마서",
  "고린도전서": "고린도전서", "고전": "고린도전서", "고전서": "고린도전서", "1고": "고린도전서", "1co": "고린도전서",
  "고린도후서": "고린도후서", "고후": "고린도후서", "고후서": "고린도후서", "2고": "고린도후서", "2co": "고린도후서",
  "갈라디아서": "갈라디아서", "갈": "갈라디아서", "갈라": "갈라디아서", "gal": "갈라디아서",
  "에베소서": "에베소서", "엡": "에베소서", "에베": "에베소서", "eph": "에베소서",
  "빌립보서": "빌립보서", "빌": "빌립보서", "빌립": "빌립보서", "php": "빌립보서",
  "골로새서": "골로새서", "골": "골로새서", "골로": "골로새서", "col": "골로새서",
  "데살로니가전서": "데살로니가전서", "살전": "데살로니가전서", "데전": "데살로니가전서", "1살": "데살로니가전서", "1th": "데살로니가전서",
  "데살로니가후서": "데살로니가후서", "살후": "데살로니가후서", "데후": "데살로니가후서", "2살": "데살로니가후서", "2th": "데살로니가후서",
  "디모데전서": "디모데전서", "딤전": "디모데전서", "디전": "디모데전서", "1딤": "디모데전서", "1ti": "디모데전서",
  "디모데후서": "디모데후서", "딤후": "디모데후서", "디후": "디모데후서", "2딤": "디모데후서", "2ti": "디모데후서",
  "디도서": "디도서", "딛": "디도서", "tit": "디도서",
  "빌레몬서": "빌레몬서", "몬": "빌레몬서", "phm": "빌레몬서",
  "히브리서": "히브리서", "히": "히브리서", "히브": "히브리서", "heb": "히브리서",
  "야고보서": "야고보서", "야": "야고보서", "야고": "야고보서", "jas": "야고보서",
  "베드로전서": "베드로전서", "벧전": "베드로전서", "1벧": "베드로전서", "1pe": "베드로전서",
  "베드로후서": "베드로후서", "벧후": "베드로후서", "2벧": "베드로후서", "2pe": "베드로후서",
  "요한1서": "요한1서", "요한일서": "요한1서", "요일": "요한1서", "1요": "요한1서", "1jn": "요한1서",
  "요한2서": "요한2서", "요한이서": "요한2서", "요이": "요한2서", "2요": "요한2서", "2jn": "요한2서",
  "요한3서": "요한3서", "요한삼서": "요한3서", "요삼": "요한3서", "3요": "요한3서", "3jn": "요한3서",
  "유다서": "유다서", "유": "유다서", "jud": "유다서",
  "요한계시록": "요한계시록", "계시록": "요한계시록", "계": "요한계시록", "rev": "요한계시록"
};

// 정렬된 별칭 키 목록 (긴 키 우선)
const SORTED_ALIASES = Object.keys(BOOK_ALIAS_MAP).sort((a, b) => b.length - a.length);

export function parseAndGenerateBibleText(queryStr: string): {
  reference: string;
  text: string;
  explanation: string;
  meditationGuide: string;
  isExactMatch: boolean;
  needsAiFetch?: boolean;
  matchedBookName?: string;
  chapter?: number;
  startVerse?: number | null;
  endVerse?: number | null;
} {
  if (!queryStr || !queryStr.trim()) {
    queryStr = "시편 23편";
  }

  const cleanQuery = queryStr.trim().replace(/\s+/g, " ");

  // 1. 책 이름 매칭
  let matchedBookName: string | null = null;
  let remainingQuery = "";

  for (const alias of SORTED_ALIASES) {
    // 쿼리가 alias로 시작하거나, alias 뒤에 공백/숫자/문자열 끝이 오는지 체크
    // 경계 강제: 별칭 뒤에 공백 1개/숫자/장·절·편/구두점/문자열끝만 허용 (\s* 는 0글자 매칭돼 "여호와"가 여호수아로 오인되므로 \s 로 고정)
    const regex = new RegExp("^" + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(\\s|\\d|장|절|편|:|\\.|$)");
    if (regex.test(cleanQuery)) {
      matchedBookName = BOOK_ALIAS_MAP[alias];
      remainingQuery = cleanQuery.slice(alias.length).trim();
      break;
    }
  }

  // 2. 책 이름이 매칭된 경우 (예: "요한복음 3장 16절", "창 1:1-5", "시편 23편")
  if (matchedBookName) {
    const bookObj = getBookDataByName(matchedBookName);
    const isPsalm = matchedBookName === "시편";

    // remainingQuery에서 장/절 숫자 파싱
    const cleanedNumStr = remainingQuery.replace(/[장절편]/g, " ").trim();
    const numbersMatch = cleanedNumStr.match(/(\d+)(?:[\s:\.]+(\d+)(?:[\s\-~]+(\d+))?)?/);

    let chapter = 1;
    let startVerse: number | null = null;
    let endVerse: number | null = null;

    if (numbersMatch) {
      if (numbersMatch[1]) chapter = parseInt(numbersMatch[1], 10);
      if (numbersMatch[2]) startVerse = parseInt(numbersMatch[2], 10);
      if (numbersMatch[3]) endVerse = parseInt(numbersMatch[3], 10);
    }

    if (chapter <= 0) chapter = 1;

    const bookMeta = BIBLE_BOOKS.find(b => b.name === matchedBookName);
    const maxChapters = bookMeta ? bookMeta.totalChapters : 150;
    if (chapter > maxChapters) chapter = maxChapters;

    const chapterVerses = bookObj?.chapters ? bookObj.chapters[String(chapter)] : null;

    if (chapterVerses && chapterVerses.length > 0) {
      let selectedVerses = chapterVerses;

      if (startVerse !== null) {
        if (endVerse !== null && endVerse >= startVerse) {
          selectedVerses = chapterVerses.filter((v: any) => v.verse >= startVerse! && v.verse <= endVerse!);
        } else {
          const exact = chapterVerses.filter((v: any) => v.verse === startVerse);
          if (exact.length > 0) {
            selectedVerses = exact;
          }
        }
      }

      if (selectedVerses.length === 0) {
        selectedVerses = chapterVerses;
      }

      const verseTextLines = selectedVerses.map((v: any) => `${v.verse} ${v.text}`).join("\n");
      let refStr = "";

      if (startVerse !== null && selectedVerses.length === 1) {
        refStr = `${matchedBookName} ${chapter}:${selectedVerses[0].verse}`;
      } else if (startVerse !== null && selectedVerses.length > 1) {
        refStr = `${matchedBookName} ${chapter}:${selectedVerses[0].verse}-${selectedVerses[selectedVerses.length - 1].verse}`;
      } else {
        refStr = `${matchedBookName} ${chapter}${isPsalm ? '편' : '장'}`;
      }

      return {
        reference: refStr,
        text: verseTextLines,
        explanation: `${matchedBookName} ${chapter}${isPsalm ? '편' : '장'} 본문은 하나님의 신실하신 보살핌과 구원의 은혜를 전해주는 말씀입니다.`,
        meditationGuide: `오늘 ${matchedBookName} ${chapter}${isPsalm ? '편' : '장'} 말씀을 조용히 읊조리며 주님이 주시는 평안과 위로를 묵상해 보세요.`,
        isExactMatch: true
      };
    } else {
      // 로컬 파일에 장 데이터가 없는 경우 -> AI로 자동 생성 및 저장 트리거
      return {
        reference: `${matchedBookName} ${chapter}${isPsalm ? '편' : '장'}`,
        text: "",
        explanation: "",
        meditationGuide: "",
        isExactMatch: false,
        needsAiFetch: true,
        matchedBookName,
        chapter,
        startVerse,
        endVerse
      };
    }
  }

  // 3. 키워드 본문 검색 (예: "하나님이 세상을 이처럼", "여호와는 나의 목자시니")
  const searchKeyword = cleanQuery.replace(/\s+/g, "");
  const matchingVerses: { book: string; chapter: string; verse: number; text: string }[] = [];

  if (searchKeyword.length >= 2) {
    for (const [bName, bData] of BOOK_CACHE.entries()) {
      if (!bData || !bData.chapters) continue;
      for (const [cNum, vList] of Object.entries(bData.chapters as Record<string, any[]>)) {
        if (!Array.isArray(vList)) continue;
        for (const v of vList) {
          if (v.text && v.text.replace(/\s+/g, "").includes(searchKeyword)) {
            matchingVerses.push({ book: bName, chapter: cNum, verse: v.verse, text: v.text });
            if (matchingVerses.length >= 10) break;
          }
        }
        if (matchingVerses.length >= 10) break;
      }
      if (matchingVerses.length >= 10) break;
    }
  }

  if (matchingVerses.length > 0) {
    if (matchingVerses.length === 1) {
      const v = matchingVerses[0];
      const isPsalm = v.book === "시편";
      return {
        reference: `${v.book} ${v.chapter}:${v.verse}`,
        text: `${v.verse} ${v.text}`,
        explanation: `${v.book} ${v.chapter}${isPsalm ? '편' : '장'} ${v.verse}절의 은혜로운 말씀입니다.`,
        meditationGuide: "이 말씀을 깊이 새기며 주님의 마음을 느껴보세요.",
        isExactMatch: true
      };
    } else {
      const verseTextLines = matchingVerses.map(v => `[${v.book} ${v.chapter}:${v.verse}] ${v.verse} ${v.text}`).join("\n\n");
      return {
        reference: `'${cleanQuery}' 검색 결과 (${matchingVerses.length}건)`,
        text: verseTextLines,
        explanation: `'${cleanQuery}' 키워드가 포함된 성경 구절 검색 결과입니다.`,
        meditationGuide: "검색된 말씀을 읽고 마음을 감동시키는 구절을 묵상해 보세요.",
        isExactMatch: true
      };
    }
  }

  // 4. 검색 결과가 없을 경우
  return {
    reference: "검색 결과 없음",
    text: `'${cleanQuery}'에 대한 성경 구절을 찾을 수 없습니다.\n\n[검색 팁]\n- 성경 책명과 장/절을 정확히 입력해 주세요. (예: 창세기 1:1, 요한복음 3:16, 시 23편, 요3:16)\n- 또는 '하나님이 세상을 이처럼'과 같이 구절 키워드로 검색할 수 있습니다.`,
    explanation: "올바른 성경 장/절 이름이나 키워드로 다시 검색해 주세요.",
    meditationGuide: "성경 찾기 탭에서 원하는 성경 책과 장을 직접 선택하여 읽으실 수도 있습니다.",
    isExactMatch: false
  };
}
