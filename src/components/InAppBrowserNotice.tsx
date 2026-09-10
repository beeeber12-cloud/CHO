import React, { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Smartphone } from "lucide-react";
import {
  canOpenExternally,
  externalHint,
  inAppBrowser,
  isStandalone,
  openInExternalBrowser
} from "../lib/invite";

/**
 * 카카오톡 같은 '앱 안의 브라우저' 에서 열렸을 때의 안내.
 *
 * 홈 화면에 설치하는 것은 **브라우저만 할 수 있는 일**이라, 카톡 안에서는 아무리 눌러도
 * 설치가 되지 않는다. 그래서 한 번 눌러 바깥 브라우저로 넘어가시게 도와 드린다.
 * (넘어가면 그 화면에 설치 안내가 저절로 뜬다)
 */

function Hint() {
  const [head, menu] = externalHint().split("→");
  return (
    <p className="text-2xs text-[#A8B3A9] mt-1.5 leading-snug break-keep">
      {head.trim()}
      {menu ? <span className="whitespace-nowrap"> → {menu.trim()}</span> : null}
    </p>
  );
}

const HIDE_KEY = "inappNoticeHiddenAt";
const HIDE_HOURS = 12;

export default function InAppBrowserNotice() {
  const app = React.useMemo(() => inAppBrowser(), []);
  const [closed, setClosed] = useState<boolean>(() => {
    try {
      const at = localStorage.getItem(HIDE_KEY);
      return !!at && Date.now() - Number(at) < HIDE_HOURS * 3600000;
    } catch {
      return false;
    }
  });

  const boxRef = useRef<HTMLDivElement | null>(null);
  const showing = !!app && !isStandalone() && !closed;

  useLayoutEffect(() => {
    if (!showing) return;
    const el = boxRef.current;
    if (!el) return;

    const push = () => {
      document.body.style.paddingTop = Math.ceil(el.getBoundingClientRect().height) + "px";
    };
    push();

    // 글씨 크기·기기 방향이 바뀌면 높이도 달라진다
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(push) : null;
    ro?.observe(el);
    window.addEventListener("resize", push);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", push);
      document.body.style.paddingTop = "";
    };
  }, [showing]);

  if (!showing) return null;

  const where =
    app === "kakao"
      ? "카카오톡"
      : app === "line"
      ? "라인"
      : app === "instagram"
      ? "인스타그램"
      : app === "facebook"
      ? "페이스북"
      : app === "naver"
      ? "네이버"
      : app === "daum"
      ? "다음"
      : "지금 앱";

  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now()));
    } catch {
      // 무시
    }
    setClosed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={boxRef}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="fixed top-0 left-0 right-0 z-[95] px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2"
      >
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-3.5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#0C3B2E] flex items-center justify-center shrink-0">
            <Smartphone size={18} />
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0C3B2E] leading-snug break-keep">
              {where}에서는 설치가 안 됩니다
            </p>
            <p className="text-2xs text-[#6F8377] mt-1 leading-relaxed break-keep">
              브라우저로 열면 홈 화면에 설치됩니다.
            </p>

            {canOpenExternally() ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={openInExternalBrowser}
                  className="grad-forest w-full py-2.5 rounded-2xl text-white text-sm font-bold cursor-pointer hover:brightness-110 whitespace-nowrap"
                >
                  브라우저로 열기
                </button>
                <Hint />
              </div>
            ) : (
              <Hint />
            )}
          </div>

          <button
            type="button"
            onClick={hide}
            className="w-7 h-7 rounded-full bg-[#F9F9F9] text-[#6F8377] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
