import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ModalPortal from "./ModalPortal";

/**
 * 앱 사용법 안내 — **실제 화면 위에** 설명을 얹는다.
 *
 * 슬라이드로 따로 그린 그림이 아니라, 지금 보고 있는 진짜 화면을 어둡게 덮고
 * 설명할 버튼만 동그랗게 뚫어서 보여 준다. 그 옆에 말풍선으로 무엇을 하는 곳인지 적는다.
 *
 * 짚을 자리는 각 화면의 요소에 `data-guide="이름"` 을 달아 두고 여기서 찾는다.
 * 그 요소가 지금 화면에 없으면(글이 아직 없다든지) 뚫지 않고 가운데 말풍선만 띄운다.
 *
 * 한 번 보시면 다시 뜨지 않는다 (설정 → 앱 사용법 다시 보기 에서 언제든 열 수 있다).
 */

const SEEN_KEY = "bible_med_guide_seen";
/** 안내 내용을 크게 고치면 이 값을 올린다. 그러면 모두에게 한 번 더 보인다. */
const GUIDE_VERSION = "3";

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

/** 안내가 데려갈 화면 */
export interface GuidePlace {
  /** 탭 열쇠 (App 의 TabType). 설정 화면이면 비운다 */
  tab?: string;
  /** 설정 화면을 열어야 하는 단계 */
  settings?: boolean;
}

export interface GuideStep extends GuidePlace {
  /** 이 화면이 무엇을 하는 곳인지 (그 화면의 첫 단계에만 적는다) */
  chapter: string;
  /** 짚을 자리 — 화면 요소의 data-guide 값 */
  target?: string;
  title: string;
  lines: string[];
  /** 관리자에게만 보이는 단계 */
  adminOnly?: boolean;
}

