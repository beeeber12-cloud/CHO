import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, MessageSquare, Heart, User, Cross, Settings,
  ChevronLeft, ChevronRight, Check, Send, Search, Target, ListChecks
} from "lucide-react";
import BrandMark from "./BrandMark";
import { useSwipe } from "../lib/useSwipe";

/**
 * 처음 들어오신 분께 화면을 하나씩 소개한다.
 *
 * 화면마다 **그 화면의 예시 그림**을 먼저 보여 주고, 그림 위 번호(①②③)를 아래에서
 * 하나씩 풀어 설명한다 (앱 소개 화면에서 흔히 쓰는 방식).
 * 옆으로 밀어 넘기고, 언제든 건너뛸 수 있다.
 *
 * 순서는 아래 탭 순서와 같다 — 오늘 말씀 → 성경통독 → 묵상일기 → 감사칭찬 → 나의 기록.
 * 한 번 보시면 다시 뜨지 않는다 (설정 → 안내 → '앱 사용법 다시 보기' 로 언제든 열 수 있다).
 *
 * 색은 **지금 앱이 입고 있는 색을 그대로 따라간다** — 꾸미기에서 색을 바꾸거나
 * 어둡게로 두면 안내도 같이 바뀐다. 다만 색을 갈래 이름(변수)으로만 쓰고,
 * 뜻이 어긋나지 않게 짝을 맞춘다:
 *   바탕 = 머리말 그라데이션(+ 옅은 검은 막) · 그 위 글씨는 늘 흰색
 *   포인트 = --u-point, 그 위 글씨는 늘 진한 색
 * 어떤 색을 고르셔도 글씨가 사라지지 않게 하려는 것이니, 값을 직접 박지 말 것.
 */

const SEEN_KEY = "bible_med_guide_seen";
/** 안내 내용을 크게 고치면 이 값을 올린다. 그러면 모두에게 한 번 더 보인다. */
const GUIDE_VERSION = "6";

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

/* ── 예시 그림에 쓰는 색 ────────────────────────────────────
   지금 앱이 입고 있는 색을 그대로 가져다 쓴다 (꾸미기·어둡게가 그대로 반영된다).
   괄호 안은 색을 아직 못 읽었을 때 쓸 값. */
const M = {
  paper: "var(--u-card, #FFFFFF)",
  ink: "var(--u-title, #0C3B2E)",
  sub: "var(--u-muted, #6F8377)",
  box: "var(--u-box, #F9F9F9)",
  line: "var(--u-line, #E3E9E2)",
  /** 아이콘·초록 단추 (흰 글씨를 얹어도 읽히는 색) */
  green: "var(--u-accent2, #4A6B57)",
  /** 포인트 색 위에 얹는 글씨 — 어떤 포인트 색이든 읽히도록 늘 진하게 */
  greenDeep: "#2A2213",
  gold: "var(--u-point, #FFBA00)",
  goldSoft: "var(--u-soft, #FFF6DC)",
  /** 머리말·기본 단추 그라데이션 */
  grad: "var(--u-grad-main, linear-gradient(135deg, #2F7358, #153A2B))"
};

/** 번호표 — 예시 그림의 왼쪽 칸에 선다 */
function Pin({ n }: { n: number }) {
  return (
    <span
      className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
      style={{ background: M.gold, color: M.greenDeep }}
    >
      {n}
    </span>
  );
}

/**
 * 예시 그림의 한 줄.
 * 왼쪽은 번호 칸(비어 있어도 자리를 지킨다), 오른쪽이 화면 내용이다.
 */
function Row({ pin, children }: { pin?: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="w-[18px] shrink-0 flex justify-center pt-px">{pin ? <Pin n={pin} /> : null}</span>
      <span className="flex-1 min-w-0 block">{children}</span>
    </div>
  );
}

