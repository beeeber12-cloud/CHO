import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ModalPortal from "./ModalPortal";

/**
 * 앱 사용법 안내 — **화면 하나를 한꺼번에** 설명한다.
 *
 * 지금 보고 있는 진짜 화면을 어둡게 덮고, 그 화면의 버튼들을 **한 번에 다** 뚫어
 * ①②③ 번호를 붙인다. 아래 설명판에 같은 번호로 무엇을 하는 버튼인지 적는다.
 * 한 화면을 다 보셨으면 [다음 화면] 으로 넘어간다.
 *
 * 짚을 자리는 각 화면의 요소에 `data-guide="이름"` 을 달아 두고 여기서 찾는다.
 * 그 요소가 지금 화면에 없으면(글이 아직 없다든지) 번호 없이 설명만 남는다.
 *
 * 한 번 보시면 다시 뜨지 않는다 (설정 → 앱 사용법 다시 보기 에서 언제든 열 수 있다).
 */

const SEEN_KEY = "bible_med_guide_seen";
/** 안내 내용을 크게 고치면 이 값을 올린다. 그러면 모두에게 한 번 더 보인다. */
const GUIDE_VERSION = "4";

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

interface Mark {
  /** 짚을 자리 — 화면 요소의 data-guide 값 */
  target: string;
  /** 그 버튼 이름 */
  name: string;
  /** 무엇을 하는 버튼인지 */
  desc: string;
  /** 관리자에게만 보이는 것 */
  adminOnly?: boolean;
}

interface GuidePage extends GuidePlace {
  /** 이 화면 이름 */
  name: string;
  /** 이 화면이 무엇을 하는 곳인지 한 줄 */
  intro: string;
  marks: Mark[];
  /** 번호로 짚지는 않지만 알아 두시면 좋은 것 */
  notes?: string[];
}

