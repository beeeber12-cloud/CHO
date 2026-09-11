import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronRight, Clock } from "lucide-react";
import { readingTable, tableIdOf } from "../lib/readingTables";
import { cheerOf } from "../data/dailyCheer";

/**
 * 하루에 처음 앱을 여실 때 딱 한 번 뜨는 화면.
 *
 * 처음 오신 분이 막히는 곳은 기능이 아니라 **"지금 뭘 눌러야 하지"** 다.
 * 그래서 앱을 열면 다른 것보다 먼저 **오늘 함께 읽을 말씀**을 알려 드리고,
 * 누르면 그대로 오늘말씀 화면으로 들어간다.
 *
 * 오늘 말씀이 아직 없으면 **지난 말씀을 오늘 것처럼 보여 주지 않는다.**
 * (서버는 오늘 것이 없으면 가장 최근 공지를 대신 내어 준다 — 그대로 믿으면
 *  어제 말씀이 '오늘 함께 읽을 말씀' 으로 뜬다) 그때는 아직 전이라고 알려 드리고,
 * 관리자께는 올리러 가시라고 청한다.
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

/** 한국 날짜 "2026-09-11" — 기기 시계가 어느 나라에 맞춰져 있어도 우리 기준으로 본다 */
function todayInKorea(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  } catch {
    return "";
  }
}

interface TodayNotice {
  id: string;
  date: string;
  verseTitle: string;
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

interface Props {
  currentUser: { id: string; name: string; role?: "admin" | "member" };
  /** 튜토리얼처럼 먼저 봐야 할 것이 떠 있으면 미룬다 */
  enabled?: boolean;
  /** 눌러서 들어가면 — 어느 화면으로 갈지 함께 알린다 */
  onEnter: (tab: "notice" | "bible") => void;
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
  /** 오늘 말씀이 아직 안 올라온 날 */
  const [pending, setPending] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  /** 설정에서 일부러 부르셨는가 (그때는 '오늘 봤음' 을 따지지 않는다) */
  const [forced, setForced] = useState<boolean>(false);
  /**
   * 딱지에 뭐라고 쓸지 — 공동체가 통독을 어떤 방식으로 하느냐에 따라 다르다.
   * 리딩지저스 통독표를 따르는 중이면 그 이름을 그대로 쓴다.
   */
  const [label, setLabel] = useState<string>("오늘 나눌 말씀");

  const isAdmin = currentUser.role === "admin";

  useEffect(() => {
    if (replay <= 0) return;
    setForced(true);
    setDone(false);
  }, [replay]);

  useEffect(() => {
    let alive = true;
    fetch("/api/bible-plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        // 통독표를 따르는 중이면 그 표의 이름을 딱지에 쓴다
        const id = tableIdOf(d.mode, d.wtbtLength);
        if (d.active && id) setLabel(readingTable(id).short);
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
        if (!alive) return;

        const today = todayInKorea();
        // 서버는 오늘 것이 없으면 지난 공지를 대신 내어 준다 — 날짜로 가려낸다
        const isToday = !!data && !!data.id && (!today || data.date === today);

        if (isToday) {
          // 오늘 이미 봤거나, 이미 읽으셨으면 띄우지 않는다 (다시 보기는 예외)
          if (!forced && seenOn(data.date)) return;
          if (!forced && (data.readBy || []).includes(currentUser.id)) return;
          setPending(false);
          setNotice(data);
          return;
        }

        // 아직 오늘 말씀이 없는 날.
        // 이때는 '오늘 봤음' 으로 적어두지 않는다 — 조금 뒤에 올라오면
        // 다시 여실 때 진짜 말씀을 보셔야 하기 때문이다.
        if (!forced && seenOn(today)) return;
        setNotice(null);
        setPending(true);
      } catch {
        // 말씀을 못 받아오면 조용히 넘어간다 — 평소 화면이 먼저다
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, done, forced, currentUser.id]);

  const open = enabled && (!!notice || pending) && !done;

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  /**
   * 말씀이 올라온 날은 오늘말씀으로.
   * 아직 안 올라온 날은 — 관리자께는 올리실 수 있는 오늘말씀으로,
   * 지체께는 지금 하실 수 있는 성경통독으로 모신다.
   */
  const goTo: "notice" | "bible" = notice || isAdmin ? "notice" : "bible";

  const enter = () => {
    // 말씀이 올라온 날만 '오늘 봤음' 으로 적는다
    if (notice) markSeen(notice.date);
    setForced(false);
    setDone(true);
    onEnter(goTo);
  };

  const dateLine = koreanDate(notice ? notice.date : todayInKorea());
  /** 오늘의 위로 한 구절 — 날짜로 고르므로 공동체 모두가 같은 것을 본다 */
  const cheer = cheerOf(todayInKorea());

  return (
    <AnimatePresence>
      {open && (
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
            <span className="text-2xs font-medium text-white/50">{dateLine}</span>

            <span className="flex flex-col items-center gap-6 w-full max-w-[20rem]">
              {/* 오늘의 위로 — 날마다 다른 한 문장과 말씀 한 구절 */}
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.36 }}
                className="block"
              >
                <span className="block text-xl sm:text-2xl font-bold leading-snug break-keep text-white">
                  {cheer.line}
                </span>
                <span className="scripture-font block text-sm text-white/75 leading-relaxed break-keep mt-4">
                  “{cheer.text}”
                </span>
                <span className="block text-2xs text-white/50 mt-2">{cheer.ref}</span>
              </motion.span>

              {/* 오늘 읽을 말씀 — 어디인지만 담백하게 */}
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.34 }}
                className="block w-full pt-5 border-t border-white/15"
              >
                <span
                  className="inline-block text-2xs font-bold px-2.5 py-1 rounded-full"
                  style={
                    notice
                      ? { background: C.gold, color: C.onGold }
                      : { background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }
                  }
                >
                  {notice ? label : "아직 오늘 말씀 전"}
                </span>

                {notice ? (
                  <span className="block mt-2.5">
                    <span className="block text-2xs text-white/70 break-keep">
                      {currentUser.name}님, 오늘 함께 읽을 말씀은
                    </span>
                    <span
                      className="block text-lg sm:text-xl font-bold mt-1 leading-snug break-keep"
                      style={{ color: C.gold }}
                    >
                      {notice.verseTitle}
                      <span className="text-white font-bold"> 입니다</span>
                    </span>
                  </span>
                ) : (
                  <span className="block mt-2.5">
                    <span className="block text-base sm:text-lg font-bold leading-snug break-keep text-white">
                      오늘의 말씀이 설정되지 않았습니다
                    </span>
                    <span className="block text-2xs text-white/70 leading-relaxed break-keep mt-1.5">
                      {isAdmin
                        ? "지체들이 기다리고 있습니다. 오늘 말씀을 올려 주세요."
                        : "관리자님의 설정을 기다리고 있습니다."}
                    </span>
                  </span>
                )}
              </motion.span>

              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.34 }}
                className="flex items-center gap-2 bg-white text-[#12503B] px-6 py-3.5 rounded-3xl text-base font-bold shadow-xl"
              >
                {notice ? <BookOpen size={18} /> : <Clock size={18} />}
                {notice ? "말씀 보러 가기" : isAdmin ? "오늘 말씀 올리러 가기" : "성경통독으로 바로가기"}
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
