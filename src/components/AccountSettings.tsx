import React, { useEffect, useState } from "react";
import { User, Lock, Users, LogOut, Trash2 } from "lucide-react";
import { SectionLabel, RowGroup, Row, SettingModal } from "./SettingsUI";
import ProfileModal from "./ProfileModal";
import { authFetch } from "../lib/session";

/**
 * 설정 화면의 '계정' 묶음.
 *
 * 예전에는 이름 바꾸는 폼과 지체 목록이 설정 화면에 통째로 펼쳐져 있어서
 * 화면이 아주 길었다. 이제는 줄만 보이고, 누르면 팝업으로 열린다.
 * 기능은 하나도 빼지 않았다 — 이름·PIN 수정, 관리자의 지체 PIN 변경·계정 삭제, 탈퇴, 로그아웃.
 */
interface Props {
  currentUser: { id: string; name: string; role: "admin" | "member" };
  onUserUpdate: (user: { id: string; name: string; role: "admin" | "member" }) => void;
  onAccountDeleted: () => void;
  onLogout: () => void;
}

export default function AccountSettings({
  currentUser,
  onUserUpdate,
  onAccountDeleted,
  onLogout
}: Props) {
  const [profileMode, setProfileMode] = useState<"profile" | "pin" | null>(null);
  const [showMembers, setShowMembers] = useState<boolean>(false);
  const [showLeave, setShowLeave] = useState<boolean>(false);

  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [editingPinUserId, setEditingPinUserId] = useState<string | null>(null);
  const [adminNewPin, setAdminNewPin] = useState<string>("");

  const isAdmin = currentUser.role === "admin";

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) setAllUsers(await res.json());
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAllUsers();
  }, [isAdmin]);

  const handleDeleteUser = async (userIdToDelete: string) => {
    const targetUser = allUsers.find((u) => u.id === userIdToDelete);
    const targetName = targetUser ? targetUser.name : "이 사용자";

    let confirmMsg = `⚠️ 정말로 '${targetName}' 계정을 영구 삭제하시겠습니까?\n로그인 화면의 목록에서도 완전히 지워지며 이 작업은 되돌릴 수 없습니다.`;
    if (userIdToDelete === currentUser.id) {
      confirmMsg = `⚠️ 정말로 본인의 계정('${currentUser.name}')을 삭제하고 탈퇴하시겠습니까?\n즉시 로그아웃 처리됩니다.`;
    }
    if (!confirm(confirmMsg)) return;

    try {
      const res = await authFetch(`/api/auth/users/${userIdToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestorId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        if (userIdToDelete === currentUser.id) {
          alert("계정이 영구 삭제되었습니다. 로그아웃합니다.");
          onAccountDeleted();
        } else {
          setAllUsers(allUsers.filter((u) => u.id !== userIdToDelete));
          alert("지체 계정이 성공적으로 삭제되었습니다.");
        }
      } else {
        alert(data.error || "계정 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  const handleAdminChangeUserPin = async (targetUserId: string) => {
    if (!adminNewPin || adminNewPin.length !== 4) {
      alert("비밀번호는 반드시 4자리 숫자여야 합니다.");
      return;
    }
    try {
      const res = await authFetch("/api/auth/users/admin-update-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id, targetUserId, newPin: adminNewPin })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "비밀번호가 변경되었습니다.");
        setEditingPinUserId(null);
        setAdminNewPin("");
      } else {
        alert(data.error || "변경에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  return (
    <div>
      <SectionLabel>계정</SectionLabel>
      <RowGroup>
        <Row
          icon={<User size={17} />}
          title="내 프로필"
          sub={`${currentUser.name} · ${isAdmin ? "관리자" : "지체"}`}
          onClick={() => setProfileMode("profile")}
        />
        <Row
          icon={<Lock size={17} />}
          title="비밀번호 변경"
          sub="로그인에 쓰는 숫자 4자리"
          onClick={() => setProfileMode("pin")}
        />
        {isAdmin ? (
          <Row
            icon={<Users size={17} />}
            title="지체 계정 관리"
            sub={`가입한 지체 ${allUsers.length}명 · 비밀번호 초기화 · 계정 삭제`}
            badge="관리자"
            onClick={() => {
              fetchAllUsers();
              setShowMembers(true);
            }}
          />
        ) : (
          <Row
            icon={<Trash2 size={17} />}
            title="계정 탈퇴"
            sub="내 이름을 목록에서 영구히 지웁니다"
            danger
            onClick={() => setShowLeave(true)}
          />
        )}
        <Row icon={<LogOut size={17} />} title="로그아웃" onClick={onLogout} chevron={false} />
      </RowGroup>

      {/* 내 이름 · 비밀번호 */}
      <ProfileModal
        open={profileMode !== null}
        mode={profileMode || "profile"}
        onClose={() => setProfileMode(null)}
        currentUser={currentUser}
        onUserUpdate={onUserUpdate}
      />

      {/* 관리자: 지체 계정 관리 */}
      <SettingModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        title="지체 계정 관리"
        sub="비밀번호를 잊으신 지체는 여기서 새 번호를 정해 알려드리면 됩니다."
      >
        {loadingUsers ? (
          <p className="text-xs text-[#6F8377] py-4 text-center">계정 목록을 불러오는 중...</p>
        ) : allUsers.length > 0 ? (
          <div className="space-y-2">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F9F9F9] rounded-2xl"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[#D2DDD3] text-[#4A6B57] text-2xs font-bold flex items-center justify-center shrink-0">
                    {u.name.slice(-1)}
                  </span>
                  <span className="text-sm font-bold text-[#14261E] truncate">{u.name}</span>
                  {u.role === "admin" && (
                    <span className="text-2xs font-bold text-[#4A3600] bg-[#FFBA00] px-2 py-0.5 rounded-full shrink-0">
                      관리자
                    </span>
                  )}
                </span>

                {u.id === currentUser.id ? (
                  <span className="text-2xs text-[#6F8377] font-bold px-2">나</span>
                ) : editingPinUserId === u.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="새 PIN"
                      value={adminNewPin}
                      onChange={(e) => setAdminNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-20 px-2 py-1.5 rounded-xl text-center text-xs font-bold tracking-widest text-[#14261E] bg-white"
                    />
                    <button
                      onClick={() => handleAdminChangeUserPin(u.id)}
                      className="grad-forest text-white px-3 py-1.5 rounded-xl text-2xs font-bold transition cursor-pointer"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingPinUserId(null);
                        setAdminNewPin("");
                      }}
                      className="bg-white text-[#6F8377] px-3 py-1.5 rounded-xl text-2xs font-bold transition cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingPinUserId(u.id);
                        setAdminNewPin("");
                      }}
                      className="text-2xs font-bold text-[#4A6B57] bg-white hover:bg-[#F0F0F0] flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Lock size={11} />
                      비번
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-2xs font-bold text-[#B3261E] bg-white hover:bg-[#FDF3F3] flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 size={11} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6F8377] py-4 text-center">가입된 지체가 없습니다.</p>
        )}
      </SettingModal>

      {/* 지체: 탈퇴 */}
      <SettingModal
        open={showLeave}
        onClose={() => setShowLeave(false)}
        title="계정 탈퇴"
        sub="탈퇴하시면 로그인 화면의 이름 목록에서 내 이름이 영구히 지워집니다."
      >
        <div className="space-y-3">
          <p className="text-xs text-[#7A1913] bg-[#FDF3F3] rounded-2xl p-3.5 leading-relaxed font-medium">
            이 조치는 즉시 효력을 가지며 되돌릴 수 없습니다. 잠시 쉬어가시는 것이라면 로그아웃만
            하셔도 됩니다.
          </p>
          <button
            onClick={() => handleDeleteUser(currentUser.id)}
            className="w-full flex items-center justify-center gap-1.5 py-3 px-4 text-white bg-[#B3261E] hover:bg-[#8F1E17] rounded-2xl text-sm font-bold transition cursor-pointer"
          >
            <Trash2 size={15} />
            내 계정 영구 삭제하기
          </button>
        </div>
      </SettingModal>
    </div>
  );
}
