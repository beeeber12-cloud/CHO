import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, HeartHandshake, MessageSquare, BookMarked, Calendar, Settings, Trophy, Cross,
  Sparkles, ShieldCheck, ChevronLeft, ChevronRight
} from "lucide-react";
import { useSwipe } from "../lib/useSwipe";

/**
 * 앱 사용법 안내.
 *
 * 화면(장)마다 **버튼을 하나씩 순서대로** 짚어 드린다.
 * 처음 로그인하시면 저절로 뜨고, 다음/이전으로 넘기거나 옆으로 밀어 넘긴다.
 * 위 목차를 누르면 그 장으로 바로 건너뛴다.
 *
 * 한 번 보시면 다시 뜨지 않는다
 * (설정 → 앱 사용법 다시 보기 에서 언제든 열 수 있다).
 */

const SEEN_KEY = "bible_med_guide_seen";
/** 안내 내용을 크게 고치면 이 값을 올린다. 그러면 모두에게 한 번 더 보인다. */
const GUIDE_VERSION = "2";

export function guideSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === GUIDE_VERSION;
  } catch {
    return true; // 저장이 막힌 기기에서는 성가시게 하지 않는다
  }
}

export function markGuideSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, GUIDE_VERSION);
  } catch {
    // 무시
  }
}

interface Step {
  /** 이 단계에서 짚는 버튼·메뉴 이름 (알약으로 보인다) */
  button?: string;
  title: string;
  lines: string[];
}

