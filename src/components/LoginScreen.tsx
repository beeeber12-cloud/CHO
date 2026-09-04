import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Lock, UserPlus, ShieldAlert, CheckCircle2, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import BrandMark from "./BrandMark";
import { saveToken, getCommunity, saveCommunity, clearToken, StoredCommunity } from "../lib/session";
import CommunityGate from "./CommunityGate";

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; role: 'admin' | 'member' }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [users, setUsers] = useState<Omit<User, 'pin' | 'createdAt'>[]>([]);
  const [loginMode, setLoginMode] = useState<'select' | 'type'>('select');
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [directName, setDirectName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Register state
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>("");
  const [regPin, setRegPin] = useState<string>("");
  const [regCode, setRegCode] = useState<string>("");
  // 지금 보고 있는 공동체. 기기에 기억된 것이 없으면 서버가 기본 공동체를 알려준다.
  const [community, setCommunity] = useState<{ id: string; name: string; requiresJoinCode?: boolean } | null>(null);
  const [showGate, setShowGate] = useState<boolean>(false);
  const [regSuccess, setRegSuccess] = useState<string>("");

  useEffect(() => {
    // 기억해 둔 공동체가 있으면 그 이름을, 없으면 서버가 알려주는 기본 공동체 이름을 띄운다
    fetch("/api/communities/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c) return;
        setCommunity(c);
        // 지금 보고 있는 공동체를 '지나온 목록'에 남겨 둔다.
        // 이게 없으면, 다른 공동체로 옮긴 뒤 가입코드를 모를 때 돌아올 길이 없다.
        saveCommunity({ id: c.id, name: c.name });
      })
      .catch(() => {});
    fetchUsers();

    const interval = setInterval(fetchUsers, 3000);
    const handleFocus = () => fetchUsers();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginIdentifier = loginMode === 'select' ? selectedUser : directName.trim();

    if (!loginIdentifier) {
      setError(loginMode === 'select' ? "로그인할 이름을 선택해주세요." : "로그인할 성함을 정확히 입력해주세요.");
      return;
    }
    if (pin.length !== 4) {
      setError("4자리 비밀번호(PIN)를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: loginMode === 'select' ? selectedUser : undefined,
          name: loginMode === 'type' ? directName.trim() : undefined,
          pin
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
      } else {
        // 계정 관련 요청에 함께 보낼 증표를 저장해 둔다
        if (data.token) saveToken(data.token);
        onLoginSuccess(data);
      }
    } catch (err) {
      setError("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (regPin.length !== 4) {
      setError("비밀번호는 반드시 4자리 숫자여야 합니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName.trim(), pin: regPin, joinCode: regCode.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
      } else {
        setRegSuccess(`${data.name}님이 성공적으로 등록되었습니다!`);
        setRegName("");
        setRegPin("");
        setRegCode("");
        await fetchUsers();
        setSelectedUser(data.id);
        setTimeout(() => {
          setIsRegistering(false);
          setRegSuccess("");
        }, 2000);
      }
    } catch (err) {
      setError("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 공동체를 고르러 들어간 경우
  if (showGate) {
    return (
      <CommunityGate
        onCancel={() => setShowGate(false)}
        onReady={(picked, loggedIn) => {
          setCommunity({ id: picked.id, name: picked.name });
          fetch("/api/communities/current")
            .then((r) => (r.ok ? r.json() : null))
            .then((c) => c && setCommunity(c))
            .catch(() => {});
          setShowGate(false);
          setError("");
          setSelectedUser("");
          setDirectName("");
          setPin("");
          if (loggedIn) {
            // 새로 만든 분은 이미 관리자로 로그인된 상태다
            onLoginSuccess(loggedIn);
          } else {
            fetchUsers();
          }
        }}
      />
    );
  }

  /** 입력칸 한 벌 — 앱 안쪽 화면과 같은 옅은 회색 바탕에 둥근 모서리 */
  const fieldClass =
    "w-full px-4 py-3.5 bg-[#F9F9F9] rounded-2xl text-[#14261E] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A6B57] placeholder:text-[#A8B3A9] placeholder:font-medium";

  return (
    <div id="login-container" className="min-h-screen bg-white flex flex-col">
      {/* 머리 — 앱 안쪽과 같은 초록 그라데이션. 빛이 아주 천천히 지나간다 */}
      <header className="grad-forest-sheen relative z-0 text-white">
        <div className="relative z-10 max-w-md mx-auto px-[22px] pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-14 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-white/15 text-[#F2F6F3] mb-4"
          >
            <BrandMark size={34} />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#F2F6F3]">
            {community?.name || "말씀나눔"}
          </h1>
          <p className="mt-2 text-xs text-white/70 leading-relaxed">
            매일의 말씀 묵상과 따뜻한 은혜 나눔터
          </p>
        </div>
      </header>

      {/* 흰 시트 — 머리말 위로 살짝 올라온다 (앱 안쪽 화면과 같은 짜임) */}
      <main className="relative z-10 -mt-[22px] flex-1 bg-white rounded-t-[26px] w-full max-w-md mx-auto px-[22px] pt-7 pb-10">
        {error && (
          <div className="mb-4 bg-[#FDF3F3] p-3.5 rounded-2xl text-xs font-semibold text-[#8F1E17] flex items-start gap-2">
            <ShieldAlert className="shrink-0 mt-px" size={15} />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {regSuccess && (
          <div className="mb-4 bg-[#E8F0E9] p-3.5 rounded-2xl text-xs font-semibold text-[#0C3B2E] flex items-center gap-2">
            <CheckCircle2 className="shrink-0" size={15} />
            <span>{regSuccess}</span>
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 이름을 고를지 직접 칠지 — 시안의 세그먼트 */}
            <div className="relative grid grid-cols-2 bg-[#F9F9F9] rounded-2xl p-1">
              <div
                className="absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white rounded-xl shadow-[0_2px_6px_rgba(47,115,88,0.14)] transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${loginMode === "select" ? 0 : 100}%)` }}
              />
              {([
                { key: "select", label: "목록에서 고르기" },
                { key: "type", label: "이름 직접 입력" }
              ] as const).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setLoginMode(m.key);
                    setError("");
                  }}
                  className={`relative z-10 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    loginMode === m.key ? "text-[#14261E]" : "text-[#6F8377]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                {loginMode === 'select' ? "이름" : "성함 직접 입력"}
              </label>

              {loginMode === 'select' ? (
                <div className="relative">
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setError("");
                    }}
                    className={`${fieldClass} appearance-none pr-11 cursor-pointer`}
                  >
                    <option value="">이름을 골라주세요</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6F8377]"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={directName}
                  onChange={(e) => {
                    setDirectName(e.target.value);
                    setError("");
                  }}
                  placeholder="성함을 입력하세요"
                  className={fieldClass}
                />
              )}
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                비밀번호 4자리
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ""));
                  setError("");
                }}
                placeholder="••••"
                className={`${fieldClass} text-center text-lg tracking-[0.5em] font-bold`}
              />
              <p className="mt-2 ml-1.5 text-2xs text-[#6F8377] leading-relaxed flex items-start gap-1.5">
                <Lock size={13} className="shrink-0 mt-px text-[#4A6B57]" />
                한 번 들어오시면 로그아웃을 누르기 전까지 계속 로그인된 채로 유지됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="grad-forest w-full py-3.5 rounded-2xl text-sm font-bold text-white transition cursor-pointer hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "확인 중..." : "들어가기"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError("");
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#F9F9F9] hover:bg-[#F0F0F0] text-xs font-bold text-[#4A6B57] transition cursor-pointer"
              >
                <UserPlus size={15} />
                처음 오셨나요? 새 식구 등록하기
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#0C3B2E]">새 식구 등록</h2>
              <p className="text-xs text-[#6F8377] mt-1">
                {community?.name || "우리 공동체"}에 처음 오신 분이 이름을 만드는 곳입니다.
              </p>
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                성함
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="실명을 써주시면 좋습니다"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                비밀번호 4자리
              </label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                required
                value={regPin}
                onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className={`${fieldClass} text-center text-lg tracking-[0.5em] font-bold`}
              />
            </div>

            {/*
              예전에는 여기서 '관리자'를 스스로 고를 수 있었다.
              주소만 알면 누구나 관리자가 되어 공지를 올리고 남의 계정을 지울 수 있었다.
              이제 가입은 언제나 일반 지체이고, 관리자는 기존 관리자가 세운다.
            */}
            {community?.requiresJoinCode && (
              <div>
                <label className="block text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1.5">
                  가입코드
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                  placeholder="관리자에게 받으신 코드"
                  className={`${fieldClass} text-center tracking-[0.3em] uppercase`}
                />
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                }}
                className="w-1/2 py-3.5 rounded-2xl bg-[#F9F9F9] hover:bg-[#F0F0F0] text-sm font-bold text-[#4A6B57] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="grad-forest w-1/2 py-3.5 rounded-2xl text-sm font-bold text-white transition cursor-pointer hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "등록 중..." : "등록 완료"}
              </button>
            </div>
          </form>
        )}

        {/*
          다른 교회 지체가 이 주소로 들어왔을 때의 문.
          평소에는 눈에 잘 띄지 않게 두어, 우리 교인들이 헷갈리지 않게 한다.
        */}
        <div className="mt-7 pt-4 border-t border-[#F0F0F0] text-center">
          <button
            type="button"
            onClick={() => {
              clearToken();
              setShowGate(true);
            }}
            className="text-2xs text-[#6F8377] hover:text-[#0C3B2E] underline underline-offset-2 cursor-pointer"
          >
            다른 공동체로 들어가기 · 새 공동체 만들기
          </button>
        </div>
      </main>
    </div>
  );
}