/** 휴대폰 화면처럼 보이는 종이 */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] overflow-hidden select-none"
      style={{ background: M.paper, boxShadow: "0 10px 30px rgba(0,0,0,0.28)" }}
      aria-hidden="true"
    >
      {/* 미니 머리말 */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundImage: M.grad }}
      >
        <span className="flex items-center gap-1 text-[9px] font-bold text-white/90">
          <BrandMark size={10} /> 우리 공동체
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-full bg-white/20" />
          <span
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black"
            style={{ background: M.gold, color: M.greenDeep }}
          >
            김
          </span>
        </span>
      </div>
      <div className="p-2.5 space-y-2">{children}</div>
    </div>
  );
}

/** 예시 그림 안의 작은 제목 */
function MockTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <span className="block">
      <span className="block text-[13px] font-bold leading-none" style={{ color: M.ink }}>
        {title}
      </span>
      {sub && (
        <span className="block text-[9px] mt-1 leading-none" style={{ color: M.sub }}>
          {sub}
        </span>
      )}
    </span>
  );
}

function Chip({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
      style={on ? { background: M.green, color: "#fff" } : { background: M.box, color: M.sub }}
    >
      {children}
    </span>
  );
}

function Btn({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "gold" | "soft" }) {
  const style =
    tone === "gold"
      ? { background: M.gold, color: M.greenDeep }
      : tone === "soft"
      ? { background: M.box, color: M.ink }
      : { backgroundImage: M.grad, color: "#fff" };
  return (
    <span
      className="flex-1 text-[9px] font-bold px-2 py-1.5 rounded-xl flex items-center justify-center gap-1 whitespace-nowrap"
      style={style}
    >
      {children}
    </span>
  );
}

/** 옅은 상자 */
function Box({ children }: { children: React.ReactNode }) {
  return (
    <span className="block rounded-xl p-2" style={{ background: M.box }}>
      {children}
    </span>
  );
}

/* ── 화면마다의 예시 그림 ──────────────────────────────────── */

function MockNotice() {
  return (
    <Screen>
      <Row pin={1}>
        <span className="block space-y-1">
          <MockTitle title="어 성경이 읽어지네 오늘의 말씀" sub="요한복음 3장 · 9월 8일" />
          <Box>
            <span className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-bold" style={{ color: M.ink }}>
                오늘의 말씀 설정
              </span>
              <span
                className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: M.gold, color: M.greenDeep }}
              >
                자동 공지 켜짐
              </span>
            </span>
          </Box>
        </span>
      </Row>

      <Row pin={2}>
        <span className="flex gap-1">
          <Chip on>개역개정</Chip>
          <Chip>우리말</Chip>
          <Chip>NIV</Chip>
        </span>
      </Row>

      <Row pin={3}>
        <span className="block space-y-1">
          <span className="block text-[9px] leading-snug" style={{ color: M.ink }}>
            <span style={{ color: M.sub }}>15 </span>
            그를 믿는 자마다 영생을 얻게 하려 하심이니라
          </span>
          <span
            className="block text-[9px] leading-snug rounded-md px-1 py-0.5"
            style={{ color: M.ink, background: M.goldSoft }}
          >
            <span style={{ color: M.green, fontWeight: 700 }}>16 </span>
            하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니
          </span>
        </span>
      </Row>

      <Row pin={4}>
        <span className="flex gap-1.5">
          <Btn>
            <Check size={9} /> 읽었습니다
          </Btn>
          <Btn tone="gold">
            <Send size={9} /> 이 말씀으로 묵상
          </Btn>
        </span>
      </Row>
    </Screen>
  );
}

