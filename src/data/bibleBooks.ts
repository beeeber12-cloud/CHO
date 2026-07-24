export interface BibleBookInfo {
  id: string;
  name: string;
  shortName: string;
  testament: 'OT' | 'NT';
  chapters: number;
}

export const fontScaleLabel = {
  OT: "구약 성경 (39권)",
  NT: "신약 성경 (27권)"
};

export const BIBLE_BOOKS: BibleBookInfo[] = [
  // 구약 39권
  { id: "gen", name: "창세기", shortName: "창", testament: "OT", chapters: 50 },
  { id: "exo", name: "출애굽기", shortName: "출", testament: "OT", chapters: 40 },
  { id: "lev", name: "레위기", shortName: "레", testament: "OT", chapters: 27 },
  { id: "num", name: "민수기", shortName: "민", testament: "OT", chapters: 36 },
  { id: "deu", name: "신명기", shortName: "신", testament: "OT", chapters: 34 },
  { id: "jos", name: "여호수아", shortName: "여", testament: "OT", chapters: 24 },
  { id: "jdg", name: "사사기", shortName: "삿", testament: "OT", chapters: 21 },
  { id: "rut", name: "룻기", shortName: "룻", testament: "OT", chapters: 4 },
  { id: "1sa", name: "사무엘상", shortName: "삼상", testament: "OT", chapters: 31 },
  { id: "2sa", name: "사무엘하", shortName: "삼하", testament: "OT", chapters: 24 },
  { id: "1ki", name: "열왕기상", shortName: "왕상", testament: "OT", chapters: 22 },
  { id: "2ki", name: "열왕기하", shortName: "왕하", testament: "OT", chapters: 25 },
  { id: "1ch", name: "역대상", shortName: "대상", testament: "OT", chapters: 29 },
  { id: "2ch", name: "역대하", shortName: "대하", testament: "OT", chapters: 36 },
  { id: "ezr", name: "에스라", shortName: "스", testament: "OT", chapters: 10 },
  { id: "neh", name: "느헤미야", shortName: "느", testament: "OT", chapters: 13 },
  { id: "est", name: "에스더", shortName: "에", testament: "OT", chapters: 10 },
  { id: "job", name: "욥기", shortName: "욥", testament: "OT", chapters: 42 },
  { id: "psa", name: "시편", shortName: "시", testament: "OT", chapters: 150 },
  { id: "pro", name: "잠언", shortName: "잠", testament: "OT", chapters: 31 },
  { id: "ecc", name: "전도서", shortName: "전", testament: "OT", chapters: 12 },
  { id: "sng", name: "아가", shortName: "아", testament: "OT", chapters: 8 },
  { id: "isa", name: "이사야", shortName: "사", testament: "OT", chapters: 66 },
  { id: "jer", name: "예레미야", shortName: "렘", testament: "OT", chapters: 52 },
  { id: "lam", name: "예레미야애가", shortName: "애", testament: "OT", chapters: 5 },
  { id: "ezk", name: "에스겔", shortName: "겔", testament: "OT", chapters: 48 },
  { id: "dan", name: "다니엘", shortName: "단", testament: "OT", chapters: 12 },
  { id: "hos", name: "호세아", shortName: "호", testament: "OT", chapters: 14 },
  { id: "jol", name: "요엘", shortName: "욜", testament: "OT", chapters: 3 },
  { id: "amo", name: "아모스", shortName: "암", testament: "OT", chapters: 9 },
  { id: "oba", name: "오바댜", shortName: "옵", testament: "OT", chapters: 1 },
  { id: "jon", name: "요나", shortName: "욘", testament: "OT", chapters: 4 },
  { id: "mic", name: "미가", shortName: "미", testament: "OT", chapters: 7 },
  { id: "nam", name: "나훔", shortName: "나", testament: "OT", chapters: 3 },
  { id: "hab", name: "하박국", shortName: "습", testament: "OT", chapters: 3 },
  { id: "zep", name: "스바냐", shortName: "학", testament: "OT", chapters: 3 },
  { id: "hag", name: "학개", shortName: "학", testament: "OT", chapters: 2 },
  { id: "zec", name: "스가랴", shortName: "슥", testament: "OT", chapters: 14 },
  { id: "mal", name: "말라기", shortName: "말", testament: "OT", chapters: 4 },

  // 신약 27권
  { id: "mat", name: "마태복음", shortName: "마", testament: "NT", chapters: 28 },
  { id: "mrk", name: "마가복음", shortName: "막", testament: "NT", chapters: 16 },
  { id: "luk", name: "누가복음", shortName: "눅", testament: "NT", chapters: 24 },
  { id: "jhn", name: "요한복음", shortName: "요", testament: "NT", chapters: 21 },
  { id: "act", name: "사도행전", shortName: "행", testament: "NT", chapters: 28 },
  { id: "rom", name: "로마서", shortName: "롬", testament: "NT", chapters: 16 },
  { id: "1co", name: "고린도전서", shortName: "고전", testament: "NT", chapters: 16 },
  { id: "2co", name: "고린도후서", shortName: "고후", testament: "NT", chapters: 13 },
  { id: "gal", name: "갈라디아서", shortName: "갈", testament: "NT", chapters: 6 },
  { id: "eph", name: "에베소서", shortName: "엡", testament: "NT", chapters: 6 },
  { id: "php", name: "빌립보서", shortName: "빌", testament: "NT", chapters: 4 },
  { id: "col", name: "골로새서", shortName: "골", testament: "NT", chapters: 4 },
  { id: "1th", name: "데살로니가전서", shortName: "살전", testament: "NT", chapters: 5 },
  { id: "2th", name: "데살로니가후서", shortName: "살후", testament: "NT", chapters: 3 },
  { id: "1ti", name: "디모데전서", shortName: "딤전", testament: "NT", chapters: 6 },
  { id: "2ti", name: "디모데후서", shortName: "딤후", testament: "NT", chapters: 4 },
  { id: "tit", name: "디도서", shortName: "딛", testament: "NT", chapters: 3 },
  { id: "phm", name: "빌레몬서", shortName: "몬", testament: "NT", chapters: 1 },
  { id: "heb", name: "히브리서", shortName: "히", testament: "NT", chapters: 13 },
  { id: "jas", name: "야고보서", shortName: "약", testament: "NT", chapters: 5 },
  { id: "1pe", name: "베드로전서", shortName: "벧전", testament: "NT", chapters: 5 },
  { id: "2pe", name: "베드로후서", shortName: "벧후", testament: "NT", chapters: 3 },
  { id: "1jn", name: "요한1서", shortName: "요일", testament: "NT", chapters: 5 },
  { id: "2jn", name: "요한2서", shortName: "요이", testament: "NT", chapters: 1 },
  { id: "3jn", name: "요한3서", shortName: "요삼", testament: "NT", chapters: 1 },
  { id: "jud", name: "유다서", shortName: "유", testament: "NT", chapters: 1 },
  { id: "rev", name: "요한계시록", shortName: "계", testament: "NT", chapters: 22 },
];

export const TOTAL_BIBLE_CHAPTERS = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0); // 1189
