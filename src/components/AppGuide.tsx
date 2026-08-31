import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, HeartHandshake, MessageSquare, BookMarked, Calendar, Bell, Trophy, Cross,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useSwipe } from "../lib/useSwipe";

/**
 * 처음 들어오신 분께 탭을 하나씩 소개한다.
 *
 * 옆으로 밀어 넘기고, 언제든 건너뛸 수 있다.
 * 한 번 보시면 다시 뜨지 않는다 (알림 설정에서 '앱 사용법 다시 보기' 로 언제든 열 수 있다).
 */

const SEEN_KEY = "bible_med_guide_seen";
/** 안내 내용을 크게 고치면 이 값을 올린다. 그러면 모두에게 한 번 더 보인다. */
const GUIDE_VERSION = "1";

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

interface Slide {
  icon: typeof BookOpen;
  tab: string;
  title: string;
  lines: string[];
}

const SLIDES: Slide[] = [
  {
    icon: Cross,
    tab: "",
    title: "함께 말씀을 나누는 곳입니다",
    lines: [
      "우리 공동체끼리만 묵상과 감사를 나눕니다.",
      "다른 공동체의 글은 보이지 않습니다.",
      "",
      "어떤 탭이 무엇을 하는 곳인지 짧게 안내해 드릴게요.",
      "옆으로 밀어서 넘기시면 됩니다."
    ]
  },
  {
    icon: BookOpen,
    tab: "오늘말씀",
    title: "매일 아침 말씀이 도착합니다",
    lines: [
      "정해진 성경을 한 장씩 자정에 자동으로 올려 드립니다.",
      "",
      "· 개역개정 · 우리말 · NIV 를 골라 볼 수 있습니다",
      "· 마음에 닿는 구절을 눌러 고른 뒤 바로 묵상을 쓸 수 있습니다",
      "· 다 읽으셨으면 <읽었습니다> 를 눌러주세요"
    ]
  },
  {
    icon: MessageSquare,
    tab: "묵상나눔",
    title: "말씀 앞에서 받은 마음을 적습니다",
    lines: [
      "길게 쓰지 않으셔도 됩니다. 한 문장이면 충분합니다.",
      "",
      "· 긴 글은 접혀서 보이고, 누르면 펼쳐집니다",
      "· 댓글로 서로 격려할 수 있습니다",
      "· 글에 @이름 을 쓰면 그분에게 알림이 갑니다"
    ]
  },
  {
    icon: BookMarked,
    tab: "성경통독",
    title: "내 속도로 성경을 읽습니다",
    lines: [
      "권과 장을 골라 읽고, 다 읽으면 <읽음> 을 눌러 표시합니다.",
      "",
      "· 화면을 옆으로 밀면 다음 장으로 넘어갑니다",
      "· 마음에 드는 구절은 눌러서 모아둘 수 있습니다",
      "· 여기서 누른 <읽음> 이 챌린지 진행률에도 그대로 반영됩니다"
    ]
  },
  {
    icon: HeartHandshake,
    tab: "감사칭찬",
    title: "작은 감사를 나눕니다",
    lines: [
      "오늘 감사한 일, 고마운 지체를 한 줄이라도 적어보세요.",
      "",
      "· 이름을 밝히지 않고 올릴 수도 있습니다",
      "· 글쓰기가 부담스러우면 👍 · 🙏 를 눌러 마음만 전해도 됩니다",
      "· 성경읽기 챌린지가 열리면 이 자리에 챌린지 탭이 들어섭니다"
    ]
  },
  {
    icon: Trophy,
    tab: "챌린지",
    title: "함께 한 권을 읽습니다",
    lines: [
      "관리자가 성경 한 권과 목표일을 정하면 이 탭이 생깁니다.",
      "",
      "· 지체별 진행률을 나란히 보며 서로 응원합니다",
      "· 중간에 들어오셔도 됩니다",
      "· 끝나면 다음 날 감사칭찬 탭이 돌아옵니다"
    ]
  },
  {
    icon: Calendar,
    tab: "나의기록",
    title: "내가 지나온 길을 봅니다",
    lines: [
      "내가 쓴 묵상과 감사, 통독 진행률을 한자리에서 봅니다.",
      "",
      "· 모아둔 말씀 구절도 여기 있습니다",
      "· 이번 달 나눔 목표를 정할 수 있습니다"
    ]
  },
  {
    icon: Bell,
    tab: "알림설정",
    title: "알림과 글씨 크기를 정합니다",
    lines: [
      "먼저 <휴대폰 알림> 을 켜주셔야 알림이 도착합니다.",
      "",
      "· 아침 묵상 알림 시간과 요일을 고를 수 있습니다",
      "· 글씨가 작으면 <글씨 크기> 에서 크게 바꾸세요",
      "· 이 안내는 여기서 언제든 다시 보실 수 있습니다"
    ]
  }
];

interface Props {
  onClose: () => void;
}

export default function AppGuide({ onClose }: Props) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setI(next);
  };

  const { swipeHandlers, dragRef } = useSwipe({
    onSwipeLeft: () => go(i + 1),
    onSwipeRight: () => go(i - 1),
    canSwipeLeft: i < SLIDES.length - 1,
    canSwipeRight: i > 0
  });

  const finish = () => {
    markGuideSeen();
    onClose();
  };

  const s = SLIDES[i];

  return (
    <div className="fixed inset-0 z-[80] bg-[#0C3B2E] flex flex-col text-white">
      {/* 건너뛰기 */}
      <div className="flex justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] shrink-0">
        <button
          onClick={finish}
          className="text-sm font-semibold text-[#AFC0B2] hover:text-white px-3 py-1.5 cursor-pointer"
        >
          건너뛰기
        </button>
      </div>

      {/* 내용 — 옆으로 밀어 넘긴다 */}
      <div
        className="flex-1 flex items-center justify-center px-7 overflow-hidden"
        style={{ touchAction: "pan-y" }}
        {...swipeHandlers}
      >
        <div ref={dragRef} className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="w-16 h-16 rounded-3xl bg-[#0F4A39] flex items-center justify-center mb-6">
                <s.icon size={30} className="text-white" />
              </div>

              {s.tab && (
                <span className="inline-block text-2xs font-black tracking-[0.15em] text-[#FFBA00] mb-2">
                  {s.tab}
                </span>
              )}
              <h2 className="text-2xl font-bold leading-snug mb-5">{s.title}</h2>

              <div className="space-y-1.5">
                {s.lines.map((line, k) =>
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

      {/* 아래 — 점과 버튼 */}
      <div className="shrink-0 px-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4 space-y-4">
        <div className="flex justify-center gap-1.5">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-label={`${k + 1}번째 안내`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                k === i ? "w-6 bg-white" : "w-1.5 bg-[#4A6B57]"
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
          옆으로 밀어서 넘기실 수 있습니다 · {i + 1} / {SLIDES.length}
        </p>
      </div>
    </div>
  );
}