function MockBible() {
  return (
    <Screen>
      <Row pin={2}>
        <span className="flex items-start justify-between gap-2">
          <MockTitle title="어성경 통독" sub="어 성경이 읽어지네 통독 · 12주 시편" />
          <span
            className="text-[8px] font-bold px-2 py-1 rounded-full shrink-0"
            style={{ background: M.box, color: M.green }}
          >
            어 성경이 읽어지네 플랜 ⌄
          </span>
        </span>
      </Row>

      <Row pin={1}>
        <Box>
          <span className="block text-[9px] font-bold" style={{ color: M.ink }}>
            어 성경이 읽어지네 통독 진행률 38%
          </span>
          <span className="block text-[8px]" style={{ color: M.sub }}>
            452장 / 1138장 · 통독표대로
          </span>
          <span className="block h-1 rounded-full mt-1" style={{ background: M.line }}>
            <span
              className="block h-1 rounded-full"
              style={{ width: "38%", backgroundImage: `linear-gradient(90deg, ${M.green}, ${M.gold})`, }}
            />
          </span>
        </Box>
      </Row>

      <Row pin={3}>
        <span className="block space-y-1.5">
          <span className="flex items-center justify-between">
            <span className="text-[8px]" style={{ color: M.sub }}>
              마지막 읽은 곳 <b style={{ color: M.ink }}>사무엘상 12장</b>
            </span>
            <span className="text-[8px] font-bold" style={{ color: M.green }}>
              이어서 읽기 ›
            </span>
          </span>
          <span className="flex gap-1.5">
            <Btn>구약 (39권)</Btn>
            <Btn>신약 (27권)</Btn>
          </span>
        </span>
      </Row>

      <Row pin={4}>
        <span
          className="rounded-xl px-2 py-1.5 flex items-center justify-between"
          style={{ background: M.box }}
        >
          <ChevronLeft size={10} color={M.sub} />
          <span className="text-[8px]" style={{ color: M.sub }}>
            밀어서 장 넘기기
          </span>
          <ChevronRight size={10} color={M.sub} />
        </span>
      </Row>
    </Screen>
  );
}

function MockFeed() {
  return (
    <Screen>
      <Row>
        <MockTitle title="묵상 나눔" sub="오늘 받은 은혜를 함께 나눠요" />
      </Row>

      <Row pin={2}>
        <span className="flex gap-1">
          <Chip on>전체공유방</Chip>
          <Chip>내 묵상방</Chip>
          <Chip>남자청년</Chip>
        </span>
      </Row>

      <Row pin={3}>
        <Box>
          <span className="flex items-center gap-1">
            <span className="text-[9px] font-bold" style={{ color: M.ink }}>
              김성도
            </span>
            <span className="text-[8px]" style={{ color: M.sub }}>
              9월 8일
            </span>
          </span>
          <span className="block text-[8px] font-bold mt-1" style={{ color: M.green }}>
            요한복음 3:16
          </span>
          <span className="block text-[8px] leading-snug mt-0.5" style={{ color: M.ink }}>
            이 사랑을 붙들고 오늘 하루를 살아가려 합니다. @이집사 님 고맙습니다.
          </span>
          <span className="flex items-center gap-2 pt-1" style={{ color: M.sub }}>
            <span className="text-[8px] flex items-center gap-0.5">
              <Heart size={8} /> 3
            </span>
            <span className="text-[8px]">🙏 2</span>
            <span className="text-[8px] flex items-center gap-0.5">
              <MessageSquare size={8} /> 댓글 1
            </span>
          </span>
        </Box>
      </Row>

      <Row pin={1}>
        <span className="flex gap-1.5">
          <Btn>+ 묵상 나누기</Btn>
          <Btn tone="soft">기도제목</Btn>
        </span>
      </Row>
    </Screen>
  );
}

function MockGratitude() {
  return (
    <Screen>
      <Row>
        <MockTitle title="감사 칭찬" sub="오늘의 감사를 나눠요" />
      </Row>

      <Row pin={2}>
        <Box>
          <span className="block text-[9px] font-bold" style={{ color: M.ink }}>
            박집사
          </span>
          <span className="block text-[8px] leading-snug mt-0.5" style={{ color: M.ink }}>
            아픈 저를 위해 기도해 주신 @김성도 님께 감사드립니다.
          </span>
        </Box>
      </Row>

      <Row pin={3}>
        <Box>
          <span className="block text-[9px] font-bold" style={{ color: M.ink }}>
            이권사
          </span>
          <span className="block text-[8px] leading-snug mt-0.5" style={{ color: M.ink }}>
            오늘도 건강하게 예배드릴 수 있어 감사합니다.
          </span>
          <span className="text-[8px] flex items-center gap-0.5 pt-1" style={{ color: M.sub }}>
            <Heart size={8} /> 5
          </span>
        </Box>
      </Row>

      <Row pin={1}>
        <span className="flex gap-1.5">
          <Btn>+ 감사 나누기</Btn>
        </span>
      </Row>
    </Screen>
  );
}

