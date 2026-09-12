import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const SEEN_KEY = "rjAskSeen";

function askSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // 저장이 막힌 기기에서는 접어 둔다 (본문을 밀어내지 않는 쪽이 안전하다)
  }
}

function markAskSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 무시
  }
}

/**
 * 리딩지저스의 읽는 법 — 두 질문.
 *
 * 리딩지저스는 방법이 이 두 줄이 전부다. 그래서 **처음 한 번은 펼쳐서** 보여 주고,
 * 그 다음부터는 접어 둔다. 본문 아래에 매일 두 줄이 펼쳐져 있으면 성경이 그만큼
 * 밀려 내려가고, 며칠이면 아무도 안 읽는다 (예전 '오늘의 통독 실천 제안' 상자가 그랬다).
 */
export default function RjAskCard() {
  const [open, setOpen] = useState<boolean>(() => !askSeen());

  // 처음 펼쳐 보인 그때 기억해 둔다 — 다음부터는 접힌 채로 뜬다
  useEffect(() => {
    if (open) markAskSeen();
  }, [open]);

  return (
    <div className="bg-[#E8F0E9] rounded-3xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <span className="flex-1 min-w-0 text-xs font-bold text-[#2F5D4A]">오늘 이렇게 읽어 보세요</span>
        {open ? (
          <ChevronDown size={15} className="text-[#6F8377] shrink-0" />
        ) : (
          <ChevronRight size={15} className="text-[#6F8377] shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <ol className="px-4 pb-4 space-y-2">
              <Ask n={1}>이 본문 속 인간의 한계와 죄는 무엇인가</Ask>
              <Ask n={2}>예수님은 어떤 모습으로 보이는가</Ask>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Ask({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-[18px] h-[18px] mt-px rounded-full bg-white text-[#2F7358] text-[10px] font-black flex items-center justify-center shrink-0">
        {n}
      </span>
      <span className="flex-1 text-xs font-semibold leading-relaxed text-[#14261E] break-keep">
        {children}
      </span>
    </li>
  );
}
