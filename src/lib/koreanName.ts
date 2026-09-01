/**
 * 이름에서 성을 떼어 부르는 이름만 남긴다.
 *
 *   최희란  →  희란        (희란의 영성일기)
 *   구진경  →  진경
 *   남궁민수 → 민수        (두 글자 성)
 *   관리자(목사님) → 관리자  (직분·호칭은 그대로)
 *   김철    →  김철        (두 글자 이름은 성을 떼면 어색해서 그대로)
 *   John   →  John        (한글이 아니면 그대로)
 */

/** 두 글자 성 — 이건 먼저 확인해야 한다 (남궁민수에서 '궁민수'가 되면 안 된다) */
const COMPOUND_SURNAMES = [
  "남궁", "황보", "제갈", "사공", "선우", "서문", "독고", "동방", "망절", "어금", "을지"
];

/**
 * 흔한 한 글자 성.
 *
 * ⚠️ 목록에 있는 글자로 시작할 때만 성을 뗀다.
 *    아무 글자나 떼면 '관리자' 가 '리자' 가 된다 (실제로 우리 앱에 그런 이름이 있다).
 */
const SURNAMES = new Set([
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "한", "오", "서", "신", "권", "황", "안", "송", "류", "유",
  "전", "홍", "고", "문", "양", "손", "배", "백", "허", "남",
  "심", "노", "하", "곽", "성", "차", "주", "우", "구", "민",
  "나", "지", "엄", "채", "원", "천", "방", "공", "현", "함",
  "변", "염", "여", "추", "도", "소", "석", "선", "설", "마",
  "길", "위", "표", "명", "기", "반", "라", "왕", "금", "옥",
  "육", "인", "맹", "제", "모", "탁", "국", "여", "진", "지"
]);

/** 이름이 아니라 직분·호칭인 경우 — 성을 떼면 안 된다 */
const TITLES = new Set([
  "관리자", "운영자", "목사", "목사님", "전도사", "전도사님",
  "사모", "사모님", "장로", "장로님", "집사", "집사님", "권사", "권사님"
]);

export function givenName(fullName: string | undefined | null): string {
  // "관리자(목사님)" 처럼 괄호로 붙인 꼬리말은 떼고 본다
  const base = String(fullName ?? "").replace(/\s*\(.*?\)\s*$/, "").trim();
  if (!base) return "나";

  if (TITLES.has(base)) return base;
  // 한글 이름이 아니면 그대로 둔다
  if (!/^[가-힣]+$/.test(base)) return base;

  for (const s of COMPOUND_SURNAMES) {
    if (base.length >= 4 && base.startsWith(s)) return base.slice(s.length);
  }

  // 두 글자 이름은 성을 떼면 한 글자만 남아 어색하다 (김철 → 철)
  if (base.length >= 3 && SURNAMES.has(base[0])) return base.slice(1);

  return base;
}

/** "희란의 영성일기" 처럼 부를 이름을 만든다 */
export function possessiveTitle(fullName: string | undefined | null, noun: string): string {
  return `${givenName(fullName)}의 ${noun}`;
}
