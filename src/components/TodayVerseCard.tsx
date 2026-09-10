import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronRight } from "lucide-react";

/**
 * "오늘 함께 읽을 말씀은 여기입니다" — 다른 화면에 있을 때 알려 주는 카드.
 *
 * 처음 오신 분이 막히는 곳은 기능이 아니라 **"지금 뭘 눌러야 하지"** 다.
 * 어느 탭에 계시든 오늘 읽을 말씀이 무엇인지 눈에 띄게 알려 드리고,
 * 누르면 곧장 오늘말씀으로 넘어간다.
 *
 * 안내는 스스로 사라져야 한다 — **읽음 표시를 하시면 그날은 다시 뜨지 않는다.**
 * (오늘말씀 화면에서 읽음을 누르면 `cho:notice-read` 로 알려 주므로 그때 다시 확인한다)
 */

/** 읽음 표시가 바뀌었을 때 이 카드에게 알리는 신호 */
export const NOTICE_READ_EVENT = "cho:notice-read";

interface Props {
  currentUser: { id: string };
  onOpen: () => void;
}

interface TodayNotice {
  id: string;
  verseTitle: string;
  readBy?: string[];
}

/** 앱 색을 그대로 따른다 (튜토리얼과 같은 방식) */
const C = {
  grad: "var(--u-grad-main, linear-gradient(135deg, #2F7358, #153A2B))",
  gold: "var(--u-point, #FFBA00)",
  onGold: "#2A2213"
};

export default function TodayVerseCard({ currentUser, onOpen }: Props) {
  const [notice, setNotice] = useState<TodayNotice | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notices/today");
      if (!res.ok) return setNotice(null);
      const data = await res.json();
      setNotice(data && data.id ? data : null);
    } catch {
      setNotice(null);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(NOTICE_READ_EVENT, load);
    return () => window.removeEventListener(NOTICE_READ_EVENT, load);
  }, [load]);

  const unread = !!notice && !(notice.readBy || []).includes(currentUser.id);

  return (
    <AnimatePresence>
      {unread && notice && (
        <motion.button
          type="button"
          onClick={onOpen}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundImage: C.grad }}
          className="w-full text-left rounded-3xl px-4 py-4 shadow-lg cursor-pointer hover:brightness-110 transition"
        >
          <span
            className="inline-block text-2xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: C.gold, color: C.onGold }}
          >
            관리자가 정한 오늘의 말씀
          </span>

          <span className="mt-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs text-white/75 break-keep">오늘 함께 읽을 말씀은</span>
              <span className="block text-lg sm:text-xl font-bold leading-snug break-keep mt-0.5">
                <span style={{ color: C.gold }}>{notice.verseTitle}</span>
                <span className="text-white"> 입니다</span>
              </span>
            </span>

            <span className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0">
              <ChevronRight size={20} />
            </span>
          </span>

          <span className="mt-2.5 flex items-center gap-1.5 text-2xs font-bold text-white/80">
            <BookOpen size={13} />
            눌러서 바로 읽기
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