function MockMy() {
  return (
    <Screen>
      <Row>
        <MockTitle title="나의 기록" sub="김성도님의 나눔 발자취" />
      </Row>

      <Row pin={2}>
        <Box>
          <span className="flex items-center gap-1.5">
            <ListChecks size={11} color={M.green} />
            <span className="text-[9px] font-bold" style={{ color: M.ink }}>
              말씀 체크리스트
            </span>
            <span className="text-[8px] ml-auto" style={{ color: M.sub }}>
              452장 읽음
            </span>
          </span>
        </Box>
      </Row>

      <Row pin={3}>
        <Box>
          <span className="flex items-center gap-1.5">
            <Target size={11} color={M.green} />
            <span className="text-[9px] font-bold" style={{ color: M.ink }}>
              내 나눔 목표
            </span>
            <span className="text-[8px] ml-auto" style={{ color: M.sub }}>
              이번 달 3 / 12회
            </span>
          </span>
        </Box>
      </Row>

      <Row pin={1}>
        <span className="block space-y-1.5">
          <span
            className="rounded-xl px-2 py-1.5 flex items-center gap-1"
            style={{ background: M.box, color: M.sub }}
          >
            <Search size={9} />
            <span className="text-[8px]">내 기록 내용 및 구절 검색...</span>
          </span>
          <span className="flex gap-1">
            <Chip on>말씀 묵상 12</Chip>
            <Chip>감사 칭찬 5</Chip>
          </span>
        </span>
      </Row>
    </Screen>
  );
}

/* ── 안내 내용 ─────────────────────────────────────────────── */

interface Slide {
  /** 인사말 화면에만 쓰는 아이콘 (lucide 든 우리 표시든 받는다) */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tab: string;
  title: string;
  /** 화면 예시 그림 (없으면 인사말 화면) */
  mock?: () => React.ReactElement;
  /** 그림 위 번호와 짝이 되는 설명 */
  pins?: string[];
  /** 번호와 상관없이 알아 두시면 좋은 것 */
  notes?: string[];
  /** 인사말 화면에서만 쓰는 긴 글 */
  lines?: string[];
}

