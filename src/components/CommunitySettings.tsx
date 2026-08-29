import React, { useEffect, useState } from "react";
import { Users2, KeyRound, RefreshCw, ShieldCheck, Shield, Copy, Check } from "lucide-react";

/**
 * 우리 공동체 관리.
 *
 * - 모든 지체: 우리 공동체 이름과 인원
 * - 관리자만: 가입코드 보기·재발급, 지체를 관리자로 세우거나 내리기
 *
 * 가입코드는 새 지체를 들일 때 알려주는 6자리다.
 * 새어나갔다 싶으면 다시 발급하면 되고, 그 순간 옛 코드는 통하지 않는다.
 */

interface Props {
  currentUser: { id: string; name: string; role: "admin" | "member" };
}

interface Mine {
  id: string;
  name: string;
  memberCount: number;
  joinCode?: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

export default function CommunitySettings({ currentUser }: Props) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = currentUser.role === "admin";

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        fetch("/api/communities/mine").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/auth/users").then((r) => (r.ok ? r.json() : []))
      ]);
      if (a) setMine(a);
      if (Array.isArray(b)) setMembers(b);
    } catch {
      // 화면은 그대로 두고 조용히 넘어간다
    }
  };

  useEffect(() => {
    load();
  }, []);

  const regenerate = async () => {
    if (!confirm("가입코드를 새로 발급하면 지금 코드는 더 이상 쓸 수 없습니다.\n계속할까요?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/communities/regenerate-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "다시 시도해주세요.");
      else setMine((m) => (m ? { ...m, joinCode: data.joinCode } : m));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: Member, role: "admin" | "member") => {
    const word = role === "admin" ? "관리자로 세우" : "일반 지체로 내리";
    if (!confirm(`${member.name} 님을 ${word}시겠습니까?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "다시 시도해주세요.");
      else await load();
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!mine?.joinCode) return;
    try {
      await navigator.clipboard.writeText(mine.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사가 막힌 브라우저에서는 눈으로 보고 적으시면 된다
    }
  };

  if (!mine) return null;

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-4">
      <h3 className="text-lg font-bold text-[#0C3B2E] flex items-center mb-1">
        <Users2 className="mr-1.5 text-[#4A6B57]" size={20} />
        우리 공동체
      </h3>
      <p className="text-sm text-[#6F8377] mb-5">
        {mine.name} · {mine.memberCount}명
      </p>

      {error && <p className="text-sm text-[#8F1E17] mb-4">{error}</p>}

      {isAdmin && mine.joinCode && (
        <div className="bg-[#F5F5F5] rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-[#4A6B57] flex items-center mb-2">
            <KeyRound size={14} className="mr-1.5" />
            가입코드
          </p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-2xl font-bold tracking-[0.3em] text-[#0C3B2E]">
              {mine.joinCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-2xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer"
              title="복사"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button
              onClick={regenerate}
              disabled={busy}
              className="p-2.5 rounded-2xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer disabled:opacity-40"
              title="새로 발급"
            >
              <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-xs text-[#6F8377] mt-2 leading-relaxed">
            새 지체에게 이 코드를 알려주세요. 새어나갔다 싶으면 새로 발급하시면 됩니다 —
            그 순간 옛 코드는 통하지 않습니다.
          </p>
        </div>
      )}

      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-[#4A6B57] mb-2">지체 권한</p>
          <div className="space-y-1.5">
            {members.map((m) => {
              const admin = m.role === "admin";
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-2xl bg-[#F5F5F5]"
                >
                  <span className="flex items-center text-sm text-[#14261E]">
                    {admin ? (
                      <ShieldCheck size={15} className="mr-1.5 text-[#4A6B57]" />
                    ) : (
                      <Shield size={15} className="mr-1.5 text-[#AFC0B2]" />
                    )}
                    {m.name}
                    {m.id === currentUser.id && (
                      <span className="ml-1.5 text-xs text-[#6F8377]">(나)</span>
                    )}
                  </span>
                  {m.id !== currentUser.id && (
                    <button
                      onClick={() => changeRole(m, admin ? "member" : "admin")}
                      disabled={busy}
                      className="text-xs font-semibold px-3 py-1.5 rounded-3xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer disabled:opacity-40"
                    >
                      {admin ? "관리자 내리기" : "관리자로"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
