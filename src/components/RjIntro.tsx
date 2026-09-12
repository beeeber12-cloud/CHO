import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ModalPortal from "./ModalPortal";
import { RJ_VOLUMES, volumeColor } from "../data/readingJesusVolumes";

const SEEN_KEY = "rjIntroSeen";

export function rjIntroSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 무시
  }
}

/**
 * 리딩지저스를 **처음 고른 그때 한 번만** 뜨는 안내 — 세 장.
 *
 * 리딩지저스가 무엇인지 모르고 고르면 그냥 "남이 정해 준 통독표" 로만 보인다.
 * 왜 이렇게 읽는지 세 줄로 먼저 말해 준다. 두 번 다시 뜨지 않는다
 * (다시 보고 싶으면 성경통독 화면의 권 띠를 눌러 여정 지도로 들어가면 된다).
 */
export default function RjIntro({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i === 2;

  const finish = () => {
    markSeen();
    onClose();
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        <div className="fixed inset-0 bg-black/55 z-[80] flex items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1rem)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-[28px] w-full max-w-sm p-5 shadow-2xl max-h-[88vh] overflow-y-auto text-center"
          >
            <span className="inline-block bg-[#E8F0E9] text-[#2F5D4A] text-2xs font-bold px-3 py-1.5 rounded-full">
              리딩지저스
            </span>

            {i === 0 && (
              <Slide
                title={"성경 전체가\n예수님을 가리킵니다"}
                sub={"‘예수’라는 안경을 쓰고 읽는 것,\n그것이 리딩지저스입니다."}
              />
            )}

            {i === 1 && (
              <Slide
                title={"구약은 질문,\n신약은 해답입니다"}
                sub={"“어떻게 하면 다시 하나님께로 돌아갈 수 있을까?”\n구약이 묻고, 신약이 답합니다."}
              />
            )}

            {i === 2 && (
              <>
                <Slide
                  title={"성경 66권을\n여섯 걸음으로 읽습니다"}
                  sub={"여섯 걸음이 한 이야기로 이어집니다."}
                />
                <div className="mt-3.5 space-y-1.5 text-left">
                  {RJ_VOLUMES.map((v) => (
                    <div
                      key={v.no}
                      className="flex items-center gap-2 bg-[#F9F9F9] rounded-xl px-2.5 py-2"
                    >
                      <span
                        className="w-5 h-5 rounded-full text-white text-[9.5px] font-black flex items-center justify-center shrink-0"
                        style={{ background: volumeColor(v.no) }}
                      >
                        {v.no}
                      </span>
                      <span className="text-2xs font-bold text-[#14261E] truncate">{v.title}</span>
                      <span className="ml-auto text-2xs text-[#8b968e] shrink-0">{v.range}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-1.5 justify-center mt-5">
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === i ? "w-4 bg-[#2F7358]" : "w-1.5 bg-[#D3DAD2]"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => (last ? finish() : setI(i + 1))}
              className="grad-forest w-full mt-3 py-3 rounded-2xl text-white text-sm font-bold cursor-pointer transition hover:brightness-110"
            >
              {last ? "시작하기" : "다음"}
            </button>
            {!last && (
              <button
                type="button"
                onClick={finish}
                className="w-full mt-1.5 py-1.5 text-2xs font-bold text-[#8b968e] cursor-pointer"
              >
                건너뛰기
              </button>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    </ModalPortal>
  );
}

function Slide({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h3 className="mt-3 text-lg font-bold text-[#0C3B2E] leading-snug break-keep whitespace-pre-line">
        {title}
      </h3>
      <p className="mt-2 text-xs text-[#6F8377] leading-relaxed break-keep whitespace-pre-line">
        {sub}
      </p>
    </>
  );
}