const PAGES: GuidePage[] = [
  {
    name: "화면 둘러보기",
    intro: "우리 공동체끼리 말씀과 감사를 나누는 곳입니다.",
    tab: "notice",
    marks: [
      {
        target: "nav-tabs",
        name: "아래 탭 막대",
        desc: "오늘 말씀 · 묵상 일기 · 성경 읽기방 · 감사 칭찬 · 나의 기록으로 옮겨 다닙니다."
      },
      {
        target: "header-settings",
        name: "톱니 (설정)",
        desc: "알림, 글씨 크기, 우리 공동체, 앱 사용법이 들어 있습니다."
      },
      {
        target: "header-account",
        name: "내 이름 동그라미",
        desc: "내 프로필, 비밀번호 변경, 로그아웃이 들어 있습니다."
      }
    ],
    notes: ["화면을 좌우로 밀어도 옆 탭으로 넘어갑니다."]
  },

  {
    name: "오늘 말씀",
    intro: "매일 자정에 오늘 읽을 말씀이 저절로 올라옵니다.",
    tab: "notice",
    marks: [
      {
        target: "notice-admin",
        name: "오늘의 말씀 설정",
        desc: "말씀 직접 수정 · 한 장씩 자동 공지 · 리딩지저스 통독표를 여기서 정합니다.",
        adminOnly: true
      },
      {
        target: "notice-title",
        name: "오늘의 구절",
        desc: "오늘 읽을 구절과 날짜가 적혀 있습니다."
      },
      {
        target: "notice-versions",
        name: "번역본 고르기",
        desc: "개역개정 · 우리말 · NIV. 두 개를 고르면 나란히 견주어 봅니다."
      },
      {
        target: "notice-text",
        name: "말씀 본문",
        desc: "마음에 닿는 구절을 누르면 금빛으로 표시되고, 말씀 체크리스트에 모입니다."
      }
    ],
    notes: [
      "아래로 내리면 [오늘 말씀 읽었습니다] 와 [이 말씀으로 묵상 쓰기] 가 있습니다."
    ]
  },

  {
    name: "묵상 일기",
    intro: "말씀 앞에서 받은 마음을 적고 서로 나눕니다.",
    tab: "feed",
    marks: [
      {
        target: "feed-write",
        name: "묵상 나누기",
        desc: "한 문장이면 충분합니다. 쓰다 나가도 글은 그대로 남아 있습니다."
      },
      {
        target: "feed-journal",
        name: "영성일기",
        desc: "나만 보는 일기입니다. 관리자도 볼 수 없습니다."
      },
      {
        target: "feed-sok",
        name: "속 고르기",
        desc: "전체 공유 글과 우리 속 글을 나눠 봅니다. 글 쓸 때도 범위를 고릅니다."
      },
      {
        target: "feed-first-post",
        name: "지체들의 묵상",
        desc: "좋아요 · 기도할게요로 마음을 전하고 댓글을 답니다. @이름을 쓰면 알림이 갑니다."
      }
    ]
  },

  {
    name: "성경 읽기방",
    intro: "성경을 펼쳐 읽고 통독을 표시하는 곳입니다.",
    tab: "bible",
    marks: [
      {
        target: "bible-rj",
        name: "리딩지저스 통독 플랜",
        desc: "교회 통독표대로 45주에 성경 전체를 읽습니다. 같은 자리에서 되돌아옵니다."
      },
      {
        target: "bible-progress",
        name: "통독 진행률",
        desc: "상자 아무 데나 누르면 이번 주 계획, 목표 설정, 통독 체크리스트가 열립니다."
      },
      {
        target: "bible-continue",
        name: "이어서 읽기",
        desc: "마지막에 읽던 곳으로 바로 갑니다."
      },
      {
        target: "bible-testaments",
        name: "구약 · 신약",
        desc: "권 → 장 → 절 순서로 골라 들어갑니다."
      }
    ],
    notes: [
      "본문을 좌우로 밀면 이전 장 · 다음 장으로 넘어갑니다.",
      "본문 아래 [이 장 통독 완료 체크] 가 진행률에 그대로 쌓입니다.",
      "성경을 읽는 동안에는 화면이 저절로 꺼지지 않습니다."
    ]
  },

  {
    name: "감사 칭찬",
    intro: "작은 감사와 서로를 향한 칭찬을 나눕니다.",
    tab: "gratitude",
    marks: [
      {
        target: "gratitude-write",
        name: "감사 나누기",
        desc: "한 줄이면 됩니다. 이름을 밝히지 않고 올릴 수도 있습니다."
      }
    ],
    notes: [
      "글쓰기가 부담스러우면 다른 분의 글에 👍 · 🙏 만 눌러도 됩니다.",
      "챌린지가 열리면 이 자리에 챌린지 탭이 들어섭니다."
    ]
  },

  {
    name: "나의 기록",
    intro: "내가 지나온 길을 한자리에서 봅니다.",
    tab: "my",
    marks: [
      {
        target: "my-checklist",
        name: "말씀 체크리스트 · 나눔 목표",
        desc: "눌러 둔 구절이 모이고, 이번 달 나눔 목표를 정합니다."
      },
      {
        target: "my-filters",
        name: "말씀 묵상 / 감사 칭찬",
        desc: "내가 쓴 글을 종류별로 보고, 낱말로 찾을 수도 있습니다."
      }
    ]
  },

  {
    name: "설정",
    intro: "맨 위 톱니(⚙)로 들어옵니다.",
    settings: true,
    marks: [
      {
        target: "settings-font",
        name: "글씨 크기",
        desc: "앱 전체 글씨가 함께 커집니다. 성경 본문도 같이 커집니다."
      },
      {
        target: "settings-alarm",
        name: "휴대폰 알림",
        desc: "이걸 켜셔야 알림이 도착합니다. 시간과 요일도 여기서 고릅니다."
      },
      {
        target: "settings-guide",
        name: "앱 사용법 다시 보기",
        desc: "이 안내를 언제든 다시 보실 수 있습니다."
      }
    ]
  }
];

/** 화면에 실제로 보이는 것만 고른다 (숨은 PC용·모바일용이 같이 있을 수 있다) */
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) || null
  );
}

interface Hole {
  /** marks 에서의 번호 (1부터) */
  no: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  onClose: () => void;
  isAdmin?: boolean;
  /** 그 화면으로 데려가 달라고 앱에 알린다 */
  onNavigate: (place: GuidePlace) => void;
}

