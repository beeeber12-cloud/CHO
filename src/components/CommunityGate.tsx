import React, { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, Church, ArrowLeft, Loader2, Home, X } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-7"
      >
        <button
          onClick={back}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-5 text-base"
        >
          <ArrowLeft size={20} />
          뒤로
        </button>

        {mode === "menu" && (
          <>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">공동체 선택</h1>
            <p className="text-slate-500 mb-7 leading-relaxed">
              우리 공동체끼리만 묵상과 감사를 나눕니다.
              <br />
              다른 공동체의 글은 보이지 않습니다.
            </p>

            {/*
              지나온 공동체로 한 번에 돌아가기.
              이게 없어서, 다른 공동체로 옮기고 나면 원래 있던 곳의 가입코드를
              모르면 돌아올 수가 없었다. 실제로 그 일이 있었다.
            */}
            {history.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-500 mb-2">
                  전에 들어갔던 공동체
                </p>
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => {
                        saveCommunity(h);
                        onReady(h);
                      }}
                      className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 transition text-left"
                    >
                      <Home className="text-emerald-600 shrink-0" size={22} />
                      <span className="font-semibold text-slate-800">{h.name}</span>
                    </button>
                    <button
                      onClick={() => {
                        const msg = `목록에서 '${h.name}' 을(를) 지울까요?
(공동체가 없어지는 것은 아닙니다)`;
                        if (!confirm(msg)) return;
                        forgetCommunity(h.id);
                        setHistory(getCommunityHistory().filter((c) => c.id !== here));
                      }}
                      className="p-3 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="목록에서 지우기"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setMode("join")}
              className="w-full flex items-center gap-4 p-5 mb-3 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition text-left"
            >
              <KeyRound className="text-emerald-600 shrink-0" size={28} />
              <span>
                <span className="block font-semibold text-lg text-slate-800">가입코드로 들어가기</span>
                <span className="block text-slate-500">
                  공동체 관리자에게 받은 6자리를 넣습니다
                </span>
              </span>
            </button>

            <button
              onClick={() => setMode("create")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition text-left"
            >
              <Church className="text-slate-600 shrink-0" size={28} />
              <span>
                <span className="block font-semibold text-lg text-slate-800">새 공동체 만들기</span>
                <span className="block text-slate-500">만드신 분이 첫 관리자가 됩니다</span>
              </span>
            </button>
          </>
        )}

        {mode === "join" && (
          <form onSubmit={join}>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">가입코드 입력</h1>
            <p className="text-slate-500 mb-6">공동체 관리자에게 받으신 6자리를 넣어주세요.</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: K7M2PQ"
              autoFocus
              maxLength={12}
              className="w-full text-center text-3xl tracking-[0.4em] font-bold py-5 rounded-2xl border-2 border-slate-200 focus:border-emerald-400 outline-none mb-4 uppercase"
            />
            {error && <p className="text-red-600 mb-4">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 4}
              className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="animate-spin" size={20} />}
              들어가기
            </button>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={create}>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">새 공동체 만들기</h1>
            <p className="text-slate-500 mb-6">
              만드신 분이 첫 관리자가 됩니다. 만든 뒤 나오는 가입코드를 지체들께 알려주세요.
            </p>

            <label className="block mb-4">
              <span className="block text-slate-600 mb-2">공동체 이름</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 소망교회 청년부"
                autoFocus
                className="w-full text-lg py-4 px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-400 outline-none"
              />
            </label>

            <label className="block mb-4">
              <span className="block text-slate-600 mb-2">관리자 성함</span>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="예: 김목사"
                className="w-full text-lg py-4 px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-400 outline-none"
              />
            </label>

            <label className="block mb-5">
              <span className="block text-slate-600 mb-2">비밀번호 4자리</span>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.5em] py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-400 outline-none"
              />
            </label>

            {error && <p className="text-red-600 mb-4">{error}</p>}
            <button
              type="submit"
              disabled={busy || !name.trim() || !adminName.trim() || pin.length !== 4}
              className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="animate-spin" size={20} />}
              공동체 만들기
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
