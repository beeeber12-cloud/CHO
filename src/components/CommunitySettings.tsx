import React, { useEffect, useState } from "react";
import {
  Users2, RefreshCw, ShieldCheck, Shield, Copy, Check, Share2, UserCog, UserPlus
} from "lucide-react";
import { saveCommunity } from "../lib/session";
import { SectionLabel, RowGroup, Row, SettingModal } from "./SettingsUI";

/**
 * 우리 공동체 관리.
 *
 * - 모든 지체: 우리 공동체 이름과 인원
 * - 관리자만: 이름 바꾸기, 초대 링크 보내기·새로 만들기, 지체 권한
 *
 * 새 지체는 **초대 링크**로 부른다 (…/?join=코드). 누르면 바로 우리 공동체 로그인 화면이
 * 열리므로 코드를 옮겨 적을 일이 없다. 링크 안의 여섯 자리는 평소 감춰 두고,
 * 링크가 새어나갔을 때만 꺼내 새로 만든다 — 그 순간 옛 링크는 통하지 않는다.
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
  const [showRename, setShowRename] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [showJoinCode, setShowJoinCode] = useState(false);
  /** 여섯 자리 코드는 평소에 감춰 둔다 (링크를 막을 때만 쓴다) */
  const [showCode, setShowCode] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const isAdmin = currentUser.role === "admin";

