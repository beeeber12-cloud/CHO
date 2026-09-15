import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import ModalPortal from "./ModalPortal";
import { HighlightColor, HIGHLIGHT_COLORS, HIGHLIGHT_ORDER } from "../lib/verseHighlight";

/**
 * 고른 구절이 있는 동안 화면 아래에 떠 있는 막대.
 *
 * 예전에는 구절을 골라도 **맨 아래 단추의 글씨만** 바뀌었다.
 * 본문이 길면 그 단추가 화면 밖에 있어서, 고르고도 다음에 뭘 해야 할지 알 수 없었다.
 * 이제는 첫 구절을 고르는 순간 막대가 올라오고, 훑어 내려도 늘 따라온다.
 *
 * 형광펜 색도 여기서 고른다. 색을 누르면 **이 장에서 체크해 둔 구절이 그 색으로 바뀌고**,
 * 다음에 체크하는 구절도 그 색으로 칠해진다.
 *
 * 화면(body) 밑에 그린다 — 탭 전환에 걸린 transform 때문에 여기서 fixed 를 쓰면
 * 화면이 아니라 탭 내용을 기준으로 자리를 잡는다 (ModalPortal 주석 참고).
 * 하단 탭 바(z-50) 보다는 낮게 두어 탭을 가리지 않는다.
 */
interface Props {
  count: number;
  /** 지금 칠하는 색 */
  color: HighlightColor;
  onColor: (c: HighlightColor) => void;
  onClear: () => void;
  onWrite: () => void;
}

export default function PickedVerseBar({ count, color, onColor, onClear, onWrite }: Props) {
  return (
    <ModalPortal>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
            className="fixed left-3 right-3 z-[45] bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6"
          >
            <div className="max-w-md mx-auto grad-forest text-white rounded-3xl shadow-2xl pl-4 pr-2 py-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold whitespace-nowrap shrink-0">{count}구절 체크</span>

              {/* 형광펜 색 — 두 가지. 지금 칠하는 색에는 체크 표시가 든다 */}
              <div className="flex items-center gap-1.5 shrink-0">
                {HIGHLIGHT_ORDER.map((c) => {
                  const on = c === color;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onColor(c)}
                      style={{ background: HIGHLIGHT_COLORS[c].bg }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                        on ? "ring-2 ring-white" : "opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`${HIGHLIGHT_COLORS[c].label}으로 칠하기`}
                      aria-pressed={on}
                    >
                      {on && (
                        <Check size={15} strokeWidth={3} style={{ color: HIGHLIGHT_COLORS[c].num }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onClear}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
                  aria-label="체크한 구절 지우기"
                >
                  <X size={16} />
                </button>
                <button
                  type="button"
                  onClick={onWrite}
                  className="bg-white text-[#12503B] px-3.5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap cursor-pointer hover:brightness-95 transition"
                >
                  묵상 쓰기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
