import React, { useEffect, useState } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { SettingModal } from "./SettingsUI";
import { authFetch } from "../lib/session";

/**
 * 내 이름 · 비밀번호(PIN) 바꾸기.
 *
 * 서버는 이름과 PIN 을 **함께** 받는다(/api/auth/users/update) — 한쪽만 보내면 거절한다.
 * 그래서 어느 쪽으로 들어와도 두 칸을 다 보여주고, 들어온 문에 따라 제목과 설명만 바꾼다.
 * (예전에는 이 폼이 설정 화면 한가운데 펼쳐져 있어서, 이름만 고치려던 분이
 *  비밀번호 칸을 비워 두고 저장을 눌렀다가 계속 실패했다)
 */
interface Props {
  open: boolean;
  onClose: () => void;
  /** 'profile' = 이름부터, 'pin' = 비밀번호부터 */
  mode: "profile" | "pin";
  currentUser: { id: string; name: string; role: "admin" | "member" };
  onUserUpdate: (user: { id: string; name: string; role: "admin" | "member" }) => void;
}

export default function ProfileModal({ open, onClose, mode, currentUser, onUserUpdate }: Props) {
  const [name, setName] = useState<string>(currentUser.name);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // 열 때마다 지금 이름으로 맞춰 둔다 (다른 곳에서 이름이 바뀌었을 수 있다)
  useEffect(() => {
    if (open) {
      setName(currentUser.name);
      setPin("");
      setError("");
      setSuccess("");
    }
  }, [open, currentUser.name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (pin.length !== 4) {
      setError("비밀번호는 숫자 4자리로 넣어주세요. (지금 쓰시는 번호를 그대로 넣으셔도 됩니다)");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await authFetch("/api/auth/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, name: name.trim(), pin })
      });
      const data = await res.json();
      if (res.ok) {
        onUserUpdate(data);
        setSuccess("저장했습니다.");
        setPin("");
        setTimeout(() => {
          setSuccess("");
          onClose();
        }, 1200);
      } else {
        setError(data.error || "수정에 실패했습니다.");
      }
    } catch {
      setError("서버와의 통신에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingModal
      open={open}
      onClose={onClose}
      title={mode === "pin" ? "비밀번호 변경" : "내 프로필"}
      sub={
        mode === "pin"
          ? "새로 쓰실 숫자 4자리를 넣어주세요. 다음 로그인부터 이 번호를 쓰십니다."
          : "이름을 바꾸면 지금까지 쓰신 묵상·댓글의 이름도 함께 바뀝니다."
      }
    >
      <form onSubmit={submit} className="space-y-3.5">
        {error && (
          <div className="bg-[#FDF3F3] text-[#8F1E17] text-xs font-semibold p-3 rounded-2xl flex items-start gap-1.5">
            <ShieldAlert className="shrink-0 mt-px" size={14} />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-[#E8F0E9] text-[#0C3B2E] text-xs font-semibold p-3 rounded-2xl flex items-center gap-1.5">
            <Check className="shrink-0" size={14} />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label className="block text-2xs font-bold text-[#6F8377] mb-1.5 ml-1">내 이름</label>
          <input
            type="text"
            value={name}
            autoFocus={mode === "profile"}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김성경"
            className="w-full text-sm px-4 py-3 bg-[#F9F9F9] rounded-2xl text-[#14261E] font-semibold focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
            required
          />
        </div>

        <div>
          <label className="block text-2xs font-bold text-[#6F8377] mb-1.5 ml-1">
            비밀번호 4자리 (PIN)
          </label>
          <input
            type="password"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            value={pin}
            autoFocus={mode === "pin"}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
            className="w-full text-base px-4 py-3 bg-[#F9F9F9] rounded-2xl text-[#14261E] font-bold tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
            required
          />
          <p className="text-2xs text-[#6F8377] mt-1.5 ml-1 leading-relaxed">
            {mode === "pin"
              ? "여기 넣으신 번호가 새 비밀번호가 됩니다."
              : "본인 확인을 위해 필요합니다. 지금 쓰시는 번호를 그대로 넣으시면 비밀번호는 그대로입니다."}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="grad-forest w-full py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </SettingModal>
  );
}
