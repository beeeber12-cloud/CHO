import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronRight } from "lucide-react";

/**
 * 하루에 처음 앱을 여실 때 딱 한 번 뜨는 화면.
 *
 * 처음 오신 분이 막히는 곳은 기능이 아니라 **"지금 뭘 눌러야 하지"** 다.
 * 그래서 앱을 열면 다른 것보다 먼저 **오늘 함께 읽을 말씀**을 알려 드리고,
 * 누르면 그대로 오늘말씀 화면으로 들어간다.
 *
 * 안내는 스스로 사라져야 한다 —
 * 하루에 한 번만 뜨고(이 기기 기준), 이미 읽음 표시를 하셨으면 뜨지 않는다.
 */

const SEEN_KEY = "todayVerseIntroOn";

function seenOn(date: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === date;
  } catch {
    // 저장이 막힌 기기에서는 띄우지 않는다 (열 때마다 뜨는 것이 더 성가시다)
    return true;
  }
}

function markSeen(date: string): void {
  try {
    localStorage.setItem(SEEN_KEY, date);
  } catch {
    // 무시 — 이번 한 번은 닫히는 것만으로 충분하다
  }
}

interface TodayNotice {
  id: string;
  date: string;
  verseTitle: string;
  verseText?: string;
  readBy?: string[];
}

/** "9월 11일 금요일" */
function koreanDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${Number(m[2])}월 ${Number(m[3])}일 ${weekdays[d.getDay()]}요일`;
}

/** 본문 첫 구절만 한 줄로 (절 번호는 떼고, 너무 길면 줄인다) */
function firstVerse(text?: string): string {
  const line = (text || "")
    .split("\n")
    .map((l) => l.replace(/^\s*\d+\s*/, "").trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return line.length > 52 ? line.slice(0, 52).trim() + "…" : line;
}

interface Props {
  currentUser: { id: string; name: string };
  /** 튜토리얼처럼 먼저 봐야 할 것이 떠 있으면 미룬다 */
  enabled?: boolean;
  /** 눌러서 들어가면 — 오늘말씀 화면으로 */
  onEnter: () => void;
  /** 떠 있는 동안에는 다른 안내가 겹치지 않게 알려 준다 */
  onOpenChange?: (open: boolean) => void;
  /**
   * '다시 보기' — 이 숫자가 바뀔 때마다 한 번 더 띄운다.
   * 오늘 이미 보셨거나 읽음 표시를 하셨어도 그때는 띄운다 (일부러 부르신 것이니).
   */
  replay?: number;
}

/** 앱 색을 그대로 따른다 (튜토리얼과 같은 방식) */
const C = {
  grad: "var(--u-grad-main, linear-gradient(135deg, #2F7358, #153A2B))",
  gold: "var(--u-point, #FFBA00)",
  onGold: "#2A2213"
};

export default function TodayVerseIntro({
  currentUser,
  enabled = true,
  onEnter,
  onOpenChange,
  replay = 0
}: Props) {
  const [notice, setNotice] = useState<TodayNotice | null>(null);
  const [done, setDone] = useState<boolean>(false);
  /** 설정에서 일부러 부르셨는가 (그때는 '오늘 봤음' 을 따지지 않는다) */
  const [forced, setForced] = useState<boolean>(false);

  useEffect(() => {
    if (replay <= 0) return;
    setForced(true);
    setDone(false);
  }, [replay]);
  /**
   * 딱지에 뭐라고 쓸지 — 공동체가 통독을 어떤 방식으로 하느냐에 따라 다르다.
   * 리딩지저스 통독표를 따르는 중이면 그 이름을 그대로 쓴다.
   */
  const [label, setLabel] = useState<string>("오늘 나눌 말씀");

  useEffect(() => {
    let alive = true;
    fetch("/api/bible-plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        if (d.active && d.mode === "readingJesus") setLabel("리딩지저스");
      })
      .catch(() => {
        // 못 받아오면 평소 이름 그대로 둔다
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || done) return;
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/notices/today");
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !data || !data.id) return;
        // 오늘 이미 봤거나, 이미 읽으셨으면 띄우지 않는다 (다시 보기는 예외)
        if (!forced && seenOn(data.date)) return;
        if (!forced && (data.readBy || []).includes(currentUser.id)) return;
        setNotice(data);
      } catch {
        // 말씀을 못 받아오면 조용히 넘어간다 — 평소 화면이 먼저다
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, done, forced, currentUser.id]);

  const open = enabled && !!notice && !done;

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const enter = () => {
    if (notice) markSeen(notice.date);
    setForced(false);
    setDone(true);
    onEnter();
  };

  return (
    <AnimatePresence>
      {open && notice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[85] text-white"
          style={{ backgroundImage: C.grad, backgroundColor: "#0C3C2F" }}
        >
          {/* 글씨가 또렷하게 읽히도록 바탕을 한 겹 눌러 준다 */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />

          {/* 화면 아무 데나 누르셔도 들어간다 */}
          <button
            type="button"
            onClick={enter}
            className="relative z-10 w-full h-full flex flex-col items-center justify-between px-7 text-center cursor-pointer pt-[calc(env(safe-area-inset-top)+2.75rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]"
          >
            <span className="text-2xs font-medium text-white/50">{koreanDate(notice.date)}</span>

            <span className="flex flex-col items-center gap-5">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="text-2xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: C.gold, color: C.onGold }}
            >
              {label}
            </motion.span>

            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.34 }}
              className="block"
            >
              <span className="block text-sm text-white/80 break-keep">
                {currentUser.name}님, 오늘 함께 읽을 말씀은
              </span>
              <span
                className="block text-3xl sm:text-4xl font-bold mt-3 leading-tight break-keep"
                style={{ color: C.gold }}
              >
                {notice.verseTitle}
              </span>
              <span className="block text-lg font-bold text-white mt-2">입니다</span>

              {/* 본문 첫 구절 한 줄 — 무슨 말씀인지 미리 마음에 얹어 드린다 */}
              {firstVerse(notice.verseText) && (
                <span className="scripture-font block text-sm text-white/70 leading-relaxed break-keep mt-5 max-w-[17rem] mx-auto">
                  “{firstVerse(notice.verseText)}”
                </span>
              )}
            </motion.span>

            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.34 }}
              className="mt-3 flex items-center gap-2 bg-white text-[#12503B] px-6 py-3.5 rounded-3xl text-base font-bold shadow-xl"
            >
              <BookOpen size={18} />
              말씀 보러 가기
              <ChevronRight size={18} />
            </motion.span>
            </span>

            <span className="text-2xs text-white/60">화면 아무 곳이나 누르셔도 됩니다</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