const STEPS: GuideStep[] = [
  // ── 시작 ────────────────────────────────────────────────
  {
    chapter: "시작",
    title: "우리 공동체만의 방입니다",
    lines: [
      "묵상도 감사도 우리 공동체 안에서만 보입니다.",
      "지금부터 화면마다 버튼을 하나씩 짚어 드릴게요."
    ],
    tab: "notice"
  },
  {
    chapter: "시작",
    target: "nav-tabs",
    title: "여기로 화면을 옮겨 다닙니다",
    lines: [
      "오늘 말씀 · 묵상 일기 · 성경 읽기방 · 감사 칭찬 · 나의 기록.",
      "화면을 좌우로 밀어도 옆 탭으로 넘어갑니다."
    ],
    tab: "notice"
  },
  {
    chapter: "시작",
    target: "header-settings",
    title: "설정은 이 톱니입니다",
    lines: ["알림, 글씨 크기, 우리 공동체, 앱 사용법이 여기 있습니다."],
    tab: "notice"
  },
  {
    chapter: "시작",
    target: "header-account",
    title: "내 이름 동그라미입니다",
    lines: ["내 프로필, 비밀번호 변경, 로그아웃이 여기 있습니다."],
    tab: "notice"
  },

  // ── 오늘 말씀 ───────────────────────────────────────────
  {
    chapter: "오늘 말씀",
    target: "notice-title",
    title: "매일 아침 말씀이 도착합니다",
    lines: [
      "자정에 오늘 읽을 말씀이 저절로 올라옵니다.",
      "여기에 오늘 구절과 날짜가 적혀 있습니다."
    ],
    tab: "notice"
  },
  {
    chapter: "오늘 말씀",
    target: "notice-admin",
    title: "말씀을 정하는 곳입니다",
    lines: [
      "톱니를 누르면 한 창에서 다 하실 수 있습니다.",
      "말씀 직접 수정 · 한 장씩 자동 공지 · 리딩지저스 통독표."
    ],
    tab: "notice",
    adminOnly: true
  },
  {
    chapter: "오늘 말씀",
    target: "notice-versions",
    title: "번역본을 고릅니다",
    lines: [
      "개역개정 · 우리말 · NIV 중에 고릅니다.",
      "두 개를 고르면 나란히 견주어 볼 수 있습니다."
    ],
    tab: "notice"
  },
  {
    chapter: "오늘 말씀",
    target: "notice-text",
    title: "구절을 누르면 표시됩니다",
    lines: [
      "마음에 닿는 구절을 누르면 금빛으로 표시됩니다.",
      "눌러 둔 구절은 나의 기록 → 말씀 체크리스트에 모입니다."
    ],
    tab: "notice"
  },
  {
    chapter: "오늘 말씀",
    target: "notice-read",
    title: "다 읽으셨으면 눌러 주세요",
    lines: ["누가 읽었는지 서로 볼 수 있어 함께 힘이 됩니다."],
    tab: "notice"
  },
  {
    chapter: "오늘 말씀",
    target: "notice-meditate",
    title: "바로 묵상을 씁니다",
    lines: [
      "고른 구절이 담긴 채로 묵상 일기가 열립니다.",
      "구절을 안 고르셨으면 본문 앞부분이 담깁니다."
    ],
    tab: "notice"
  },

  // ── 묵상 일기 ───────────────────────────────────────────
  {
    chapter: "묵상 일기",
    target: "feed-write",
    title: "한 문장이면 충분합니다",
    lines: [
      "길게 쓰지 않으셔도 됩니다.",
      "쓰다 나가도 글은 그대로 남아 있습니다."
    ],
    tab: "feed"
  },
  {
    chapter: "묵상 일기",
    target: "feed-journal",
    title: "나만 보는 일기입니다",
    lines: [
      "누구에게도 보이지 않습니다. 관리자도 볼 수 없습니다.",
      "나눔이 부담스러운 날에 쓰시면 좋습니다."
    ],
    tab: "feed"
  },
  {
    chapter: "묵상 일기",
    target: "feed-sok",
    title: "속별로 골라 봅니다",
    lines: [
      "전체 공유 글과 우리 속 글을 나눠 볼 수 있습니다.",
      "글을 쓸 때도 누구와 나눌지 고릅니다."
    ],
    tab: "feed"
  },
  {
    chapter: "묵상 일기",
    target: "feed-first-post",
    title: "마음을 전하고 댓글을 답니다",
    lines: [
      "좋아요 · 기도할게요 로 말 없이 마음만 전해도 됩니다.",
      "글에 @이름 을 쓰면 그분에게 알림이 갑니다."
    ],
    tab: "feed"
  },

  // ── 성경 읽기방 ─────────────────────────────────────────
  {
    chapter: "성경 읽기방",
    target: "bible-progress",
    title: "상자 아무 데나 누르면 열립니다",
    lines: [
      "몇 장을 읽었는지, 이번 주에 무엇을 읽을지 봅니다.",
      "목표 설정과 통독 체크리스트도 그 안에 있습니다."
    ],
    tab: "bible"
  },
  {
    chapter: "성경 읽기방",
    target: "bible-rj",
    title: "리딩지저스 통독 플랜",
    lines: [
      "교회 통독표를 그대로 따라 45주에 성경 전체를 읽습니다.",
      "누르면 바뀌고, 같은 자리에서 언제든 되돌아옵니다."
    ],
    tab: "bible"
  },
  {
    chapter: "성경 읽기방",
    target: "bible-continue",
    title: "마지막에 읽던 곳으로 갑니다",
    lines: ["어디까지 읽었는지 앱이 기억하고 있습니다."],
    tab: "bible"
  },
  {
    chapter: "성경 읽기방",
    target: "bible-testaments",
    title: "읽을 곳을 펼칩니다",
    lines: ["권 → 장 → 절 순서로 골라 들어갑니다."],
    tab: "bible"
  },
  {
    chapter: "성경 읽기방",
    target: "bible-text",
    title: "옆으로 밀면 장이 넘어갑니다",
    lines: [
      "본문을 좌우로 밀어 이전 장 · 다음 장으로 갑니다.",
      "읽는 동안에는 화면이 저절로 꺼지지 않습니다."
    ],
    tab: "bible"
  },
  {
    chapter: "성경 읽기방",
    target: "bible-complete",
    title: "다 읽은 장을 표시합니다",
    lines: ["이 표시가 통독 진행률과 챌린지에 그대로 쌓입니다."],
    tab: "bible"
  },

  // ── 감사 칭찬 ───────────────────────────────────────────
  {
    chapter: "감사 칭찬",
    target: "gratitude-write",
    title: "한 줄이면 됩니다",
    lines: [
      "오늘 감사한 일, 고마운 지체를 적어 보세요.",
      "이름을 밝히지 않고 올릴 수도 있습니다."
    ],
    tab: "gratitude"
  },

  // ── 나의 기록 ───────────────────────────────────────────
  {
    chapter: "나의 기록",
    target: "my-checklist",
    title: "눌러 둔 구절이 모입니다",
    lines: [
      "오늘 말씀과 성경 읽기방에서 누른 구절이 여기 쌓입니다.",
      "이번 달 나눔 목표도 여기서 정합니다."
    ],
    tab: "my"
  },
  {
    chapter: "나의 기록",
    target: "my-filters",
    title: "내가 쓴 글을 모아 봅니다",
    lines: ["말씀 묵상과 감사 칭찬을 나눠 보고, 낱말로 찾을 수도 있습니다."],
    tab: "my"
  },

  // ── 설정 ────────────────────────────────────────────────
  {
    chapter: "설정",
    target: "settings-font",
    title: "글씨가 작으면 키우세요",
    lines: ["앱 전체 글씨가 함께 커집니다. 성경 본문도 같이 커집니다."],
    settings: true
  },
  {
    chapter: "설정",
    target: "settings-alarm",
    title: "먼저 알림을 켜 주세요",
    lines: [
      "이걸 켜셔야 알림이 도착합니다.",
      "아침 묵상 알림 시간과 요일도 여기서 고릅니다."
    ],
    settings: true
  },
  {
    chapter: "설정",
    target: "settings-guide",
    title: "이 안내는 여기서 다시 봅니다",
    lines: [
      "새 기능이 생기면 여기서 확인해 주세요.",
      "이제 시작해 보실까요?"
    ],
    settings: true
  }
];