interface Chapter {
  icon: typeof BookOpen;
  /** 목차에 적히는 짧은 이름 */
  name: string;
  /** 그 화면이 무엇을 하는 곳인지 한 줄 */
  intro: string;
  steps: Step[];
  /** 관리자에게만 보이는 장 */
  adminOnly?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    icon: Cross,
    name: "시작하기",
    intro: "우리 공동체끼리 말씀과 감사를 나누는 곳입니다.",
    steps: [
      {
        title: "여기는 우리 공동체만의 방입니다",
        lines: [
          "묵상도 감사도 우리 공동체 안에서만 보입니다.",
          "다른 공동체의 글은 서로 보이지 않습니다.",
          "",
          "지금부터 화면마다 어떤 버튼이 무엇을 하는지",
          "하나씩 짚어 드리겠습니다."
        ]
      },
      {
        button: "아래 탭 막대",
        title: "화면은 아래 탭으로 옮겨 다닙니다",
        lines: [
          "오늘 말씀 · 묵상 일기 · 성경 읽기방 · 감사 칭찬 · 나의 기록",
          "이렇게 다섯 곳입니다.",
          "",
          "· 화면을 좌우로 밀어도 옆 탭으로 넘어갑니다",
          "· 챌린지가 열리면 감사 칭찬 자리에 챌린지가 들어섭니다"
        ]
      },
      {
        button: "맨 위 오른쪽 ⚙ 와 ◯",
        title: "설정과 내 계정은 맨 위에 있습니다",
        lines: [
          "톱니(⚙)를 누르면 설정 화면이 열립니다.",
          "그 옆 내 이름 동그라미를 누르면 계정 메뉴가 열립니다.",
          "",
          "· 톱니 — 알림, 글씨 크기, 우리 공동체, 앱 사용법",
          "· 이름 동그라미 — 내 프로필, 비밀번호 변경, 로그아웃"
        ]
      }
    ]
  },

  {
    icon: BookOpen,
    name: "오늘 말씀",
    intro: "매일 아침 공동체가 함께 읽을 말씀이 올라옵니다.",
    steps: [
      {
        title: "말씀은 자정에 저절로 올라옵니다",
        lines: [
          "관리자가 정해 둔 순서대로 매일 새 말씀이 도착합니다.",
          "맨 위에 오늘 읽을 구절과 날짜가 적혀 있습니다."
        ]
      },
      {
        button: "개역개정 / 우리말 / NIV",
        title: "번역본을 골라 봅니다",
        lines: [
          "본문 바로 위 알약을 눌러 번역본을 고릅니다.",
          "",
          "· 두 개를 고르면 위아래로 나란히 견주어 볼 수 있습니다",
          "· 한 번 고르면 성경 읽기방에서도 같은 번역본으로 보입니다"
        ]
      },
      {
        button: "구절 누르기",
        title: "마음에 닿는 구절을 눌러 둡니다",
        lines: [
          "구절을 누르면 은은한 금빛으로 표시됩니다.",
          "이어진 구절을 여러 개 누르면 한 덩어리로 묶입니다.",
          "",
          "· 눌러 둔 구절은 나의 기록 → 말씀 체크리스트에 모입니다",
          "· 다시 누르면 풀립니다"
        ]
      },
      {
        button: "이 말씀으로 내 묵상 쓰기",
        title: "고른 구절로 바로 묵상을 씁니다",
        lines: [
          "누르면 묵상 일기 탭으로 넘어가고,",
          "고른 구절이 글 상자에 미리 담겨 있습니다.",
          "",
          "· 구절을 안 고르셨으면 본문 앞부분이 담깁니다"
        ]
      },
      {
        button: "읽었습니다",
        title: "다 읽으셨으면 눌러 주세요",
        lines: [
          "누가 읽었는지 서로 볼 수 있어 함께 힘이 됩니다.",
          "",
          "· 잘못 눌렀으면 한 번 더 눌러 해제합니다",
          "· 성경통독에서 보기 를 누르면 그 본문을 읽기방에서 엽니다"
        ]
      }
    ]
  },

  {
    icon: MessageSquare,
    name: "묵상 일기",
    intro: "말씀 앞에서 받은 마음을 적고 서로 나눕니다.",
    steps: [
      {
        button: "묵상 나누기",
        title: "한 문장이면 충분합니다",
        lines: [
          "길게 쓰지 않으셔도 됩니다.",
          "쓰다가 다른 탭으로 나가도 쓰던 글은 그대로 남아 있습니다.",
          "",
          "· 그때는 버튼이 묵상 이어쓰기 로 바뀝니다"
        ]
      },
      {
        button: "나눔 범위 선택",
        title: "누구와 나눌지 고릅니다",
        lines: [
          "전체 공유 — 우리 공동체 모두와 나눕니다.",
          "속 모임 — 그 속 지체들끼리만 나눕니다.",
          "",
          "· 위쪽 속 알약을 눌러 그 속 글만 골라 볼 수도 있습니다"
        ]
      },
      {
        button: "@이름",
        title: "지체를 부르면 알림이 갑니다",
        lines: [
          "글이나 댓글에 @ 를 치면 이름 목록이 뜹니다.",
          "고른 분에게 알림이 도착합니다."
        ]
      },
      {
        button: "좋아요 · 기도할게요",
        title: "말 없이 마음만 전해도 됩니다",
        lines: [
          "글 아래 두 단추로 마음을 전합니다.",
          "누른 단추는 주황색으로 불이 들어옵니다.",
          "",
          "· 댓글로 한마디 남기면 더 큰 힘이 됩니다",
          "· 긴 글은 접혀 있고, 누르면 펼쳐집니다"
        ]
      },
      {
        button: "영성일기",
        title: "나만 보는 일기도 있습니다",
        lines: [
          "누구에게도 보이지 않는, 나와 하나님 사이의 일기입니다.",
          "",
          "· 관리자도 볼 수 없습니다",
          "· 나눔이 부담스러운 날에 쓰시면 좋습니다"
        ]
      }
    ]
  },

  {
    icon: BookMarked,
    name: "성경 읽기방",
    intro: "성경을 펼쳐 읽고 통독을 표시하는 곳입니다.",
    steps: [
      {
        button: "구약 (39권) · 신약 (27권)",
        title: "읽을 곳을 펼칩니다",
        lines: [
          "누르면 권 → 장 → 절 순서로 골라 들어갑니다.",
          "절까지 고르면 그 자리로 바로 내려갑니다."
        ]
      },
      {
        button: "이어서 읽기",
        title: "마지막에 읽던 곳으로 돌아갑니다",
        lines: [
          "어디까지 읽었는지 앱이 기억하고 있습니다.",
          "",
          "· 성경 근처 아무 데나 누르면 본문이 화면에 딱 맞춰집니다"
        ]
      },
      {
        button: "옆으로 밀기",
        title: "장은 손가락으로 넘깁니다",
        lines: [
          "본문을 좌우로 밀면 이전 장 · 다음 장으로 넘어갑니다.",
          "아래 이전 장 / 다음 장 단추를 눌러도 됩니다.",
          "",
          "· 읽는 동안에는 화면이 저절로 꺼지지 않습니다"
        ]
      },
      {
        button: "이 장 통독 완료 체크",
        title: "다 읽은 장을 표시합니다",
        lines: [
          "이 표시가 통독 진행률에 그대로 쌓입니다.",
          "",
          "· 챌린지가 열려 있으면 챌린지 진행률에도 반영됩니다"
        ]
      },
      {
        button: "통독 진행률 상자",
        title: "상자 아무 데나 누르면 열립니다",
        lines: [
          "내가 몇 장을 읽었는지, 이번 주에 무엇을 읽을지 봅니다.",
          "",
          "· 목표 설정 — 통독 범위와 하루 몇 장을 정합니다",
          "· 통독 체크리스트 — 66권을 한눈에 보고 직접 체크합니다"
        ]
      },
      {
        button: "고른 구절로 묵상 쓰기",
        title: "읽다가 바로 묵상으로 넘어갑니다",
        lines: [
          "구절을 눌러 고른 뒤 이 단추를 누르면",
          "그 구절이 담긴 채로 묵상 일기가 열립니다."
        ]
      }
    ]
  },

  {
    icon: Sparkles,
    name: "리딩지저스",
    intro: "교회 통독표를 그대로 따라 읽는 방식입니다.",
    steps: [
      {
        button: "리딩지저스 통독 플랜",
        title: "성경 통독 제목 오른쪽 단추입니다",
        lines: [
          "누르면 교회가 나눠 준 리딩지저스 통독표를 따라갑니다.",
          "45주 동안 성경 전체(1,189장)를 읽는 계획입니다.",
          "",
          "· 같은 자리 단추가 일반 통독 으로 바뀝니다",
          "· 언제든 눌러 되돌아올 수 있고, 원래 목표는 그대로 남습니다"
        ]
      },
      {
        button: "내 통독 일정",
        title: "공동체와 함께 갈지, 따로 갈지 고릅니다",
        lines: [
          "통독 진행률 팝업 맨 위에 있습니다.",
          "",
          "· 공동체 일정 — 다 함께 같은 날 같은 본문을 읽습니다",
          "· 내 일정 — 시작날 · 읽는 요일 · 방학을 내가 정합니다",
          "",
          "따로 정하지 않으시면 공동체 일정을 따릅니다."
        ]
      },
      {
        button: "이번 주 통독표",
        title: "이번 주 월~일이 한눈에 보입니다",
        lines: [
          "요일을 누르면 그날 읽을 말씀으로 바로 넘어갑니다.",
          "",
          "· 다 읽은 날은 요일에 불이 들어옵니다",
          "· 쉬는 날과 방학은 흐리게 적힙니다"
        ]
      },
      {
        button: "전체 스케줄 확인",
        title: "45주 전체를 미리 봅니다",
        lines: [
          "1주부터 45주까지 날짜와 함께 쭉 보입니다.",
          "열면 이번 주 자리로 저절로 내려갑니다."
        ]
      }
    ]
  },

  {
    icon: HeartHandshake,
    name: "감사 칭찬",
    intro: "작은 감사와 서로를 향한 칭찬을 나눕니다.",
    steps: [
      {
        button: "감사 나누기",
        title: "한 줄이면 됩니다",
        lines: [
          "오늘 감사한 일, 고마운 지체를 적어 보세요."
        ]
      },
      {
        button: "익명으로 올려요",
        title: "이름을 밝히지 않아도 됩니다",
        lines: [
          "칭찬은 이름을 걸어야 힘이 되고,",
          "감사는 조용히 나누고 싶을 때가 있습니다.",
          "",
          "· 올릴 때마다 그때그때 고르시면 됩니다"
        ]
      },
      {
        button: "👍 · 🙏",
        title: "글쓰기가 부담스러우면 마음만 전하세요",
        lines: [
          "다른 분의 감사에 단추 하나로 함께할 수 있습니다."
        ]
      }
    ]
  },

  {
    icon: Trophy,
    name: "챌린지",
    intro: "공동체가 함께 한 권을 읽는 기간입니다.",
    steps: [
      {
        title: "챌린지가 열리면 탭이 생깁니다",
        lines: [
          "관리자가 성경 한 권과 목표일을 정하면",
          "감사 칭찬 자리에 챌린지 탭이 들어섭니다.",
          "",
          "· 지체별 진행률을 나란히 보며 서로 응원합니다",
          "· 중간에 들어오셔도 됩니다",
          "· 끝나면 다음 날 감사 칭찬 탭이 돌아옵니다"
        ]
      },
      {
        title: "읽음 표시가 곧 진행률입니다",
        lines: [
          "성경 읽기방에서 통독 완료 체크를 누르시면",
          "챌린지 진행률이 저절로 올라갑니다.",
          "따로 또 표시하실 필요가 없습니다."
        ]
      }
    ]
  },

  {
    icon: Calendar,
    name: "나의 기록",
    intro: "내가 지나온 길을 한자리에서 봅니다.",
    steps: [
      {
        button: "말씀 묵상 / 감사 칭찬",
        title: "내가 쓴 글을 모아 봅니다",
        lines: [
          "위쪽 알약으로 종류를 골라 봅니다.",
          "검색창에 낱말을 넣어 찾을 수도 있습니다."
        ]
      },
      {
        button: "말씀 체크리스트",
        title: "눌러 둔 구절이 모여 있습니다",
        lines: [
          "오늘 말씀과 성경 읽기방에서 눌러 둔 구절이",
          "여기 차곡차곡 쌓입니다."
        ]
      },
      {
        button: "내 나눔 목표",
        title: "이번 달 목표를 정합니다",
        lines: [
          "한 달에 몇 번 나눌지 정하면",
          "맨 위 카드에 진행률이 보입니다."
        ]
      }
    ]
  },

  {
    icon: Settings,
    name: "설정 · 계정",
    intro: "맨 위 톱니(⚙)와 이름 동그라미로 들어갑니다.",
    steps: [
      {
        button: "글씨 크기",
        title: "글씨가 작으면 키우세요",
        lines: [
          "네 단계 중에 고르면 앱 전체 글씨가 함께 커집니다.",
          "성경 본문도 같이 커집니다."
        ]
      },
      {
        button: "휴대폰 알림",
        title: "먼저 알림을 켜 주세요",
        lines: [
          "이걸 켜셔야 알림이 도착합니다.",
          "",
          "· 아침 묵상 알림 시간과 요일을 고를 수 있습니다",
          "· 새 묵상·댓글 알림도 여기서 켜고 끕니다"
        ]
      },
      {
        button: "내 프로필 · 비밀번호 변경",
        title: "이름 동그라미를 누르면 나옵니다",
        lines: [
          "이름을 바꾸거나 비밀번호(PIN)를 바꿉니다.",
          "",
          "· 다른 이름으로 로그인 · 로그아웃도 여기 있습니다"
        ]
      },
      {
        button: "앱 사용법 다시 보기",
        title: "이 안내는 언제든 다시 볼 수 있습니다",
        lines: [
          "설정 맨 아래에 있습니다.",
          "새 기능이 생기면 여기서 확인해 주세요."
        ]
      }
    ]
  },

  {
    icon: ShieldCheck,
    name: "관리자",
    intro: "관리자에게만 보이는 기능입니다.",
    adminOnly: true,
    steps: [
      {
        button: "오늘의 말씀 설정 ⚙",
        title: "매일 올라갈 말씀을 정합니다",
        lines: [
          "오늘 말씀 탭 위쪽 줄의 톱니를 누르면 한 창에서 다 합니다.",
          "",
          "· 오늘 말씀 직접 수정",
          "· 한 장씩 자동 공지 — 정한 권에서 하루 한 장씩",
          "· 리딩지저스 통독표 — 통독표대로 그날 분량 전체"
        ]
      },
      {
        button: "통독 시작날 · 읽는 요일 · 쉬는 기간",
        title: "공동체 통독 일정을 짭니다",
        lines: [
          "리딩지저스를 고르면 이 세 가지를 정합니다.",
          "정하는 즉시 오늘 올라갈 말씀과 마치는 날이 보입니다.",
          "",
          "· 방학을 넣으면 그만큼 뒤가 밀립니다",
          "· 지체들은 이 일정을 따르거나 자기 일정을 쓸 수 있습니다"
        ]
      },
      {
        button: "속 관리",
        title: "속 모임을 만들고 지체를 넣습니다",
        lines: [
          "묵상 일기 탭에서 속을 만들고 지체를 배정합니다.",
          "속을 나누면 그 속끼리만 나누는 글을 쓸 수 있습니다."
        ]
      },
      {
        button: "우리 공동체 · 지체 계정 관리",
        title: "설정 안에 있습니다",
        lines: [
          "공동체 이름과 초대 코드를 바꿉니다.",
          "",
          "· 지체의 비밀번호를 잊으셨으면 여기서 초기화합니다",
          "· 관리자 권한을 주고 뺄 수도 있습니다"
        ]
      }
    ]
  }
];