const SLIDES: Slide[] = [
  {
    icon: Cross,
    tab: "",
    title: "소그룹이 함께 말씀을 읽고 나누는 곳입니다",
    lines: [
      "혼자 읽고 끝나지 않도록 만들었습니다.",
      "오늘 함께 읽을 말씀이 정해지고,",
      "각자 읽은 뒤 묵상과 기도제목을 나눕니다.",
      "",
      "여기 올라온 글은 우리 공동체 안에서만 보입니다.",
      "다른 공동체의 글은 서로 보이지 않습니다.",
      "",
      "화면마다 무엇을 하는 곳인지 그림과 함께",
      "번호대로 짚어 드리겠습니다.",
      "옆으로 밀어서 넘기시면 됩니다."
    ]
  },
  {
    icon: BookOpen,
    tab: "오늘 말씀",
    title: "오늘 함께 읽을 말씀이 정해집니다",
    mock: MockNotice,
    pins: [
      "그날 함께 읽을 말씀이 아침마다 저절로 올라옵니다. 속장·리더가 직접 올리셔도 됩니다.",
      "번역본을 눌러 바꿉니다. 개역개정·우리말·NIV 중 두 개를 나란히 놓고 볼 수도 있습니다.",
      "마음에 닿은 구절을 누르면 노랗게 표시됩니다. 고른 구절은 그대로 묵상 글로 가져갑니다.",
      "다 읽으셨으면 '오늘 말씀 읽기 완료'를 눌러 주세요. 함께 읽은 분이 몇 명인지 아래에 모입니다."
    ],
    notes: [
      "속장·리더는 '오늘의 말씀 설정'에서 통독 프로그램을 고릅니다 — 리딩지저스, 어 성경이 읽어지네.",
      "시작날과 읽는 요일만 정하면 그다음은 앱이 날마다 알아서 올려 드립니다."
    ]
  },
  {
    icon: BrandMark,
    tab: "성경통독",
    title: "각자 자기 자리에서 성경을 읽습니다",
    mock: MockBible,
    pins: [
      "진행률 상자를 누르면 이번 주 계획과 지금까지 읽은 장이 한눈에 보입니다.",
      "오른쪽 위에서 통독 플랜을 고릅니다 — 일반 통독 · 리딩지저스 · 어 성경이 읽어지네.",
      "구약·신약에서 권과 장을 고릅니다. '이어서 읽기'는 마지막에 읽던 곳을 바로 펴 줍니다.",
      "본문을 좌우로 밀면 장이 넘어갑니다. 다 읽으신 장은 완료로 체크됩니다."
    ],
    notes: [
      "플랜을 고르면 시작날·읽는 요일·쉬는 기간에 맞춰 그날 읽을 곳을 앱이 정해 드립니다.",
      "성경을 읽는 동안에는 화면이 저절로 꺼지지 않습니다."
    ]
  },
  {
    icon: MessageSquare,
    tab: "묵상일기",
    title: "묵상과 기도제목을 나눕니다",
    mock: MockFeed,
    pins: [
      "'묵상 나누기'로 오늘 받은 말씀과 기도제목을 적습니다. 두세 줄이면 충분합니다.",
      "어디에 올릴지 고릅니다 — 전체공유방은 모두가, 내 묵상방은 나와 내가 초대한 지체만 봅니다.",
      "좋아요·기도할게요·댓글로 서로 붙들어 줍니다. @이름을 넣으면 그분을 부를 수 있습니다."
    ],
    notes: [
      "기도제목은 글 아래에 따로 담깁니다. 몇 분이 함께 기도했는지 글쓴이에게만 보입니다.",
      "나만 보는 '영성일기'가 필요하시면 설정 → 묵상에서 켜시면 됩니다."
    ]
  },
  {
    icon: Heart,
    tab: "감사칭찬",
    title: "감사와 칭찬으로 모임이 즐거워집니다",
    mock: MockGratitude,
    pins: [
      "'감사 나누기'로 오늘 감사한 일을 한 줄 남깁니다. 길지 않아도 됩니다.",
      "@이름을 넣으면 그분을 콕 집어 칭찬할 수 있습니다.",
      "좋아요와 댓글로 함께 기뻐합니다."
    ],
    notes: ["작은 감사가 쌓이면 모임의 공기가 달라집니다."]
  },
  {
    icon: User,
    tab: "나의 기록",
    title: "내가 걸어온 길이 그대로 남습니다",
    mock: MockMy,
    pins: [
      "내가 쓴 묵상과 감사가 모두 여기 모입니다. 검색으로 지난 글을 찾습니다.",
      "말씀 체크리스트 — 지금까지 읽은 장이 권별로 한눈에 보입니다.",
      "내 나눔 목표 — 이번 달 몇 번 나눌지 정하고 진행률을 봅니다."
    ],
    notes: [
      "하나님이 주신 마음과 음성, 부족함과 넘어짐까지 그대로 적어 두세요. 몇 해 뒤 돌아보면 내 인생의 귀한 자산이 됩니다.",
      "글씨 크기 · 어두운 화면 · 알림은 오른쪽 위 톱니(⚙)에서 맞추실 수 있습니다.",
      "이 안내는 설정 → 안내 → '앱 사용법 다시 보기' 에서 언제든 다시 보실 수 있습니다."
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
  const Mock = s.mock;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col text-white"
      style={{ backgroundImage: M.grad, backgroundColor: "#0C3C2F" }}
    >
      {/* 어떤 색을 고르셔도 흰 글씨가 읽히도록 옅은 검은 막을 한 겹 깐다 */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* 건너뛰기 */}
      <div className="relative flex justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))] shrink-0">
        <button
          onClick={finish}
          className="text-sm font-semibold text-white/70 hover:text-white px-3 py-1.5 cursor-pointer"
        >
          건너뛰기
        </button>
      </div>

      {/* 내용 — 옆으로 밀어 넘긴다 (내용이 길면 위아래로 굴려 본다) */}
      <div
        className="relative flex-1 overflow-y-auto overflow-x-hidden px-6 scrollbar-thin"
        style={{ touchAction: "pan-y" }}
        {...swipeHandlers}
      >
        <div ref={dragRef} className="w-full max-w-md mx-auto pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              {s.tab ? (
                <span
                  className="inline-block text-2xs font-black tracking-[0.15em] mb-1.5"
                  style={{ color: M.gold }}
                >
                  {s.tab}
                </span>
              ) : (
                <div className="w-14 h-14 rounded-3xl bg-white/15 flex items-center justify-center mb-5">
                  <s.icon size={26} className="text-white" />
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-4">{s.title}</h2>

              {/* 화면 예시 그림 */}
              {Mock && (
                <div className="mb-4">
                  <Mock />
                </div>
              )}

              {/* 그림 위 번호와 짝이 되는 설명 */}
              {s.pins && (
                <ol className="space-y-2.5">
                  {s.pins.map((text, k) => (
                    <li key={k} className="flex gap-2.5">
                      <span
                        className="shrink-0 w-[19px] h-[19px] rounded-full flex items-center justify-center text-[11px] font-black mt-px"
                        style={{ background: M.gold, color: M.greenDeep }}
                      >
                        {k + 1}
                      </span>
                      <span className="text-sm text-white/85 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ol>
              )}

              {/* 인사말 화면 */}
              {s.lines && (
                <div className="space-y-1.5">
                  {s.lines.map((line, k) =>
                    line === "" ? (
                      <div key={k} className="h-2" />
                    ) : (
                      <p key={k} className="text-white/85 leading-relaxed">
                        {line}
                      </p>
                    )
                  )}
                </div>
              )}

              {/* 그 밖에 알아 두시면 좋은 것 */}
              {s.notes && (
                <div className="mt-4 rounded-2xl bg-white/12 px-3.5 py-3 space-y-1.5">
                  {s.notes.map((note, k) => (
                    <p key={k} className="text-2xs text-white/75 leading-relaxed">
                      · {note}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 아래 — 점과 버튼 */}
      <div className="relative shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 space-y-3">
        <div className="flex justify-center gap-1.5">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-label={`${k + 1}번째 안내`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                k === i ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go(i - 1)}
            disabled={i === 0}
            className="p-3 rounded-3xl bg-white/15 text-white disabled:opacity-30 cursor-pointer"
            aria-label="이전"
          >
            <ChevronLeft size={20} />
          </button>

          {last ? (
            <button
              onClick={finish}
              className="flex-1 py-3.5 rounded-3xl bg-white font-bold cursor-pointer"
              style={{ color: "var(--u-title-bg, #0C3C2F)" }}
            >
              시작하기
            </button>
          ) : (
            <button
              onClick={() => go(i + 1)}
              className="flex-1 py-3.5 rounded-3xl font-bold flex items-center justify-center gap-1 cursor-pointer"
              style={{ background: M.gold, color: M.greenDeep }}
            >
              다음
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        <p className="text-center text-2xs text-white/60">
          옆으로 밀어서 넘기실 수 있습니다 · {i + 1} / {SLIDES.length}
        </p>
      </div>
    </div>
  );
}
