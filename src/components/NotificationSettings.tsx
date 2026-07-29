import React, { useState, useEffect } from "react";
import { AlarmConfig } from "../types";
import { Bell, Clock, Calendar, Check, AlertCircle, Volume2, Sparkles, Send, BellOff, X, User, Lock, ShieldAlert, Trash2, Users, Type, ZoomIn, Smartphone, Download, Share, PlusSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFontSize, FontScale } from "../context/FontSizeContext";


interface NotificationSettingsProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
  onUserUpdate: (user: { id: string; name: string; role: 'admin' | 'member' }) => void;
  onAccountDeleted: () => void;
}

function FontSizeSettingCard() {
  const { fontScale, setFontScale } = useFontSize();

  const scales: { key: FontScale; label: string; desc: string }[] = [
    { key: "small", label: "작게", desc: "11px 아담하고 작고 깔끔한 폰트" },
    { key: "normal", label: "보통 크기", desc: "기본 폰트 크기 유지" },
    { key: "large", label: "크게", desc: "20px 시원하고 읽기 편함" },
    { key: "xlarge", label: "아주 크게", desc: "28px 선명한 대형 폰트" },
  ];

  return (
    <div className="border-t border-[#E5E5EA] pt-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#E3F2E9] text-[#14603F] rounded-2xl">
          <ZoomIn size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#14603F] text-base">어르신 화면 글씨 크기 설정</h3>
          <p className="text-[11px] text-[#8E8E93]">성경 말씀과 묵상 글을 시원하고 큼직하게 읽으실 수 있습니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {scales.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFontScale(s.key)}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition text-left cursor-pointer ${
              fontScale === s.key
                ? "bg-[#14603F] text-white border-[#14603F] shadow-sm"
                : "bg-[#F7F7FA] text-[#3A3A3C] border-[#E5E5EA] hover:bg-[#F2F2F7]"
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Type size={14} />
                {s.label}
              </div>
              <div className={`text-[10px] mt-0.5 ${fontScale === s.key ? "text-[#E3F2E9]" : "text-[#8E8E93]"}`}>
                {s.desc}
              </div>
            </div>
            {fontScale === s.key && (
              <span className="text-[10px] bg-[#E3F2E9] text-[#14603F] px-2 py-0.5 rounded-full font-black">
                적용중
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NotificationSettings({ currentUser, onUserUpdate, onAccountDeleted }: NotificationSettingsProps) {

  const [config, setConfig] = useState<AlarmConfig | null>(null);
  const [time, setTime] = useState<string>("07:30");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");

  // Simulated Alert State
  const [simulatedAlert, setSimulatedAlert] = useState<string | null>(null);

  // Profile update state
  const [profileName, setProfileName] = useState<string>(currentUser.name);
  const [profilePin, setProfilePin] = useState<string>("");
  const [profileError, setProfileError] = useState<string>("");
  const [profileSuccess, setProfileSuccess] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  // User management state
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [editingPinUserId, setEditingPinUserId] = useState<string | null>(null);
  const [adminNewPin, setAdminNewPin] = useState<string>("");

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  useEffect(() => {
    fetchAlarmConfig();
    fetchAllUsers();
  }, [currentUser]);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError("이름을 입력해주세요.");
      return;
    }
    if (!profilePin || profilePin.length !== 4) {
      setProfileError("본인 확인 및 변경을 위해 4자리 비밀번호(PIN)를 꼭 입력해주세요.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await fetch("/api/auth/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: profileName.trim(),
          pin: profilePin
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProfileSuccess("내 정보가 성공적으로 변경되었습니다!");
        onUserUpdate(data);
        setProfilePin("");
        setTimeout(() => setProfileSuccess(""), 3000);
      } else {
        setProfileError(data.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      setProfileError("서버와의 통신에 실패했습니다.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteUser = async (userIdToDelete: string) => {
    const targetUser = allUsers.find(u => u.id === userIdToDelete);
    const targetName = targetUser ? targetUser.name : "이 사용자";
    
    let confirmMsg = `⚠️ 정말로 '${targetName}' 계정을 영구 삭제하시겠습니까?\n로그인 화면의 목록에서도 완전히 지워지며 이 작업은 되돌릴 수 없습니다.`;
    if (userIdToDelete === currentUser.id) {
      confirmMsg = `⚠️ 정말로 본인의 계정('${targetName}')을 삭제하고 탈퇴하시겠습니까?\n모든 기록은 유지되거나 지워지며 즉시 로그아웃 처리됩니다.`;
    }

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${userIdToDelete}`, {
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
          setAllUsers(allUsers.filter(u => u.id !== userIdToDelete));
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
      const res = await fetch("/api/auth/users/admin-update-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id,
          targetUserId,
          newPin: adminNewPin
        })
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

  const fetchAlarmConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alarms/${currentUser.id}`);
      if (res.ok) {
        const data: AlarmConfig = await res.json();
        setConfig(data);
        setTime(data.time);
        setEnabled(data.enabled);
        setDays(data.days);
      }
    } catch (err) {
      console.error("Failed to load alarm config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");

    try {
      const res = await fetch("/api/alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          time,
          enabled,
          days
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSuccess("매일 아침 묵상 독려 알림 설정이 저장되었습니다!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Failed to save alarm:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter(d => d !== dayIndex));
    } else {
      setDays([...days, dayIndex].sort());
    }
  };

  const triggerSimulatedNotification = () => {
    // Encouragement templates
    const messages = [
      `📢 말씀 배달! "${currentUser.name} 성도님, 맑은 아침입니다. 오늘 배달된 말씀 공지를 확인하고, 5분의 묵상으로 은혜 가득한 하루를 시작해보세요!"`,
      `🌅 아침 묵상 시간 독려: "오늘의 주님 약속이 등록되었습니다. 소그룹 동역자들과 은혜를 나누기 위해 오늘 한 절 말씀을 꼭 묵상해봐요."`,
      `🙏 ${currentUser.name}님을 위한 응원 알림: "지체들의 묵상 글이 공유되고 있습니다. 서로를 격려하는 소중한 나눔터로 놀러오세요!"`,
      `✨ 오늘 하루도 주님과 동행하세요! "바쁘고 분주한 일상 속에서 잠시 멈춰, 오늘의 말씀을 묵상하는 영적인 쉼을 누려봅시다."`
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setSimulatedAlert(randomMessage);

    // Optional browser standard notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("📖 아침 성경 묵상 독려", {
          body: randomMessage,
          icon: "/favicon.ico"
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("📖 아침 성경 묵상 독려", {
              body: randomMessage
            });
          }
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5E5EA] shadow-sm p-3.5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-[#E5E5EA] pb-3">
        <div className="p-1.5 sm:p-2 bg-[#E3F2E9] text-[#14603F] rounded-2xl shrink-0">
          <Bell size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#14603F] text-base sm:text-lg whitespace-nowrap">아침 묵상 알림 및 설정</h3>
          <p className="text-[11px] sm:text-xs text-[#8E8E93]">매일 아침 약속된 시간에 묵상을 독려하는 알림 및 개인 설정을 관리합니다</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Enabled Status Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#F2F2F7] rounded-2xl border border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            {enabled ? (
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Bell size={18} />
              </div>
            ) : (
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                <BellOff size={18} />
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-slate-950 block">알림 기능 활성화</span>
              <p className="text-[10px] text-slate-500">설정한 시간에 알람 독려를 활성화합니다</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#17784C]"></div>
          </label>
        </div>

        {/* Time selection */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 flex items-center gap-1">
            <Clock size={14} className="text-[#17784C]" />
            독려 알림 희망 시간
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-3.5 py-2.5 border border-[#E5E5EA] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#17784C] text-slate-800 text-sm font-semibold shadow-sm"
          />
        </div>

        {/* Days Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] mb-2 flex items-center gap-1">
            <Calendar size={14} className="text-[#17784C]" />
            알림 요일 반복 선택
          </label>
          <div className="flex gap-1.5">
            {dayLabels.map((label, index) => {
              const isSelected = days.includes(index);
              const isWeekend = index === 0 || index === 6;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`w-9 h-9 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? "bg-[#14603F] border-[#14603F] text-white"
                      : isWeekend
                      ? "bg-[#F2F2F7] border-[#E5E5EA] text-rose-500 hover:bg-[#D8D8DE]"
                      : "bg-[#F2F2F7] border-[#E5E5EA] text-slate-600 hover:bg-[#D8D8DE]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {success && (
          <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100/50 flex items-center gap-1.5">
            <Check size={14} className="stroke-[3px]" />
            {success}
          </p>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#17784C] hover:bg-[#125E3B] px-4 py-2.5 rounded-2xl shadow-md transition cursor-pointer"
          >
            {saving ? "설정 저장 중..." : "알림 설정 저장"}
          </button>
        </div>
      </form>

      {/* Interactive push simulator */}
      <div className="border-t border-[#E5E5EA] pt-5 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
          <Sparkles className="text-[#17784C] animate-pulse" size={14} />
          알림 기능 테스트 및 시뮬레이션
        </h4>
        <p className="text-[11px] text-[#8E8E93] leading-relaxed">
          웹 브라우저 및 앱 환경에서 매일 아침 성도들에게 발송될 묵상 시간 독려 알림 메시지를 즉시 미리 받아보실 수 있습니다.
        </p>

        <button
          onClick={triggerSimulatedNotification}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-[#17784C]/50 hover:border-[#17784C] bg-[#E3F2E9]/20 hover:bg-[#E3F2E9]/50 text-[#14603F] text-xs font-bold py-3 px-4 rounded-2xl transition cursor-pointer"
        >
          <Send size={14} />
          아침 묵상 독려 알림 가상 수신하기
        </button>

        {/* Real-time beautiful simulated alert display */}
        <AnimatePresence>
          {simulatedAlert && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              className="bg-[#14603F] text-white rounded-3xl p-4 shadow-lg border border-[#E5E5EA] relative overflow-hidden"
            >
              <div className="flex gap-2.5 items-start">
                <div className="p-2 bg-[#17784C] rounded-2xl text-white">
                  <Volume2 size={16} />
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold text-[#E3F2E9] tracking-widest flex items-center gap-1">
                    <Bell size={10} className="animate-bounce" />
                    BIBLE MEDITATION NOTIFICATION
                  </span>
                  <p className="text-xs leading-relaxed text-slate-100 font-medium">
                    {simulatedAlert}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedAlert(null)}
                className="absolute right-2 top-2 p-1 text-[#E3F2E9] hover:text-white rounded-md cursor-pointer"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Font size settings for adults and seniors */}
      <FontSizeSettingCard />

      {/* PWA App Installation Guide Card */}
      <div className="border-t border-[#E5E5EA] pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#E3F2E9] text-[#14603F] rounded-2xl">
            <Smartphone size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#14603F] text-base">스마트폰 앱(PWA) 설치 안내</h3>
            <p className="text-[11px] text-[#8E8E93]">주소 입력 없이 홈 화면 아이콘 한 번으로 바로 들어오세요.</p>
          </div>
        </div>

        <div className="bg-[#F7F7FA] border border-[#E5E5EA] rounded-2xl p-4 space-y-3 text-xs text-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-[#E5E5EA] space-y-1.5">
              <span className="font-bold text-[#14603F] flex items-center gap-1">
                📱 갤럭시 / 안드로이드
              </span>
              <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                상단 배너의 <strong>'앱 설치'</strong> 버튼을 누르시거나, 크롬/삼성인터넷 브라우저 메뉴(⋮)에서 <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 누르시면 스마트폰 바탕화면에 은혜교회 앱이 생성됩니다.
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#E5E5EA] space-y-1.5">
              <span className="font-bold text-[#14603F] flex items-center gap-1">
                🍎 아이폰 / 아이패드 (iOS)
              </span>
              <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                사파리(Safari) 화면 하단의 <strong>공유 아이콘(<Share size={10} className="inline text-blue-600" />)</strong>을 누른 후, 아래로 내려 <strong>'홈 화면에 추가(<PlusSquare size={10} className="inline" />)'</strong>를 선택하시면 홈 화면에 바로 설치됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile modification section */}
      <div className="border-t border-[#E5E5EA] pt-6 space-y-4">

        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#E3F2E9] text-[#14603F] rounded-2xl">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#14603F] text-base">내 프로필 및 비밀번호(PIN) 수정</h3>
            <p className="text-[11px] text-[#8E8E93]">로그인 이름과 4자리 비밀번호(PIN)를 변경할 수 있습니다.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-3 max-w-md text-xs">
          {profileError && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-2.5 text-rose-700 font-semibold rounded-r-lg flex items-center">
              <ShieldAlert className="mr-1.5 flex-shrink-0" size={14} />
              <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-2.5 text-emerald-700 font-semibold rounded-r-lg flex items-center">
              <Check className="mr-1.5 flex-shrink-0" size={14} />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#8E8E93] mb-1">내 이름 (지체 표시명)</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="예: 김성경"
              className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-2xl bg-[#F7F7FA] text-slate-800 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#17784C]"
              required
            />
            <p className="text-[9px] text-[#8E8E93] mt-0.5">괄호 부분 등 원하는 직분이나 꼬리말도 수정할 수 있습니다 (예: 관리자(목사님) ➡️ 김목사)</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8E8E93] mb-1">비밀번호 4자리 (PIN)</label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={profilePin}
              onChange={(e) => setProfilePin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="변경할 4자리 숫자 비밀번호"
              className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-2xl bg-[#F7F7FA] text-slate-800 font-bold tracking-widest text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-[#17784C]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#14603F] hover:bg-[#125E3B] px-4 py-2 rounded-2xl shadow-sm transition cursor-pointer"
          >
            {profileSaving ? "정보 변경 중..." : "내 정보 및 PIN 비밀번호 변경하기"}
          </button>
        </form>
      </div>

      {/* Account Deletion and Member List Management section */}
      <div className="border-t border-[#E5E5EA] pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 text-rose-700 rounded-2xl">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#14603F] text-base">
              {currentUser.role === "admin" ? "지체 계정 관리 (가입 목록 및 삭제)" : "계정 탈퇴 및 이름 삭제"}
            </h3>
            <p className="text-[11px] text-[#8E8E93]">
              {currentUser.role === "admin"
                ? "등록된 모든 말씀 나눔방 지체들의 가입 현황 확인 및 계정 정리"
                : "나눔방에서 더이상 내 이름을 사용하지 않을 때 계정을 영구 탈퇴 처리합니다."}
            </p>
          </div>
        </div>

        {currentUser.role === "admin" ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loadingUsers ? (
              <p className="text-[11px] text-[#8E8E93]">계정 목록을 불러오는 중...</p>
            ) : allUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {allUsers.map((u) => (
                  <div key={u.id} className="flex justify-between items-center p-2.5 bg-[#F7F7FA] border border-[#E5E5EA] rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#14603F] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {u.name.slice(-2)}
                      </div>
                      <span className="font-bold text-slate-800">
                        {u.name} {u.role === "admin" ? <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-black">관리자</span> : <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">지체</span>}
                      </span>
                    </div>
                    {u.id !== currentUser.id ? (
                      editingPinUserId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="password"
                            maxLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            placeholder="새 PIN"
                            value={adminNewPin}
                            onChange={(e) => setAdminNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-14 px-1 py-0.5 border border-[#E5E5EA] rounded text-center text-[10px] font-bold tracking-widest text-slate-800 bg-white"
                          />
                          <button
                            onClick={() => handleAdminChangeUserPin(u.id)}
                            className="bg-[#14603F] hover:bg-[#125E3B] text-white px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingPinUserId(null);
                              setAdminNewPin("");
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPinUserId(u.id);
                              setAdminNewPin("");
                            }}
                            className="text-[10px] font-bold text-slate-600 hover:text-[#14603F] flex items-center gap-0.5 hover:bg-slate-100 px-1.5 py-1 rounded-xl transition cursor-pointer"
                            title="비밀번호 변경"
                          >
                            <Lock size={11} />
                            비번
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 hover:bg-rose-50 px-1.5 py-1 rounded-xl transition cursor-pointer"
                            title="계정 삭제"
                          >
                            <Trash2 size={11} />
                            삭제
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-[9px] text-[#8E8E93] font-bold italic px-2">나</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#8E8E93]">가입된 지체가 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="max-w-md bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-2.5">
            <p className="font-bold">⚠️ 주의사항:</p>
            <p className="leading-relaxed">
              계정을 삭제하시면 로그인 화면의 <strong>이름 목록에서 내 이름이 영구적으로 지워집니다</strong>. 이 조치는 즉시 효력을 가집니다.
            </p>
            <button
              onClick={() => handleDeleteUser(currentUser.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-rose-200 hover:border-rose-300 text-rose-700 hover:text-white bg-white hover:bg-rose-600 rounded-2xl font-bold transition shadow-sm cursor-pointer"
            >
              <Trash2 size={14} />
              내 이름 목록에서 영구 지우기 (탈퇴하기)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
