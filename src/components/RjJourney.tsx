import React, { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ModalPortal from "./ModalPortal";
import { RJ_VOLUMES, volumeColor, RjVolume } from "../data/readingJesusVolumes";

/**
 * 리딩지저스 여정 — 성경 66권을 여섯 걸음으로 보여주는 창.
 *
 * 여섯 줄이 **한 화면에 다 들어와야** 한다. 그래서 기본은 전부 접어 두고,
 * **지금 읽고 있는 권만 펼쳐 둔다** — 들어오자마자 "나는 여기쯤" 이 보이고,
 * 나머지는 궁금할 때 눌러서 편다. 여섯 줄을 다 펼쳐 두면 아무도 안 읽는다.
 */
export default function RjJourney({
  current,
  onClose
}: {
  /** 지금 읽는 권 (없으면 아무것도 펼치지 않는다) */
  current: RjVolume | null;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<number | null>(current?.no ?? null);

  return (
    <ModalPortal>
      <AnimatePresence>
        <div
          className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1rem)]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] w-full max-w-sm p-4 sm:p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#0C3B2E]">리딩지저스 여정</h3>
                <p className="text-2xs text-[#6F8377] mt-0.5 break-keep">
                  성경 66권을 여섯 걸음으로 읽습니다
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F9F9F9] text-[#6F8377] flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3.5 space-y-1.5">
              {RJ_VOLUMES.map((v) => {
                const here = current?.no === v.no;
                const isOpen = open === v.no;
                return (
                  <div key={v.no}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : v.no)}
                      className={`w-full flex items-center gap-2.5 p-3 rounded-2xl text-left transition cursor-pointer ${
                        here ? "bg-[#EAF2EC] ring-2 ring-[#2F7358]" : "bg-[#F9F9F9] hover:bg-[#F0F0F0]"
                      }`}
                    >
                      <span
                        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-2xs font-black shrink-0"
                        style={
                          here
                            ? { background: volumeColor(v.no), color: "#fff" }
                            : { background: "#E7EBE6", color: "#7d8a80" }
                        }
                      >
                        {v.no}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block text-xs font-bold ${here ? "text-[#14261E]" : "text-[#3d4a42]"}`}
                        >
                          {v.title}
                        </span>
                        <span
                          className={`block text-2xs mt-px truncate ${
                            here ? "text-[#6F8377]" : "text-[#8b968e]"
                          }`}
                        >
                          {v.range}
                          {here ? " · 지금 여기" : ""}
                        </span>
                      </span>
                      {isOpen ? (
                        <ChevronDown size={15} className="text-[#9aa79e] shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-[#9aa79e] shrink-0" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <dl className="mt-1 mb-0.5 px-3 py-3 bg-[#EAF2EC] rounded-2xl grid grid-cols-[42px_1fr] gap-x-2.5 gap-y-1.5">
                            <Term>주제</Term>
                            <Desc>“{v.theme}”</Desc>
                            <Term>핵심</Term>
                            <Desc>{v.core}</Desc>
                            <Term>흐름</Term>
                            <Desc>{v.flow}</Desc>
                            <Term>예수님</Term>
                            <Desc>{v.jesus}</Desc>
                          </dl>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </ModalPortal>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <dt className="text-2xs font-bold text-[#2F7358] leading-relaxed">{children}</dt>;
}

function Desc({ children }: { children: React.ReactNode }) {
  return <dd className="m-0 text-2xs leading-relaxed text-[#33413a] break-keep">{children}</dd>;
}
