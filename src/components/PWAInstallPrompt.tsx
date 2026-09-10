import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { inAppBrowser } from "../lib/invite";

/**
 * 홈 화면에 앱으로 추가하시라는 안내.
 *
 * 크롬은 설치할 수 있게 되면 `beforeinstallprompt` 를 **딱 한 번** 보낸다.
 * 그 신호를 받으면 진짜 설치 창을 띄우는 단추를 드린다.
 *
 * 문제는 그 신호가 **안 올 때도 많다는 것** —
 *  · 첫 방문에는 서비스워커가 막 깔리는 중이라 그 방문에는 안 보내기도 하고
 *  · 아이폰은 어느 브라우저에서도 이 신호가 아예 없다
 *  · 데스크톱 크롬도 조건이 다르다
 * 그래서 잠깐 기다려 보고 신호가 없으면 **손으로 설치하는 법**을 알려 드린다.
 * 안내가 아예 안 뜨는 것보다는 낫다.
 *
 * 카카오톡 같은 앱 안 브라우저에서는 조용히 있는다 — 거기서는 설치 자체가 안 되고,
 * InAppBrowserNotice 가 '브라우저로 열기' 를 따로 안내한다.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwaInstallDismissedAt";
const DISMISS_DAYS = 7;
/** 크롬 신호를 이만큼 기다려 보고, 안 오면 손으로 하는 법을 알려 드린다 */
const WAIT_MS = 3500;

type How = "prompt" | "ios-safari" | "ios-other" | "android" | "desktop";

interface Props {
  /** 설정에서 '앱 설치하는 법' 을 누른 횟수 — 바뀌면 닫아 두었어도 다시 뜬다 */
  replay?: number;
}

export default function PWAInstallPrompt({ replay = 0 }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [how, setHow] = useState<How | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 이미 앱으로 설치되어 실행 중이면 표시하지 않음
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const forced = replay > 0;

    // 앱 안 브라우저(카카오톡 등)에서는 설치가 아예 안 된다 — 다른 안내가 맡는다
    if (!forced && inAppBrowser()) return;

    // 최근에 닫았으면 일정 기간 숨김 (일부러 부르셨을 때는 예외)
    if (!forced) {
      try {
        const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
        if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DAYS * 86400000) return;
      } catch {
        /* localStorage 불가 환경 무시 */
      }
    }

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
    const isAndroid = /Android/.test(ua);

    const take = (e: BeforeInstallPromptEvent) => {
      setDeferredPrompt(e);
      setHow("prompt");
      setVisible(true);
    };

    // 안드로이드·데스크톱 크롬: 설치 신호를 받으면 진짜 설치 창을 띄울 수 있다
    const handler = (e: Event) => {
      e.preventDefault();
      take(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    /*
      신호는 화면이 그려지기 전에 이미 왔을 수 있다.
      index.html 이 먼저 붙잡아 두므로 (window.__installPromptEvent) 집어 오기만 하면 된다.
    */
    const pickUp = () => {
      const saved = (window as any).__installPromptEvent as BeforeInstallPromptEvent | null;
      if (saved) take(saved);
    };
    pickUp();
    window.addEventListener("cho:installready", pickUp);

    // 아이폰은 신호가 없다 — 바로 손으로 하는 법을 알려 드린다
    if (isIos) {
      setHow(isSafari ? "ios-safari" : "ios-other");
      setVisible(true);
    }

    // 그 밖에는 잠깐 기다려 보고, 신호가 없으면 손으로 하는 법을 알려 드린다
    const timer = window.setTimeout(() => {
      setHow((prev) => {
        if (prev) return prev; // 이미 신호를 받았거나 안내 중
        setVisible(true);
        return isAndroid ? "android" : "desktop";
      });
    }, WAIT_MS);

    // 설치 완료되면 배너 숨김
    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("cho:installready", pickUp);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [replay]);

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
    // 한 번 쓴 신호는 다시 쓸 수 없다
    (window as any).__installPromptEvent = null;
  };

  if (!visible || !how) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-24 md:bottom-6 left-3 right-3 z-50 mx-auto max-w-md"
      >
        <div className="bg-[#0C3B2E] text-white rounded-3xl shadow-2xl p-3.5 flex items-start gap-3">
          <img
            src="/icon-192.png"
            alt="말씀나눔"
            className="w-11 h-11 rounded-3xl shrink-0 shadow-md"
          />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">홈 화면에 앱으로 추가하기</p>

            <p className="text-2xs text-[#D2DDD3]/90 mt-1 leading-relaxed break-keep">
              {how === "prompt" && "설치하면 아이콘으로 바로 열리고, 주소창 없이 앱처럼 씁니다."}

              {how === "ios-safari" && (
                <>
                  아래 <Share size={11} className="inline -mt-0.5" /> <strong>공유</strong> 를 누른 뒤{" "}
                  <PlusSquare size={11} className="inline -mt-0.5" />{" "}
                  <strong>‘홈 화면에 추가’</strong> 를 골라주세요.
                </>
              )}

              {how === "ios-other" && (
                <>
                  <strong>사파리(Safari)</strong> 로 열면 <Share size={11} className="inline -mt-0.5" />{" "}
                  공유 → <strong>‘홈 화면에 추가’</strong> 로 설치하실 수 있습니다.
                </>
              )}

              {how === "android" && (
                <>
                  오른쪽 위 <MoreVertical size={11} className="inline -mt-0.5" /> 를 누르고{" "}
                  <strong>‘앱 설치’</strong> 또는 <strong>‘홈 화면에 추가’</strong> 를 골라주세요.
                </>
              )}

              {how === "desktop" && (
                <>
                  주소창 오른쪽 끝의 <strong>설치 아이콘</strong> 을 누르시면 앱처럼 쓰실 수 있습니다.
                </>
              )}
            </p>

            {how === "prompt" && (
              <button
                type="button"
                onClick={install}
                className="mt-2 inline-flex items-center gap-1.5 bg-[#FFBA00] hover:brightness-105 text-[#4A3600] font-bold text-xs px-4 py-2 rounded-3xl transition cursor-pointer shadow-sm"
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
            className="text-[#D2DDD3]/70 hover:text-white transition cursor-pointer shrink-0 p-0.5"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