/**
   * 초대 링크 — 이 주소를 누르면 **바로 우리 공동체 로그인 화면**이 열린다.
   * 가입코드를 옮겨 적을 필요가 없다 (코드는 링크 안에 들어 있다).
   */
  const inviteLink = mine ? `${window.location.origin}/?join=${mine.joinCode}` : "";

  /** 카카오톡에 그대로 붙여넣는 초대 문구 */
  const inviteText = mine
    ? `${mine.name} 말씀나눔에 초대합니다.\n\n` +
      `아래 링크를 누르면 바로 들어오실 수 있어요.\n` +
      `${inviteLink}\n\n` +
      `휴대폰 홈 화면에 앱처럼 두시려면, 링크를 연 뒤 화면에 뜨는 '설치' 안내를 따라주세요.`
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
      setShowRename(false);
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
      setShowRename(false);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!confirm("초대 링크를 새로 만들면 지금까지 보낸 링크는 더 이상 쓸 수 없습니다.\n계속할까요?")) return;
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
    <div>
      <SectionLabel>우리 공동체</SectionLabel>
      <RowGroup>
        <Row
          icon={<Users2 size={17} />}
          title={mine.name}
          sub={`지체 ${mine.memberCount}명${isAdmin ? " · 눌러서 이름 바꾸기" : ""}`}
          onClick={
            isAdmin
              ? () => {
                  setDraftName(mine.name);
                  setShowRename(true);
                }
              : undefined
          }
        />

        {isAdmin && mine.joinCode && (
          <Row
            icon={<UserPlus size={17} />}
            title="초대하기"
            sub="링크 하나를 보내면 바로 우리 공동체로 들어옵니다"
            badge="관리자"
            onClick={() => setShowJoinCode(true)}
          />
        )}

        {isAdmin && (
          <Row
            icon={<UserCog size={17} />}
            title="지체 권한 관리"
            sub={`관리자 ${members.filter((m) => m.role === "admin").length}명`}
            badge="관리자"
            onClick={() => setShowMembers(true)}
          />
        )}
      </RowGroup>

      {error && <p className="text-xs text-[#8F1E17] mt-2 ml-1.5">{error}</p>}

      {/* 공동체 이름 바꾸기 */}
      <SettingModal
        open={showRename}
        onClose={() => setShowRename(false)}
        title="공동체 이름"
        sub="앱 맨 위에 보이는 이름입니다."
      >
        <div className="space-y-3">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={40}
            autoFocus
            className="w-full px-4 py-3 text-[#14261E] bg-[#F9F9F9] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-sm font-semibold"
          />
          <button
            onClick={rename}
            disabled={busy}
            className="grad-forest w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 cursor-pointer hover:brightness-110"
          >
            저장하기
          </button>
        </div>
      </SettingModal>

      {/* 가입코드 · 초대하기 */}
      <SettingModal
        open={showJoinCode}
        onClose={() => setShowJoinCode(false)}
        title="초대하기"
        sub="이 링크를 카톡으로 보내세요. 누르면 바로 우리 공동체 로그인 화면이 열립니다."
      >
        <div className="space-y-3">
          {/* 초대 링크 — 눈으로 확인하고 그대로 복사하실 수 있게 */}
          <div className="bg-[#F9F9F9] rounded-2xl px-4 py-3">
            <p className="text-2xs font-bold text-[#6F8377] mb-1">초대 링크</p>
            <p className="text-xs font-semibold text-[#0C3B2E] break-all select-all leading-relaxed">
              {inviteLink}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyInvite}
              className="grad-forest flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer hover:brightness-110"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "복사했습니다" : "초대 문구 복사"}
            </button>
            {canShare && (
              <button
                onClick={shareInvite}
                className="px-4 py-3 rounded-2xl bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0] transition cursor-pointer"
                title="보내기"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>

          {/* 복사되는 내용을 눈으로 확인하실 수 있게 그대로 보여준다 */}
          <pre className="p-3.5 bg-[#F9F9F9] rounded-2xl text-2xs text-[#4A6B57] whitespace-pre-wrap break-all leading-relaxed select-all">
            {inviteText}
          </pre>

          {/*
            여섯 자리 코드는 이제 링크 안에 들어 있다 — 옮겨 적으실 일이 없다.
            다만 링크가 새어나갔을 때 **막는 열쇠**라서 없앨 수는 없다.
            그래서 눈에서만 치우고, 필요할 때 펼쳐 보시게 한다.
          */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="text-2xs font-bold text-[#6F8377] hover:text-[#0C3B2E] cursor-pointer underline"
            >
              {showCode ? "코드 숨기기" : "링크가 새어나갔나요?"}
            </button>

            {showCode && (
              <div className="mt-2 bg-[#F9F9F9] rounded-2xl p-3.5 space-y-2.5">
                <p className="text-2xs text-[#4A6B57] leading-relaxed">
                  초대 링크에는 아래 여섯 자리가 들어 있습니다. 새로 만들면
                  <b> 지금까지 보낸 링크는 그 순간부터 막힙니다.</b>
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-lg font-bold tracking-[0.3em] text-[#0C3B2E]">
                    {mine.joinCode}
                  </span>
                  <button
                    onClick={regenerate}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-[#4A6B57] hover:bg-[#EAEAEA] transition cursor-pointer disabled:opacity-40 shrink-0 text-2xs font-bold"
                  >
                    <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                    링크 새로 만들기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingModal>

      {/* 지체 권한 관리 */}
      <SettingModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        title="지체 권한 관리"
        sub="관리자는 말씀 공지·속 관리·챌린지 시작을 할 수 있습니다."
      >
        <div className="space-y-2">
          {members.map((m) => {
            const admin = m.role === "admin";
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-2xl bg-[#F9F9F9]"
              >
                <span className="flex items-center text-sm font-semibold text-[#14261E] min-w-0">
                  {admin ? (
                    <ShieldCheck size={15} className="mr-1.5 text-[#4A6B57] shrink-0" />
                  ) : (
                    <Shield size={15} className="mr-1.5 text-[#AFC0B2] shrink-0" />
                  )}
                  <span className="truncate">{m.name}</span>
                  {m.id === currentUser.id && (
                    <span className="ml-1.5 text-2xs text-[#6F8377] shrink-0">(나)</span>
                  )}
                </span>
                {m.id !== currentUser.id && (
                  <button
                    onClick={() => changeRole(m, admin ? "member" : "admin")}
                    disabled={busy}
                    className="text-2xs font-bold px-3 py-1.5 rounded-full bg-white text-[#4A6B57] hover:bg-[#F0F0F0] transition cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    {admin ? "관리자 내리기" : "관리자로"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SettingModal>
    </div>
  );
}

