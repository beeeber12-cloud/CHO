import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwaInstallDismissedAt";
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 이미 앱으로 설치되어 실행 중이면 표시하지 않음
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 최근에 닫았으면 일정 기간 숨김
    try {
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DAYS * 86400000) return;
    } catch {
      /* localStorage 불가 환경 무시 */
    }

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    // 안드로이드/크롬: 설치 이벤트를 붙잡아 버튼 노출
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS 사파리: 설치 이벤트가 없으므로 수동 안내
    if (isIos && isSafari) {
      setShowIosGuide(true);
      setVisible(true);
    }

    // 설치 완료되면 배너 숨김
    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* 무시 */
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-24 md:bottom-6 left-3 right-3 z-50 mx-auto max-w-md"
      >
        <div className="bg-[#2C2F36] text-white rounded-2xl shadow-2xl border border-[#4B4E55] p-3.5 flex items-start gap-3">
          <img
            src="/icon-192.png"
            alt="말씀나눔"
            className="w-11 h-11 rounded-2xl shrink-0 shadow-md"
          />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">홈 화면에 앱으로 추가하기</p>

            {showIosGuide ? (
              <p className="text-2xs text-[#D5D7DB]/90 mt-1 leading-relaxed">
                아래 <Share size={11} className="inline -mt-0.5" /> <strong>공유</strong> 버튼을 누른 뒤{" "}
                <PlusSquare size={11} className="inline -mt-0.5" /> <strong>‘홈 화면에 추가’</strong>를 선택하세요.
              </p>
            ) : (
              <p className="text-2xs text-[#D5D7DB]/90 mt-1 leading-relaxed">
                설치하면 아이콘으로 바로 열리고, 주소창 없이 앱처럼 사용할 수 있습니다.
              </p>
            )}

            {!showIosGuide && (
              <button
                type="button"
                onClick={install}
                className="mt-2 inline-flex items-center gap-1.5 bg-[#2C2F36] hover:bg-[#1E2128] text-white font-bold text-xs px-3.5 py-1.5 rounded-2xl transition cursor-pointer shadow-sm"
              >
                <Download size={14} />
                <span>앱 설치하기</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="text-[#D5D7DB]/70 hover:text-white transition cursor-pointer shrink-0 p-0.5"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
