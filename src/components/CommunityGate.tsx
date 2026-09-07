import React, { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, Church, ArrowLeft, Loader2, Home, X, ChevronRight } from "lucide-react";
import BrandMark from "./BrandMark";
import {
  saveCommunity,
  saveToken,
  getCommunity,
  getCommunityHistory,
  forgetCommunity,
  StoredCommunity
} from "../lib/session";

/**
 * 공동체 문 앞.
 *
 * 앱 하나를 여러 교회가 나눠 쓴다. 주소는 같아도 서로의 글은 보이지 않는다.
 * 여기서 **한 번만** 어느 공동체인지 정해 두면, 그 뒤로는 기기가 기억해서
 * 예전처럼 이름 누르고 비밀번호 4자리만 하시면 된다.
 */

interface Props {
  /** 공동체가 정해졌을 때. 새로 만든 경우엔 바로 로그인까지 끝난 상태로 넘어온다. */
  onReady: (community: StoredCommunity, loggedIn?: { id: string; name: string; role: "admin" | "member" }) => void;
  /** 되돌아가기 (원래 보던 로그인 화면으로) */
  onCancel: () => void;
}

type Mode = "menu" | "join" | "create";

export default function CommunityGate({ onReady, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  /**
   * 이 기기에서 지나온 공동체들. 코드를 몰라도 눌러서 돌아갈 수 있다.
   * 지금 있는 곳은 뺀다 — 여기 있는데 "여기로 가기" 버튼이 있으면 헷갈리기만 한다.
   */
  const here = getCommunity()?.id;
  const [history, setHistory] = useState<StoredCommunity[]>(
    () => getCommunityHistory().filter((c) => c.id !== here)
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 코드로 들어가기
  const [code, setCode] = useState("");

  // 새로 만들기
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/communities/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "가입코드를 확인해주세요.");
        return;
      }
      saveCommunity({ id: data.id, name: data.name });
      onReady({ id: data.id, name: data.name });
    } catch {
      setError("연결에 문제가 있습니다. 잠시 뒤 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 4) {
      setError("비밀번호는 숫자 4자리로 정해주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/communities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, adminName, pin })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "공동체를 만들지 못했습니다.");
        return;
      }
      saveCommunity({ id: data.community.id, name: data.community.name });
      saveToken(data.token);
      // 만든 분은 바로 그 공동체의 관리자로 들어간다
      onReady({ id: data.community.id, name: data.community.name }, data.user);
    } catch {
      setError("연결에 문제가 있습니다. 잠시 뒤 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError("");
    if (mode === "menu") onCancel();
    else setMode("menu");
  };

  /** 입력칸 한 벌 — 로그인 화면과 같은 옅은 회색 바탕 */
  const fieldClass =
    "w-full px-4 py-3.5 bg-[#F9F9F9] rounded-2xl text-[#14261E] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A6B57] placeholder:text-[#A8B3A9] placeholder:font-medium";

  const title =
    mode === "menu" ? "공동체 선택" : mode === "join" ? "가입코드 입력" : "새 공동체 만들기";
  const sub =
    mode === "menu"
      ? "우리 공동체끼리만 묵상과 감사를 나눕니다"
      : mode === "join"
      ? "관리자에게 받으신 코드를 넣어주세요"
      : "만드신 분이 첫 관리자가 됩니다";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 머리 — 앱 안쪽·로그인 화면과 같은 초록 그라데이션 */}
      <header className="grad-forest-sheen relative z-0 text-white">
        <div className="relative z-10 max-w-md mx-auto px-[22px] pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-14">
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-bold mb-7 cursor-pointer"
          >
            <ArrowLeft size={16} />
            뒤로
          </button>

          <div className="flex items-center gap-2.5 mb-3">
            <BrandMark size={26} className="text-[#F2F6F3] shrink-0" />
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#F2F6F3]">{title}</h1>
          <p className="mt-2 text-xs text-white/70 leading-relaxed">{sub}</p>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 -mt-[22px] flex-1 bg-white rounded-t-[26px] w-full max-w-md mx-auto px-[22px] pt-7 pb-10"
      >
        {error && (
          <p className="mb-4 bg-[#FDF3F3] p-3.5 rounded-2xl text-xs font-semibold text-[#8F1E17] leading-relaxed">
            {error}
          </p>
        )}

        {mode === "menu" && (
          <div className="space-y-5">
            {/*
              지나온 공동체로 한 번에 돌아가기.
              이게 없어서, 다른 공동체로 옮기고 나면 원래 있던 곳의 가입코드를
              모르면 돌아올 수가 없었다. 실제로 그 일이 있었다.
            */}
            {history.length > 0 && (
              <div>
                <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2.5 ml-1.5">
                  전에 들어갔던 공동체
                </p>
                <div className="flex flex-col gap-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          saveCommunity(h);
                          onReady(h);
                        }}
                        className="flex-1 flex items-center gap-3 p-3 rounded-[18px] bg-[#F9F9F9] hover:bg-[#F0F0F0] transition text-left cursor-pointer"
                      >
                        <span className="w-[34px] h-[34px] rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                          <Home size={17} />
                        </span>
                        <span className="flex-1 min-w-0 text-sm font-semibold text-[#14261E] truncate">
                          {h.name}
                        </span>
                        <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          const msg = `목록에서 '${h.name}' 을(를) 지울까요?\n(공동체가 없어지는 것은 아닙니다)`;
                          if (!confirm(msg)) return;
                          forgetCommunity(h.id);
                          setHistory(getCommunityHistory().filter((c) => c.id !== here));
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#A8B3A9] hover:text-[#0C3B2E] hover:bg-[#F9F9F9] transition cursor-pointer shrink-0"
                        title="목록에서 지우기"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2.5 ml-1.5">
                들어가기
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode("join")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-[18px] bg-[#F9F9F9] hover:bg-[#F0F0F0] transition text-left cursor-pointer"
                >
                  <span className="w-[38px] h-[38px] rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                    <KeyRound size={19} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-[#14261E]">가입코드로 들어가기</span>
                    <span className="block text-2xs text-[#6F8377] mt-0.5">
                      관리자에게 받은 6자리를 넣습니다
                    </span>
                  </span>
                  <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                </button>

                <button
                  onClick={() => setMode("create")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-[18px] bg-[#F9F9F9] hover:bg-[#F0F0F0] transition text-left cursor-pointer"
                >
                  <span className="w-[38px] h-[38px] rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                    <Church size={19} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-[#14261E]">새 공동체 만들기</span>
                    <span className="block text-2xs text-[#6F8377] mt-0.5">
                      만드신 분이 첫 관리자가 됩니다
                    </span>
                  </span>
                  <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                </button>
              </div>
            </div>

            <p className="text-2xs text-[#6F8377] leading-relaxed bg-[#F9F9F9] rounded-2xl p-3.5">
              다른 공동체의 묵상·감사·기도제목은 서로 보이지 않습니다. 우리 공동체 안에서만
              나눕니다.
            </p>
          </div>
        )}

        {mode === "join" && (
          <form onSubmit={join} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                가입코드
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예: K7M2PQ"
                autoFocus
                maxLength={12}
                className={`${fieldClass} text-center text-2xl tracking-[0.35em] font-bold uppercase py-4`}
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.length < 4}
              className="grad-forest w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition cursor-pointer hover:brightness-110"
            >
              {busy && <Loader2 className="animate-spin" size={17} />}
              들어가기
            </button>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                공동체 이름
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 소망교회 청년부"
                autoFocus
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                관리자 성함
              </label>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="예: 김목사"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                비밀번호 4자리
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                type="password"
                placeholder="••••"
                className={`${fieldClass} text-center text-lg tracking-[0.5em] font-bold`}
              />
            </div>

            <p className="text-2xs text-[#6F8377] leading-relaxed bg-[#F9F9F9] rounded-2xl p-3.5">
              만든 뒤 나오는 <strong className="text-[#0C3B2E]">가입코드</strong>를 지체들께
              알려주시면, 그분들도 이 앱으로 들어오실 수 있습니다.
            </p>

            <button
              type="submit"
              disabled={busy || !name.trim() || !adminName.trim() || pin.length !== 4}
              className="grad-forest w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition cursor-pointer hover:brightness-110"
            >
              {busy && <Loader2 className="animate-spin" size={17} />}
              공동체 만들기
            </button>
          </form>
        )}
      </motion.main>
    </div>
  );
}
