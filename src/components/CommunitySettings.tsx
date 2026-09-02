import React, { useEffect, useState } from "react";
import {
  Users2, KeyRound, RefreshCw, ShieldCheck, Shield, Copy, Check, Share2, Pencil
} from "lucide-react";
import { saveCommunity } from "../lib/session";

/**
 * 우리 공동체 관리.
 *
 * - 모든 지체: 우리 공동체 이름과 인원
 * - 관리자만: 이름 바꾸기, 가입코드 보기·재발급·초대 문구 보내기, 지체 권한
 *
 * 가입코드는 새 지체를 들일 때 알려주는 6자리다.
 * 새어나갔다 싶으면 다시 발급하면 되고, 그 순간 옛 코드는 통하지 않는다.
 */

interface Props {
  currentUser: { id: string; name: string; role: "admin" | "member" };
  /** 이름을 바꿨을 때 앱 머리의 이름도 같이 바뀌도록 */
  onRenamed?: (name: string) => void;
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

export default function CommunitySettings({ currentUser, onRenamed }: Props) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const isAdmin = currentUser.role === "admin";

  /** 카카오톡 등에 그대로 붙여넣을 수 있는 초대 문구 (주소 + 코드) */
  const inviteText = mine
    ? `${mine.name} 말씀나눔에 초대합니다.\n\n` +
      `${window.location.origin}\n\n` +
      `가입코드: ${mine.joinCode}\n` +
      `('다른 공동체로 들어가기' 를 누르고 코드를 넣어주세요)`
    : "";

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

  const rename = async () => {
    const name = draftName.trim();
    if (!name || name === mine?.name) {
      setEditingName(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/communities/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "다시 시도해주세요.");
        return;
      }
      setMine((m) => (m ? { ...m, name: data.name } : m));
      saveCommunity({ id: data.id, name: data.name });
      onRenamed?.(data.name);
      setEditingName(false);
    } finally {
      setBusy(false);
    }
  };

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

  /** 주소와 코드를 한 덩어리로 복사한다 — 받는 분이 따로 찾을 필요가 없게 */
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // 복사가 막힌 브라우저를 위해 화면에도 문구를 그대로 보여준다
      setError("복사가 막혀 있습니다. 아래 문구를 길게 눌러 복사해주세요.");
    }
  };

  /** 카카오톡 등으로 바로 보내기 (휴대폰에서만 뜬다) */
  const shareInvite = async () => {
    try {
      await (navigator as any).share({ title: `${mine?.name} 말씀나눔`, text: inviteText });
    } catch {
      // 사용자가 취소한 경우 — 아무것도 하지 않는다
    }
  };

  const canShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  if (!mine) return null;

  return (
    <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6 mb-3 sm:mb-4">
      <h3 className="text-base sm:text-lg font-bold text-[#0C3B2E] flex items-center mb-1">
        <Users2 className="mr-1.5 text-[#4A6B57]" size={20} />
        우리 공동체
      </h3>

      {editingName ? (
        <div className="flex items-center gap-2 mb-3 mt-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={40}
            autoFocus
            className="flex-1 px-3 py-2 text-[#14261E] bg-[#F5F5F5] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-sm"
          />
          <button
            onClick={rename}
            disabled={busy}
            className="px-4 py-2 rounded-2xl bg-[#4A6B57] text-white text-sm font-semibold disabled:opacity-40 cursor-pointer"
          >
            저장
          </button>
          <button
            onClick={() => setEditingName(false)}
            className="px-3 py-2 rounded-2xl bg-[#F5F5F5] text-[#4A6B57] text-sm cursor-pointer"
          >
            취소
          </button>
        </div>
      ) : (
        <p className="text-sm text-[#6F8377] mb-3 flex items-center gap-1.5">
          {mine.name} · {mine.memberCount}명
          {isAdmin && (
            <button
              onClick={() => {
                setDraftName(mine.name);
                setEditingName(true);
              }}
              className="p-1 text-[#AFC0B2] hover:text-[#4A6B57] transition cursor-pointer"
              title="공동체 이름 바꾸기"
            >
              <Pencil size={14} />
            </button>
          )}
        </p>
      )}

      {error && <p className="text-sm text-[#8F1E17] mb-3">{error}</p>}

      {isAdmin && mine.joinCode && (
        <div className="bg-[#F5F5F5] rounded-2xl p-3.5 mb-3">
          <p className="text-xs font-semibold text-[#4A6B57] flex items-center mb-2">
            <KeyRound size={14} className="mr-1.5" />
            가입코드
          </p>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex-1 text-2xl font-bold tracking-[0.3em] text-[#0C3B2E]">
              {mine.joinCode}
            </span>
            <button
              onClick={regenerate}
              disabled={busy}
              className="p-2.5 rounded-2xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer disabled:opacity-40"
              title="새로 발급"
            >
              <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyInvite}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[#4A6B57] text-white text-sm font-semibold hover:bg-[#072A20] transition cursor-pointer"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "복사했습니다" : "초대 문구 복사"}
            </button>
            {canShare && (
              <button
                onClick={shareInvite}
                className="px-4 py-2.5 rounded-2xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer"
                title="보내기"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>

          {/* 복사되는 내용을 눈으로 확인하실 수 있게 그대로 보여준다 */}
          <pre className="mt-2.5 p-3 bg-white rounded-2xl text-2xs text-[#4A6B57] whitespace-pre-wrap break-all leading-relaxed select-all">
            {inviteText}
          </pre>

          <p className="text-xs text-[#6F8377] mt-2 leading-relaxed">
            주소와 코드가 함께 복사됩니다. 새어나갔다 싶으면 새로 발급하시면 됩니다 —
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
