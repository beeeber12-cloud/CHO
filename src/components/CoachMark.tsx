import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * 그 자리에서 한 번만 뜨는 손가락 안내.
 *
 * 시작할 때 여러 장을 몰아 보여 드리면 다 잊어버리신다.
 * 그 화면에 **처음 도착한 그 순간** 한 문장만 띄우고, 보고 나면 다시 뜨지 않는다.
 * (기억은 이 기기에만 남는다 — 다른 분 화면에는 영향이 없다)
 */

const key = (id: string) => `coach:${id}`;

function seen(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    // 저장이 막힌 기기에서는 안내를 띄우지 않는다 (매번 뜨는 것이 더 성가시다)
    return true;
  }
}

interface Props {
  /** 기억해 두는 이름 — 화면마다 다르게 */
  id: string;
  text: React.ReactNode;
  /** 조건이 갖춰졌을 때만 (본문이 다 나왔을 때 등) */
  show?: boolean;
  /** 손가락 그림 — 옆으로 미는 동작, 누르는 동작 */
  gesture?: "swipe" | "tap";
  /** 자리 (부모에 relative 를 두고 여기서 absolute 로 잡는다) */
  className?: string;
  /** 가만히 두어도 사라지는 시간 */
  autoHideMs?: number;
}

export default function CoachMark({
  id,
  text,
  show = true,
  gesture,
  className = "",
  autoHideMs = 12000
}: Props) {
  const [done, setDone] = useState<boolean>(() => seen(id));
  const visible = show && !done;

  const finish = () => {
    try {
      localStorage.setItem(key(id), "1");
    } catch {
      // 무시 — 화면에서 지우는 것만으로도 충분하다
    }
    setDone(true);
  };

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(finish, autoHideMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoHideMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.22 }}
          className={`z-30 pointer-events-none flex flex-col items-center gap-2 ${className}`}
        >
          <button
            type="button"
            onClick={finish}
            className="pointer-events-auto max-w-[19rem] bg-[#14261E] text-white rounded-2xl shadow-2xl px-4 py-3 text-xs leading-relaxed break-keep text-center cursor-pointer"
          >
            <span className="block">{text}</span>
            <span className="mt-2 block w-full bg-white/15 rounded-xl py-1.5 text-2xs font-bold">
              알겠습니다
            </span>
          </button>

          {gesture === "swipe" && <span className="coach-finger" aria-hidden="true" />}
          {gesture === "tap" && <span className="coach-tap" aria-hidden="true" />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
