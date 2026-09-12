import React, { useEffect, useState } from "react";
import { Bell, Type, Check, Loader, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import FontSizeSegment from "./FontSizeSegment";
import { checkPushSupport, enablePush, isPushEnabled } from "../lib/push";

const DONE_KEY = "firstRunSetupDone";

export function firstRunSetupDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return true; // 저장이 막힌 기기에서는 매번 붙잡지 않는다
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, "1");
  } catch {
    // 무시
  }
}

/**
 * 처음 들어오신 분께, 앱 사용법 바로 다음에 딱 한 번.
 *
 * 글씨 크기와 알림은 **설정에 들어가야 만날 수 있는 것**이라, 아무도 안 건드린다.
 * 그런데 이 둘은 처음에 한 번 맞춰 두면 그 뒤로 쓰는 내내 편해지는 것들이다.
 * 어르신께는 글씨 크기가, 공동체에는 알림이 특히 그렇다.
 *
 * 둘 다 **이 기기에만** 저장되는 것이라(글씨 크기·알림 구독 모두 기기별),
 * 다 보셨다는 표시도 기기에 남긴다.
 */
export default function FirstRunSetup({
  currentUser,
  onClose
}: {
  currentUser: { id: string; name: string };
  onClose: () => void;
}) {
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const support = checkPushSupport();

  useEffect(() => {
    isPushEnabled().then(setPushOn).catch(() => {});
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await enablePush(currentUser.id);
      if (res.ok) setPushOn(true);
      else setMsg(res.message || "알림을 켜지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    markDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[#EDF0EA] overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-[calc(env(safe-area-inset-top)+1.5rem)]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="text-center px-2">
            <h2 className="text-xl font-bold text-[#0C3B2E] break-keep">
              {currentUser.name}님, 두 가지만 맞춰 볼까요
            </h2>
            <p className="mt-1.5 text-xs text-[#6F8377] break-keep">
              나중에 설정에서 언제든 바꾸실 수 있습니다
            </p>
          </div>

          {/* 글씨 크기 */}
          <div className="mt-5 bg-white rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#E8F0E9] text-[#2F7358] flex items-center justify-center shrink-0">
                <Type size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#14261E]">글씨 크기</span>
                <span className="block text-2xs text-[#6F8377] mt-px">
                  눌러 보시면 바로 바뀝니다
                </span>
              </span>
            </div>
            <FontSizeSegment />
          </div>

          {/* 알림 */}
          <div className="mt-3 bg-white rounded-3xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#E8F0E9] text-[#2F7358] flex items-center justify-center shrink-0">
                <Bell size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#14261E]">휴대폰 알림</span>
                <span className="block text-2xs text-[#6F8377] mt-px break-keep">
                  오늘의 말씀과 새 글을 알려 드립니다
                </span>
              </span>
            </div>

            {support === "ios-needs-install" ? (
              <p className="mt-3 flex gap-2 bg-[#FFF8E8] rounded-2xl p-3 text-2xs leading-relaxed text-[#7A5A12] break-keep">
                <Smartphone size={14} className="shrink-0 mt-px" />
                <span>
                  아이폰은 홈 화면에 앱으로 설치한 뒤에 알림을 켤 수 있습니다.
                  설치하신 다음 <strong>설정 → 알림</strong>에서 켜 주세요.
                </span>
              </p>
            ) : pushOn ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 bg-[#EAF2EC] rounded-2xl py-3 text-xs font-bold text-[#2F7358]">
                <Check size={15} strokeWidth={3} /> 알림이 켜졌습니다
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={turnOn}
                  disabled={busy || support === "unsupported"}
                  className="grad-forest w-full mt-3 py-3 rounded-2xl text-white text-sm font-bold cursor-pointer transition hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {busy ? <Loader size={15} className="animate-spin" /> : <Bell size={15} />}
                  알림 켜기
                </button>
                {msg && (
                  <p className="mt-2 text-2xs text-[#B4632F] leading-relaxed break-keep whitespace-pre-line">
                    {msg}
                  </p>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={finish}
            className="w-full mt-4 py-3.5 rounded-2xl bg-[#14261E] text-white text-sm font-bold cursor-pointer transition hover:brightness-125"
          >
            시작하기
          </button>
        </motion.div>
      </div>
    </div>
  );
}
