import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Users, Lock, UserPlus, ShieldAlert, CheckCircle2, UserCheck } from "lucide-react";
import { motion } from "motion/react";

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
  const [regRole, setRegRole] = useState<'admin' | 'member'>("member");
  const [regSuccess, setRegSuccess] = useState<string>("");

  useEffect(() => {
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
        body: JSON.stringify({ name: regName.trim(), pin: regPin, role: regRole })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
      } else {
        setRegSuccess(`${data.name}님이 성공적으로 등록되었습니다!`);
        setRegName("");
        setRegPin("");
        setRegRole("member");
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

  return (
    <div id="login-container" className="min-h-screen bg-[#EDF0EA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-3.5 bg-[#E4EDE5] rounded-3xl shadow-md mb-4 text-[#0C3B2E]"
        >
          <UserCheck size={36} />
        </motion.div>
        <h2 className="text-3xl font-bold text-[#0C3B2E] tracking-tight">은혜교회</h2>
        <p className="mt-2 text-sm text-[#6F8377]">
          우리 성도님들과 소그룹을 위한 매일 말씀 묵상과 따뜻한 은혜 나눔터
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-3xl sm:px-10">
          {error && (
            <div className="mb-4 bg-[#FDF3F3] border-l-4 border-[#B3261E] p-3 text-sm text-[#8F1E17] flex items-center rounded-r-lg">
              <ShieldAlert className="mr-2 flex-shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-4 bg-[#F1F4EE] border-l-4 border-[#4A6B57] p-3 text-sm text-[#0C3B2E] flex items-center rounded-r-lg">
              <CheckCircle2 className="mr-2 flex-shrink-0" size={18} />
              <span>{regSuccess}</span>
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Login Mode Toggle Tabs */}
              <div className="flex bg-[#F1F4EE] p-1 rounded-3xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('select');
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    loginMode === 'select' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
                  }`}
                >
                  목록에서 선택
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('type');
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    loginMode === 'type' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
                  }`}
                >
                  이름 직접 입력
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A6B57] mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <Users size={15} className="mr-1.5 text-[#4A6B57]" />
                    {loginMode === 'select' ? "묵상 지체 선택" : "성함 직접 입력"}
                  </span>
                  {loginMode === 'type' && (
                    <span className="text-2xs text-[#4A6B57] font-bold">실명 및 닉네임</span>
                  )}
                </label>

                {loginMode === 'select' ? (
                  <div className="relative">
                    <select
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setError("");
                      }}
                      className="w-full pl-3 pr-10 py-2.5 text-[#14261E] bg-[#F1F4EE] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] focus:border-[#4A6B57] text-xs font-semibold appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">-- 목록에서 이름을 선택하세요 --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6F8377]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => {
                      setDirectName(e.target.value);
                      setError("");
                    }}
                    placeholder="성함을 입력하세요 (예: 조재영)"
                    className="w-full px-3 py-2.5 text-[#14261E] font-semibold bg-[#F1F4EE] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-xs shadow-sm bg-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A6B57] mb-1 flex items-center">
                  <Lock size={15} className="mr-1.5 text-[#4A6B57]" />
                  4자리 비밀번호 (PIN)
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
                  placeholder="숫자 4자리 비밀번호 입력"
                  className="w-full px-3 py-2.5 text-[#14261E] bg-[#F1F4EE] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] focus:border-[#4A6B57] text-xs tracking-widest text-center font-bold shadow-sm"
                />
                <div className="mt-2 bg-[#F1F4EE]/70 p-2.5 rounded-3xl text-2xs text-[#4A6B57] leading-relaxed space-y-1">
                  <p className="font-bold text-[#0C3B2E] flex items-center gap-1">
                    🔒 자동 로그인 안내
                  </p>
                  <p className="text-2xs text-[#6F8377]">
                    한 번 로그인하시면 로그아웃 버튼을 누르기 전까지 오랫동안 재접속해도 <strong>자동 로그인 상태가 안전하게 유지</strong>됩니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 rounded-3xl shadow-md text-xs font-bold text-white bg-[#4A6B57] hover:bg-[#072A20] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6B57] transition cursor-pointer"
                >
                  {loading ? "로그인 확인 중..." : "나눔방 들어가기"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError("");
                  }}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-[#F1F4EE] rounded-3xl text-xs font-semibold text-[#4A6B57] bg-[#F1F4EE] hover:bg-[#D2DDD3] transition cursor-pointer"
                >
                  <UserPlus size={15} className="mr-1.5 text-[#4A6B57]" />
                  처음 오셨나요? 새 식구 등록하기
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <h3 className="text-lg font-bold text-[#0C3B2E] flex items-center">
                <UserPlus className="mr-1.5 text-[#4A6B57]" size={20} />
                새로운 묵상 식구 등록
              </h3>

              <div>
                <label className="block text-sm font-semibold text-[#4A6B57] mb-1">
                  성함 (실명을 사용해주시면 좋습니다)
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="예: 김성경"
                  className="w-full px-3 py-2.5 text-[#14261E] bg-[#F1F4EE] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] focus:border-[#4A6B57] text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A6B57] mb-1">
                  비밀번호 4자리 (PIN)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, "")) }
                  placeholder="로그인에 사용할 숫자 4자리"
                  className="w-full px-3 py-2.5 text-[#14261E] bg-[#F1F4EE] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] focus:border-[#4A6B57] text-sm text-center tracking-widest shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#4A6B57] mb-1">
                  역할 구분
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <label className="flex items-center text-sm font-medium text-[#4A6B57] cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={regRole === "member"}
                      onChange={() => setRegRole("member")}
                      className="h-4 w-4 text-[#4A6B57] focus:ring-[#4A6B57] border-[#AFC0B2] mr-2"
                    />
                    일반 지체 (읽기, 쓰기, 소통)
                  </label>
                  <label className="flex items-center text-sm font-medium text-[#4A6B57] cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={regRole === "admin"}
                      onChange={() => setRegRole("admin")}
                      className="h-4 w-4 text-[#4A6B57] focus:ring-[#4A6B57] border-[#AFC0B2] mr-2"
                    />
                    관리자 (말씀 공지 등록 권한)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError("");
                  }}
                  className="w-1/2 py-2.5 px-4 bg-[#F1F4EE] rounded-3xl text-sm font-semibold text-[#4A6B57] bg-white hover:bg-[#F1F4EE] focus:outline-none transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 px-4 rounded-3xl shadow-md text-sm font-bold text-white bg-[#4A6B57] hover:bg-[#072A20] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A6B57] transition cursor-pointer"
                >
                  {loading ? "등록 중..." : "등록 완료"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
