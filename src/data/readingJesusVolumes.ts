import { BIBLE_BOOKS } from "./bibleBooks";

/**
 * 리딩지저스 — 성경 66권을 여섯 걸음으로 읽는 길잡이.
 *
 * 통독표(readingJesus.ts)에는 **몇 권짜리 여정인지가 적혀 있지 않다.** 대신 날마다
 * 읽을 책 이름이 있고, 여섯 걸음의 경계가 마침 책 경계와 그대로 맞아떨어진다.
 * 그래서 표에 무엇을 덧붙이지 않고, **오늘 읽는 책 이름만 보고** 몇 권째인지 찾는다
 * (`volumeOfBook`). 통독표가 바뀌어도 이 파일은 손댈 일이 없다.
 *
 * 글은 교회에서 받은 리딩지저스 설명을 그대로 줄인 것이다. 새로 지어내지 않는다.
 */
export interface RjVolume {
  /** 몇 권째 (1~6) */
  no: number;
  /** 권 이름 */
  title: string;
  /** 사람에게 보이는 범위 — "창세기~여호수아" */
  range: string;
  /** 한 줄 주제 — 따옴표 안에 들어간다 */
  theme: string;
  /** 이 권이 하는 이야기 */
  core: string;
  /** 이야기가 흘러가는 차례 */
  flow: string;
  /** 여기서 예수님은 어떻게 보이는가 */
  jesus: string;
  /** 시작 책 · 끝 책 (성경 순서 기준) */
  from: string;
  to: string;
}

export const RJ_VOLUMES: RjVolume[] = [
  {
    no: 1,
    title: "언약의 서막",
    range: "창세기~여호수아",
    theme: "내가 너희의 하나님이 되고, 너희는 내 백성이 되리라",
    core: "아브라함과 맺으신 약속이 한 민족으로 어떻게 이루어지는지 보여줍니다.",
    flow: "세상 창조 → 출애굽 → 거룩한 백성으로 사는 법 → 약속의 땅",
    jesus: "조상들이 실패할 때마다, 하나님은 약속을 지키려 참된 구원자를 보내실 것을 미리 알리십니다.",
    from: "창세기",
    to: "여호수아"
  },
  {
    no: 2,
    title: "실패와 갈망",
    range: "사사기~에스더",
    theme: "우리에게도 왕을 주소서",
    core: "땅에 정착한 뒤 인간 왕을 세우며 무너져 가는 이야기입니다.",
    flow: "사사시대의 혼란 → 다윗과 솔로몬 → 나라가 쪼개져 포로로",
    jesus: "다윗조차 부족했습니다. 죄 짓지 않고 우리를 영원히 다스릴 왕이 필요합니다.",
    from: "사사기",
    to: "에스더"
  },
  {
    no: 3,
    title: "지혜와 노래",
    range: "욥기~아가",
    theme: "고통 속에서도 하나님을 신뢰하고 사랑할 수 있는가",
    core: "그 역사를 살아낸 사람들의 속마음과 진짜 고백이 담겨 있습니다.",
    flow: "욥기(고난) · 시편(기도와 찬양) · 잠언(지혜) · 전도서(허무) · 아가(사랑)",
    jesus: "사람이 겪는 모든 아픔과 기쁨을 똑같이 겪으신, 우리를 다 아시는 대제사장을 만납니다.",
    from: "욥기",
    to: "아가"
  },
  {
    no: 4,
    title: "선지자의 외침",
    range: "이사야~말라기",
    theme: "심판 뒤에 올 영원한 회복을 보라",
    core: "죄를 꾸짖으면서, 동시에 오실 메시아를 가장 또렷하게 알려 줍니다.",
    flow: "심판의 경고 → 회복의 약속 → 고난받는 종(이사야 53장)",
    jesus: "구약에서 예수님의 모습이 가장 선명하게 드러나는 곳입니다.",
    from: "이사야",
    to: "말라기"
  },
  {
    no: 5,
    title: "복음의 성취",
    range: "마태복음~로마서",
    theme: "약속하신 메시아가 바로 이분이다",
    core: "구약의 모든 예언이 예수님을 통해 실제로 일어난 일이 됩니다.",
    flow: "복음서(십자가와 부활) → 사도행전(땅끝까지) → 로마서(믿음으로 의롭게)",
    jesus: "구약의 모든 약속이 예수라는 한 이름으로 풀립니다.",
    from: "마태복음",
    to: "로마서"
  },
  {
    no: 6,
    title: "교회의 사명",
    range: "고린도전서~요한계시록",
    theme: "다시 오실 왕을 기다리는 공동체의 삶",
    core: "구원받은 사람들이 이 세상에서 어떻게 살아야 하는지를 다룹니다.",
    flow: "바울서신·일반서신(일상에서 거룩한 삶) → 요한계시록(마지막 승리)",
    jesus: "머리 되신 예수님과 이어진 교회가 어떻게 살아가고, 그분이 다시 오시며 끝납니다.",
    from: "고린도전서",
    to: "요한계시록"
  }
];

/** 책 이름 → 성경 순서 번호 (없으면 -1) */
function orderOf(book: string): number {
  return BIBLE_BOOKS.findIndex((b) => b.name === book);
}

/**
 * 이 책은 몇 권째인가.
 * 책 이름을 못 찾거나 여섯 걸음 밖이면 null (그러면 화면에 띠를 아예 그리지 않는다).
 */
export function volumeOfBook(book: string | null | undefined): RjVolume | null {
  if (!book) return null;
  const i = orderOf(book);
  if (i < 0) return null;
  for (const v of RJ_VOLUMES) {
    const a = orderOf(v.from);
    const b = orderOf(v.to);
    if (a >= 0 && b >= 0 && i >= a && i <= b) return v;
  }
  return null;
}

/** 여섯 걸음이 한 이야기로 이어지는 것을 색으로 보여준다 (초록 → 금색) */
export const RJ_VOLUME_COLORS = [
  "#2F7358",
  "#35795C",
  "#3C8060",
  "#5E9166",
  "#8FA96B",
  "#D9A73C"
];

export function volumeColor(no: number): string {
  return RJ_VOLUME_COLORS[Math.min(RJ_VOLUME_COLORS.length, Math.max(1, no)) - 1];
}