/** 뚫은 자리 둘레 여백 */
const PAD = 6;

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export default function AppGuide({ onClose, isAdmin = false, onNavigate }: Props) {
  const pages = React.useMemo(
    () =>
      PAGES.map((p) => ({
        ...p,
        marks: p.marks.filter((m) => !m.adminOnly || isAdmin)
      })).filter((p) => p.marks.length > 0),
    [isAdmin]
  );

  const [pi, setPi] = useState(0);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [ready, setReady] = useState(false);
  const page = pages[Math.min(pi, pages.length - 1)];
  const last = pi === pages.length - 1;
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /** 이 화면의 자리들을 한꺼번에 잰다 */
  const measure = React.useCallback(() => {
    const found: Hole[] = [];
    page.marks.forEach((m, k) => {
      const el = findTarget(m.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 화면 밖으로 나간 것은 뚫지 않는다 (설명은 아래 판에 그대로 남는다)
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      found.push({
        no: k + 1,
        top: Math.max(0, r.top - PAD),
        left: Math.max(0, r.left - PAD),
        width: Math.min(window.innerWidth, r.width + PAD * 2),
        height: r.height + PAD * 2
      });
    });
    setHoles(found);
    setReady(true);
  }, [page]);

  // 화면이 바뀌면 그 탭으로 옮기고, 맨 위로 올린 뒤 잰다
  useLayoutEffect(() => {
    setReady(false);
    setHoles([]);
    clearTimers();
    onNavigate({ tab: page.tab, settings: page.settings });

    timers.current.push(
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        timers.current.push(window.setTimeout(measure, 420));
      }, 240)
    );

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pi]);

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
    if (next < 0 || next >= pages.length) return;
    setPi(next);
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
  const holeOf = (no: number) => holes.find((h) => h.no === no);

  /**
   * 화면 아래쪽(하단 탭 막대처럼)에 뚫은 자리가 있으면 설명판을 그 위로 올린다.
   * 안 그러면 설명판이 그 자리를 덮어 버려서 번호를 봐도 어디를 말하는지 모른다.
   */
  const lowHoles = holes.filter((h) => h.top + h.height > vh - 260);
  const panelBottom = lowHoles.length
    ? Math.max(0, vh - Math.min(...lowHoles.map((h) => h.top)) + 12)
    : 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[90]">
        {/* 어두운 막 — 이 화면의 버튼들을 한 번에 다 뚫는다 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <mask id="cho-guide-holes">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {holes.map((h) => (
                <rect
                  key={h.no}
                  x={h.left}
                  y={h.top}
                  width={h.width}
                  height={h.height}
                  rx="14"
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(6, 26, 20, 0.80)"
            mask="url(#cho-guide-holes)"
          />
          {/* 뚫은 자리에 금색 테 */}
          {holes.map((h) => (
            <rect
              key={`ring-${h.no}`}
              x={h.left}
              y={h.top}
              width={h.width}
              height={h.height}
              rx="14"
              fill="none"
              stroke="#FFBA00"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* 번호 — 뚫은 자리 모서리에 붙인다 */}
        {holes.map((h) => (
          <span
            key={`no-${h.no}`}
            className="absolute w-7 h-7 rounded-full bg-[#FFBA00] text-[#4A3600] text-xs font-black flex items-center justify-center shadow-lg pointer-events-none"
            style={{
              left: Math.max(4, Math.min(h.left - 10, vw - 32)),
              // 위쪽에 자리가 없으면 아래 모서리에 붙인다
              top: h.top > 46 ? h.top - 14 : h.top + h.height - 14
            }}
          >
            {h.no}
          </span>
        ))}

        {/* 설명판 — 이 화면의 버튼을 번호대로 한꺼번에 적는다 */}
        <div
          className="absolute left-0 right-0 px-4"
          style={{
            bottom: panelBottom,
            paddingBottom: panelBottom ? 0 : "max(1rem, env(safe-area-inset-bottom))"
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pi}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto bg-[#0C3B2E] rounded-[26px] shadow-2xl overflow-hidden"
            >
              <div
                className="px-5 pt-4 pb-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
                style={{ maxHeight: Math.max(180, vh - panelBottom - 150) }}
              >
                <span className="block text-2xs font-black tracking-[0.15em] text-[#FFBA00]">
                  {pi + 1} / {pages.length}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{page.name}</h2>
                <p className="text-sm text-[#AFC0B2] mt-1 leading-relaxed">{page.intro}</p>

                <div className="mt-3.5 space-y-2.5">
                  {page.marks.map((m, k) => {
                    const shown = !!holeOf(k + 1);
                    return (
                      <div key={m.target} className="flex gap-2.5">
                        <span
                          className={`w-5 shrink-0 text-sm font-black leading-6 ${
                            shown ? "text-[#FFBA00]" : "text-[#4A6B57]"
                          }`}
                        >
                          {CIRCLED[k] || k + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-white">{m.name}</span>
                          <span className="block text-xs text-[#D2DDD3] leading-relaxed mt-0.5">
                            {m.desc}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {page.notes && page.notes.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1">
                    {page.notes.map((line, k) => (
                      <p key={k} className="text-xs text-[#AFC0B2] leading-relaxed">
                        · {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 pt-3 pb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(pi - 1)}
                  disabled={pi === 0}
                  className="p-3 rounded-3xl bg-white/10 text-white disabled:opacity-30 cursor-pointer"
                  aria-label="이전 화면"
                >
                  <ChevronLeft size={18} />
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
                    onClick={() => go(pi + 1)}
                    className="flex-1 py-3.5 rounded-3xl bg-[#FFBA00] text-[#4A3600] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    다음 화면
                    <ChevronRight size={18} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={finish}
                  className="px-2.5 py-3 text-2xs font-bold text-white/60 hover:text-white cursor-pointer shrink-0"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 자리를 재는 동안 잠깐 비어 보이지 않게 */}
        {!ready && <div className="absolute inset-0 bg-[#061A14]/80 pointer-events-none -z-10" />}
      </div>
    </ModalPortal>
  );
}