/** 화면에 실제로 보이는 것만 고른다 (숨은 PC용·모바일용이 같이 있을 수 있다) */
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`)
  );
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) || null
  );
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  onClose: () => void;
  isAdmin?: boolean;
  /** 그 단계를 보려면 어느 화면이어야 하는지 앱에 알려 준다 */
  onNavigate: (place: GuidePlace) => void;
}

/** 뚫은 자리 둘레에 두는 여백 */
const PAD = 8;

export default function AppGuide({ onClose, isAdmin = false, onNavigate }: Props) {
  const steps = React.useMemo(
    () => STEPS.filter((s) => !s.adminOnly || isAdmin),
    [isAdmin]
  );

  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  /** 자리를 재는 동안에는 말풍선을 옮기지 않는다 (덜컥거림 방지) */
  const [ready, setReady] = useState(false);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i === steps.length - 1;
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /** 이 단계의 자리를 찾아 화면에 들어오게 하고 크기를 잰다 */
  const measure = React.useCallback(() => {
    if (!step.target) {
      setRect(null);
      setReady(true);
      return;
    }
    const el = findTarget(step.target);
    if (!el) {
      // 아직 글이 없거나 그 화면에 없는 것 — 뚫지 않고 말풍선만 띄운다
      setRect(null);
      setReady(true);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setReady(true);
  }, [step.target]);

  // 단계가 바뀌면 그 화면으로 옮기고, 그려질 때를 기다렸다 잰다
  useLayoutEffect(() => {
    setReady(false);
    setRect(null);
    clearTimers();
    onNavigate({ tab: step.tab, settings: step.settings });

    // 탭이 바뀌며 그려지는 시간 → 자리를 화면 가운데로 → 다시 재기
    timers.current.push(
      window.setTimeout(() => {
        const el = step.target ? findTarget(step.target) : null;
        if (el) {
          const r = el.getBoundingClientRect();
          const off = r.top + r.height / 2 - window.innerHeight / 2;
          // 이미 잘 보이면 굳이 움직이지 않는다
          if (Math.abs(off) > 140) window.scrollBy({ top: off, behavior: "smooth" });
        }
        timers.current.push(window.setTimeout(measure, 380));
      }, 260)
    );

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // 화면 크기가 바뀌면 다시 잰다
  useEffect(() => {
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, [measure]);

  const go = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setI(next);
  };

  const finish = () => {
    clearTimers();
    markGuideSeen();
    // 안내가 설정 화면에서 끝나므로, 닫을 때는 첫 화면으로 돌려 놓는다
    onNavigate({ tab: "notice" });
    onClose();
  };

  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const vw = typeof window === "undefined" ? 400 : window.innerWidth;

  /** 뚫은 자리 (여백 포함) */
  const hole = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        width: Math.min(vw, rect.width + PAD * 2),
        height: rect.height + PAD * 2
      }
    : null;

  /** 말풍선은 뚫은 자리 아래에 두되, 아래가 좁으면 위로 올린다 */
  const below = !hole || hole.top + hole.height < vh * 0.55;
  /** 조작 단추는 뚫은 자리와 겹치지 않는 쪽에 둔다 */
  const controlsAtTop = !!hole && hole.top + hole.height > vh - 190;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[90]" style={{ pointerEvents: "auto" }}>
        {/* 어두운 막 — 뚫은 자리만 남기고 화면을 덮는다.
            큰 그림자를 바깥으로 퍼뜨려 구멍을 만든다 (마스크보다 가볍고 안 깨진다) */}
        {hole ? (
          <motion.div
            initial={false}
            animate={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.6 }}
            className="absolute rounded-2xl"
            style={{
              boxShadow: "0 0 0 9999px rgba(6, 26, 20, 0.78)",
              outline: "2px solid #FFBA00",
              outlineOffset: "-1px"
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "rgba(6, 26, 20, 0.78)" }} />
        )}

        {/* 말풍선 */}
        <AnimatePresence mode="wait">
          {ready && (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: below ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute px-5"
              style={
                hole
                  ? below
                    ? { top: hole.top + hole.height + 18, left: 0, right: 0 }
                    : { bottom: vh - hole.top + 18, left: 0, right: 0 }
                  : { top: "50%", left: 0, right: 0, transform: "translateY(-50%)" }
              }
            >
              <div className="max-w-md mx-auto text-white bg-[#061A14]/75 backdrop-blur-[2px] rounded-[22px] px-4 py-3.5">
                <span className="inline-block text-2xs font-black tracking-[0.15em] text-[#FFBA00] mb-1.5">
                  {step.chapter}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-2.5">{step.title}</h2>
                <div className="space-y-1">
                  {step.lines.map((line, k) => (
                    <p key={k} className="text-[#D2DDD3] text-sm sm:text-base leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 조작 — 뚫은 자리를 가리지 않는 쪽에 붙는다 */}
        <div
          className={`absolute left-0 right-0 px-5 ${
            controlsAtTop
              ? "top-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3"
              : "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          }`}
        >
          <div className="max-w-md mx-auto space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(i - 1)}
                disabled={i === 0}
                className="p-3 rounded-3xl bg-white/15 text-white disabled:opacity-30 cursor-pointer backdrop-blur-sm"
                aria-label="이전"
              >
                <ChevronLeft size={20} />
              </button>

              {last ? (
                <button
                  type="button"
                  onClick={finish}
                  className="flex-1 py-3.5 rounded-3xl bg-white text-[#0C3B2E] font-bold cursor-pointer"
                >
                  시작하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(i + 1)}
                  className="flex-1 py-3.5 rounded-3xl bg-[#FFBA00] text-[#4A3600] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  다음
                  <ChevronRight size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={finish}
                className="px-3 py-3 text-2xs font-bold text-white/70 hover:text-white cursor-pointer shrink-0"
              >
                건너뛰기
              </button>
            </div>

            <div className="h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-[#FFBA00] rounded-full transition-all duration-300"
                style={{ width: `${((i + 1) / steps.length) * 100}%` }}
              />
            </div>
            <p className="text-center text-2xs text-white/50">
              {i + 1} / {steps.length}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