interface Props {
  onClose: () => void;
  /** 관리자에게는 관리자 장까지 보여준다 */
  isAdmin?: boolean;
}

export default function AppGuide({ onClose, isAdmin = false }: Props) {
  const chapters = React.useMemo(
    () => CHAPTERS.filter((c) => !c.adminOnly || isAdmin),
    [isAdmin]
  );

  /** 장과 단계를 한 줄로 펴 둔다 — 다음/이전이 장을 넘어 이어지도록 */
  const flat = React.useMemo(
    () =>
      chapters.flatMap((chapter, ci) =>
        chapter.steps.map((step, si) => ({ chapter, ci, step, si }))
      ),
    [chapters]
  );

  const [i, setI] = useState(0);
  const cur = flat[Math.min(i, flat.length - 1)];
  const last = i === flat.length - 1;

  const go = (next: number) => {
    if (next < 0 || next >= flat.length) return;
    setI(next);
  };

  /** 목차를 눌러 그 장의 첫 단계로 */
  const goChapter = (ci: number) => {
    const at = flat.findIndex((f) => f.ci === ci);
    if (at >= 0) setI(at);
  };

  const { swipeHandlers, dragRef } = useSwipe({
    onSwipeLeft: () => go(i + 1),
    onSwipeRight: () => go(i - 1),
    canSwipeLeft: i < flat.length - 1,
    canSwipeRight: i > 0
  });

  const finish = () => {
    markGuideSeen();
    onClose();
  };

  const Icon = cur.chapter.icon;

  return (
    <div className="fixed inset-0 z-[80] bg-[#0C3B2E] flex flex-col text-white">
      {/* 목차 — 누르면 그 장으로 바로 간다 */}
      <div className="shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-4">
          <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 py-1">
            {chapters.map((c, ci) => (
              <button
                key={c.name}
                type="button"
                onClick={() => goChapter(ci)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-2xs font-bold transition cursor-pointer ${
                  ci === cur.ci
                    ? "bg-white text-[#0C3B2E]"
                    : "bg-[#0F4A39] text-[#AFC0B2] hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <button
            onClick={finish}
            className="shrink-0 text-2xs font-bold text-[#AFC0B2] hover:text-white px-2 py-1.5 cursor-pointer"
          >
            건너뛰기
          </button>
        </div>
      </div>

      {/* 내용 — 옆으로 밀어 넘긴다 */}
      <div
        className="flex-1 flex items-center justify-center px-7 overflow-y-auto overflow-x-hidden"
        style={{ touchAction: "pan-y" }}
        {...swipeHandlers}
      >
        <div ref={dragRef} className="w-full max-w-md py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="w-14 h-14 rounded-3xl bg-[#0F4A39] flex items-center justify-center mb-5">
                <Icon size={26} className="text-white" />
              </div>

              <span className="block text-2xs font-black tracking-[0.15em] text-[#FFBA00] mb-1.5">
                {cur.chapter.name}
              </span>

              {/* 장의 첫 단계에서는 이 화면이 무엇을 하는 곳인지 먼저 알려 준다 */}
              {cur.si === 0 && (
                <p className="text-sm text-[#AFC0B2] mb-3 leading-relaxed">{cur.chapter.intro}</p>
              )}

              {/* 이 단계에서 짚는 버튼 */}
              {cur.step.button && (
                <span className="inline-block bg-[#0F4A39] text-white text-xs font-bold rounded-full px-3 py-1.5 mb-3">
                  {cur.step.button}
                </span>
              )}

              <h2 className="text-2xl font-bold leading-snug mb-4">{cur.step.title}</h2>

              <div className="space-y-1.5">
                {cur.step.lines.map((line, k) =>
                  line === "" ? (
                    <div key={k} className="h-2" />
                  ) : (
                    <p key={k} className="text-[#D2DDD3] leading-relaxed">
                      {line}
                    </p>
                  )
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 아래 — 이 장의 단계 점과 버튼 */}
      <div className="shrink-0 px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 space-y-3.5">
        <div className="flex justify-center gap-1.5">
          {cur.chapter.steps.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all ${
                k === cur.si ? "w-6 bg-white" : "w-1.5 bg-[#4A6B57]"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go(i - 1)}
            disabled={i === 0}
            className="p-3 rounded-3xl bg-[#0F4A39] text-white disabled:opacity-30 cursor-pointer"
            aria-label="이전"
          >
            <ChevronLeft size={20} />
          </button>

          {last ? (
            <button
              onClick={finish}
              className="flex-1 py-3.5 rounded-3xl bg-white text-[#0C3B2E] font-bold cursor-pointer"
            >
              시작하기
            </button>
          ) : (
            <button
              onClick={() => go(i + 1)}
              className="flex-1 py-3.5 rounded-3xl bg-[#FFBA00] text-[#0C3B2E] font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              다음
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        <p className="text-center text-2xs text-[#6F8377]">
          옆으로 밀어서 넘기실 수 있습니다 · {cur.ci + 1}장 {cur.si + 1}/{cur.chapter.steps.length} ·
          전체 {i + 1}/{flat.length}
        </p>
      </div>
    </div>
  );
}
