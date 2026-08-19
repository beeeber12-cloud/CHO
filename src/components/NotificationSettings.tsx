import React, { useState, useEffect } from "react";
import { AlarmConfig } from "../types";
import { Bell, Clock, Calendar, Check, AlertCircle, Volume2, Sparkles, Send, BellOff, X, User, Lock, ShieldAlert, Trash2, Users, Type, ZoomIn, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFontSize, FontScale } from "../context/FontSizeContext";
import { checkPushSupport, enablePush, disablePush, isPushEnabled, sendTestPush, PushSupport } from "../lib/push";
import { authFetch, clearToken } from "../lib/session";


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
    <div className="border-t border-[#E3E9E2] pt-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl">
          <ZoomIn size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#0C3B2E] text-base">어르신 화면 글씨 크기 설정</h3>
          <p className="text-2xs text-[#6F8377]">성경 말씀과 묵상 글을 시원하고 큼직하게 읽으실 수 있습니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {scales.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFontScale(s.key)}
            className={`flex items-center justify-between p-3.5 rounded-3xl border transition text-left cursor-pointer ${
              fontScale === s.key
                ? "bg-[#0C3B2E] text-white border-[#0C3B2E] shadow-sm"
                : "bg-[#F0F0F0] text-[#4A6B57] border-[#E3E9E2] hover:bg-[#F5F5F5]"
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Type size={14} />
                {s.label}
              </div>
              <div className={`text-2xs mt-0.5 ${fontScale === s.key ? "text-[#F5F5F5]" : "text-[#6F8377]"}`}>
                {s.desc}
              </div>
            </div>
            {fontScale === s.key && (
              <span className="text-2xs bg-[#F5F5F5] text-[#0C3B2E] px-2 py-0.5 rounded-full font-black">
                적용중
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 진짜 푸시 알림 설정.
 * 브라우저를 닫아둬도 도착하는 알림이라, 기존의 "브라우저 열려 있을 때만 오는 알림"과는 다르다.
 */
function PushNotificationCard({ userId }: { userId: string }) {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [enabled, setEnabled] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");
  const [msgTone, setMsgTone] = useState<"ok" | "warn">("ok");

  useEffect(() => {
    setSupport(checkPushSupport());
    isPushEnabled().then(setEnabled);
  }, []);

  const show = (text: string, tone: "ok" | "warn" = "ok") => {
    setMsgTone(tone);
    setMsg(text);
  };

  const handleToggle = async () => {
    setBusy(true);
    setMsg("");
    try {
      if (enabled) {
        const ok = await disablePush();
        if (ok) {
          setEnabled(false);
          show("이 기기에서 알림을 껐습니다.");
        } else {
          show("알림 해제에 실패했습니다.", "warn");
        }
      } else {
        const res = await enablePush(userId);
        if (res.ok) {
          setEnabled(true);
          show("알림이 켜졌습니다. 아래 '테스트 알림 받기'로 확인해 보세요.");
        } else {
          show(res.message || "알림을 켜지 못했습니다.", "warn");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setMsg("");
    const res = await sendTestPush(userId);
    show(
      res.ok ? "테스트 알림을 보냈습니다. 잠시 후 도착합니다." : res.message || "발송 실패",
      res.ok ? "ok" : "warn"
    );
    setBusy(false);
  };

  return (
    <div className="border-t border-[#E3E9E2] pt-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl">
          <Smartphone size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#0C3B2E] text-base">새 글 알림</h3>
          <p className="text-xs text-[#6F8377] font-medium">
            새 말씀·묵상·댓글이 올라오면 휴대폰으로 바로 알려드립니다.
          </p>
        </div>
      </div>

      {support === "ios-needs-install" ? (
        <div className="bg-[#FFF7E0] rounded-3xl p-3.5 text-xs text-[#0C3B2E] leading-relaxed font-medium space-y-1">
          <p className="font-bold">아이폰은 앱으로 설치해야 알림을 받을 수 있습니다.</p>
          <p className="text-[#6F8377]">
            사파리 하단 <strong>공유 버튼</strong> → <strong>홈 화면에 추가</strong> 를 누른 뒤,
            홈 화면에 생긴 아이콘으로 열어 이 화면에서 다시 켜주세요. (애플 정책이라 우회할 방법이 없습니다.)
          </p>
        </div>
      ) : support === "unsupported" ? (
        <div className="bg-[#F5F5F5] rounded-3xl p-3.5 text-xs text-[#6F8377] font-medium">
          이 브라우저는 푸시 알림을 지원하지 않습니다. 크롬 또는 삼성 인터넷을 사용해 주세요.
        </div>
      ) : (
        <div className="space-y-2.5">
          <button
            onClick={handleToggle}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-3 px-4 rounded-3xl transition cursor-pointer disabled:opacity-50 ${
              enabled
                ? "bg-[#F5F5F5] text-[#0C3B2E] hover:bg-[#D2DDD3]"
                : "bg-[#FFBA00] text-[#0C3B2E] hover:bg-[#E8A900]"
            }`}
          >
            {enabled ? <BellOff size={14} /> : <Bell size={14} />}
            {busy ? "처리 중..." : enabled ? "이 기기에서 알림 끄기" : "휴대폰 알림 켜기"}
          </button>

          {enabled && (
            <button
              onClick={handleTest}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-[#F5F5F5] hover:bg-[#D2DDD3] text-[#0C3B2E] text-xs font-bold py-3 px-4 rounded-3xl transition cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              테스트 알림 받기
            </button>
          )}
        </div>
      )}

      {msg && (
        <p
          className={`text-xs leading-relaxed font-medium whitespace-pre-line rounded-3xl p-3 ${
            msgTone === "ok" ? "bg-[#F5F5F5] text-[#0C3B2E]" : "bg-[#FDF3F3] text-[#7A1913]"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

/**
 * 누가 알림을 켜 뒀는지 보여주는 표 (관리자만).
 * "알림이 안 와요" 의 대부분은 그 지체가 아직 안 켠 경우다.
 * 서버 로그를 볼 수 없으니 화면에서 바로 확인할 수 있어야 한다.
 */
function PushStatusCard() {
  const [status, setStatus] = useState<{
    pushReady: boolean;
    totalDevices: number;
    users: { name: string; devices: number }[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/push/status");
      if (res.ok) setStatus(await res.json());
    } catch (err) {
      console.error("알림 현황을 불러오지 못했습니다:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const on = status?.users.filter((u) => u.devices > 0) || [];
  const off = status?.users.filter((u) => u.devices === 0) || [];

  return (
    <div className="border-t border-[#E3E9E2] pt-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#0C3B2E] text-base">지체별 알림 켜짐 현황</h3>
            <p className="text-2xs text-[#6F8377]">
              알림은 각자 자기 휴대폰에서 켜야 갑니다. 안 켠 지체에게는 어떤 알림도 가지 않습니다.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-2xs font-bold text-[#4A6B57] hover:text-[#0C3B2E] px-2 py-1 rounded-xl hover:bg-[#F5F5F5] transition cursor-pointer shrink-0"
        >
          새로고침
        </button>
      </div>

      {loading && !status ? (
        <p className="text-2xs text-[#6F8377]">불러오는 중...</p>
      ) : status ? (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-[#0C3B2E]">
            {status.totalDevices === 0 ? (
              <span className="text-[#8F1E17]">
                아직 아무도 알림을 켜지 않았습니다. 지금은 어떤 알림도 나가지 않습니다.
              </span>
            ) : (
              <>
                {on.length}명 / {status.users.length}명 켜짐 · 기기 {status.totalDevices}대
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {on.map((u) => (
              <span
                key={u.name}
                className="text-2xs font-bold px-2 py-1 rounded-3xl bg-[#E8F0E9] text-[#0C3B2E] ring-1 ring-[#C3D6C6]"
              >
                {u.name}
                {u.devices > 1 && ` (${u.devices}대)`}
              </span>
            ))}
            {off.map((u) => (
              <span
                key={u.name}
                className="text-2xs font-medium px-2 py-1 rounded-3xl bg-[#F5F5F5] text-[#6F8377]"
              >
                {u.name} 꺼짐
              </span>
            ))}
          </div>

          {off.length > 0 && (
            <p className="text-2xs text-[#6F8377] leading-relaxed bg-[#F5F5F5] rounded-3xl p-3">
              꺼진 지체에게는 이렇게 안내해 주세요 —
              <strong className="text-[#0C3B2E]"> 알림 설정 → 새 글 알림 → 휴대폰 알림 켜기</strong>.
              아이폰은 사파리 공유 버튼 → 홈 화면에 추가로 <strong className="text-[#0C3B2E]">앱을 설치한 뒤</strong> 켜야 합니다.
            </p>
          )}
        </div>
      ) : (
        <p className="text-2xs text-[#6F8377]">현황을 불러오지 못했습니다.</p>
      )}
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
      const res = await authFetch("/api/auth/users/update", {
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
      const res = await authFetch("/api/auth/users/admin-update-pin", {
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
    <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-[#E3E9E2] pb-3">
        <div className="p-1.5 sm:p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl shrink-0">
          <Bell size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#0C3B2E] text-base sm:text-lg whitespace-nowrap">아침 묵상 알림 및 설정</h3>
          <p className="text-2xs sm:text-xs text-[#6F8377]">매일 아침 약속된 시간에 묵상을 독려하는 알림 및 개인 설정을 관리합니다</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Enabled Status Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#F5F5F5] rounded-3xl">
          <div className="flex items-center gap-2.5">
            {enabled ? (
              <div className="p-1.5 bg-[#F5F5F5] text-[#0C3B2E] rounded-xl">
                <Bell size={18} />
              </div>
            ) : (
              <div className="p-1.5 bg-[#F8E3E3] text-[#8F1E17] rounded-xl">
                <BellOff size={18} />
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-[#14261E] block">알림 기능 활성화</span>
              <p className="text-2xs text-[#6F8377]">설정한 시간에 알람 독려를 활성화합니다</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#D2DDD3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#AFC0B2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4A6B57]"></div>
          </label>
        </div>

        {/* Time selection */}
        <div>
          <label className="block text-xs font-semibold text-[#6F8377] mb-1.5 flex items-center gap-1">
            <Clock size={14} className="text-[#4A6B57]" />
            독려 알림 희망 시간
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-3.5 py-2.5 bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] text-sm font-semibold shadow-sm"
          />
          <p className="text-2xs text-[#6F8377] mt-1.5 leading-relaxed">
            설정한 시간이 되면 휴대폰으로 오늘의 말씀 알림이 갑니다.
            받으려면 아래 <strong className="text-[#0C3B2E]">새 글 알림</strong>을 먼저 켜주세요.
          </p>
        </div>

        {/* Days Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#6F8377] mb-2 flex items-center gap-1">
            <Calendar size={14} className="text-[#4A6B57]" />
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
                  className={`w-9 h-9 rounded-3xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? "bg-[#0C3B2E] border-[#0C3B2E] text-white"
                      : isWeekend
                      ? "bg-[#F5F5F5] border-[#E3E9E2] text-[#B3261E] hover:bg-[#D2DDD3]"
                      : "bg-[#F5F5F5] border-[#E3E9E2] text-[#4A6B57] hover:bg-[#D2DDD3]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {success && (
          <p className="text-xs text-[#4A6B57] font-semibold bg-[#F5F5F5] p-2.5 rounded-3xl flex items-center gap-1.5">
            <Check size={14} className="stroke-[3px]" />
            {success}
          </p>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#4A6B57] hover:bg-[#072A20] px-4 py-2.5 rounded-3xl shadow-md transition cursor-pointer"
          >
            {saving ? "설정 저장 중..." : "알림 설정 저장"}
          </button>
        </div>
      </form>

      {/* 진짜 푸시 알림 (앱을 닫아둬도 도착) */}
      <PushNotificationCard userId={currentUser.id} />

      {/* 누가 켰고 누가 안 켰는지 — 관리자만 */}
      {currentUser.role === "admin" && <PushStatusCard />}

      {/* Interactive push simulator */}
      <div className="border-t border-[#E3E9E2] pt-5 space-y-3">
        <h4 className="text-xs font-bold text-[#14261E] flex items-center gap-1">
          <Sparkles className="text-[#4A6B57] animate-pulse" size={14} />
          알림 기능 테스트 및 시뮬레이션
        </h4>
        <p className="text-2xs text-[#6F8377] leading-relaxed">
          웹 브라우저 및 앱 환경에서 매일 아침 성도들에게 발송될 묵상 시간 독려 알림 메시지를 즉시 미리 받아보실 수 있습니다.
        </p>

        <button
          onClick={triggerSimulatedNotification}
          className="w-full flex items-center justify-center gap-2 bg-[#F5F5F5] hover:bg-[#D2DDD3] text-[#0C3B2E] text-xs font-bold py-3 px-4 rounded-3xl transition cursor-pointer"
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
              className="bg-[#0C3B2E] text-white rounded-[32px] p-4 shadow-lg relative overflow-hidden"
            >
              <div className="flex gap-2.5 items-start">
                <div className="p-2 bg-[#4A6B57] rounded-3xl text-white">
                  <Volume2 size={16} />
                </div>
                <div className="space-y-1">
                  <span className="block text-2xs uppercase font-bold text-[#F5F5F5] tracking-widest flex items-center gap-1">
                    <Bell size={10} className="animate-bounce" />
                    BIBLE MEDITATION NOTIFICATION
                  </span>
                  <p className="text-xs leading-relaxed text-[#F5F5F5] font-medium">
                    {simulatedAlert}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedAlert(null)}
                className="absolute right-2 top-2 p-1 text-[#F5F5F5] hover:text-white rounded-lg cursor-pointer"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Font size settings for adults and seniors */}
      <FontSizeSettingCard />

      {/* Profile modification section */}
      <div className="border-t border-[#E3E9E2] pt-6 space-y-4">

        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#0C3B2E] text-base">내 프로필 및 비밀번호(PIN) 수정</h3>
            <p className="text-2xs text-[#6F8377]">로그인 이름과 4자리 비밀번호(PIN)를 변경할 수 있습니다.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-3 max-w-md text-xs">
          {profileError && (
            <div className="bg-[#FDF3F3] border-l-4 border-[#B3261E] p-2.5 text-[#8F1E17] font-semibold rounded-r-lg flex items-center">
              <ShieldAlert className="mr-1.5 flex-shrink-0" size={14} />
              <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div className="bg-[#F5F5F5] border-l-4 border-[#4A6B57] p-2.5 text-[#0C3B2E] font-semibold rounded-r-lg flex items-center">
              <Check className="mr-1.5 flex-shrink-0" size={14} />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-2xs font-bold text-[#6F8377] mb-1">내 이름 (지체 표시명)</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="예: 김성경"
              className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-3xl text-[#14261E] font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
              required
            />
            <p className="text-2xs text-[#6F8377] mt-0.5">괄호 부분 등 원하는 직분이나 꼬리말도 수정할 수 있습니다 (예: 관리자(목사님) ➡️ 김목사)</p>
          </div>

          <div>
            <label className="block text-2xs font-bold text-[#6F8377] mb-1">비밀번호 4자리 (PIN)</label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={profilePin}
              onChange={(e) => setProfilePin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="변경할 4자리 숫자 비밀번호"
              className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-3xl text-[#14261E] font-bold tracking-widest text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#0C3B2E] hover:bg-[#072A20] px-4 py-2 rounded-3xl shadow-sm transition cursor-pointer"
          >
            {profileSaving ? "정보 변경 중..." : "내 정보 및 PIN 비밀번호 변경하기"}
          </button>
        </form>
      </div>

      {/* Account Deletion and Member List Management section */}
      <div className="border-t border-[#E3E9E2] pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#FDF3F3] text-[#8F1E17] rounded-3xl">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#0C3B2E] text-base">
              {currentUser.role === "admin" ? "지체 계정 관리 (가입 목록 및 삭제)" : "계정 탈퇴 및 이름 삭제"}
            </h3>
            <p className="text-2xs text-[#6F8377]">
              {currentUser.role === "admin"
                ? "등록된 모든 말씀 나눔방 지체들의 가입 현황 확인 및 계정 정리"
                : "나눔방에서 더이상 내 이름을 사용하지 않을 때 계정을 영구 탈퇴 처리합니다."}
            </p>
          </div>
        </div>

        {currentUser.role === "admin" ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loadingUsers ? (
              <p className="text-2xs text-[#6F8377]">계정 목록을 불러오는 중...</p>
            ) : allUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {allUsers.map((u) => (
                  <div key={u.id} className="flex justify-between items-center p-2.5 bg-[#F5F5F5] rounded-3xl">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#0C3B2E] text-white text-2xs rounded-full flex items-center justify-center font-bold">
                        {u.name.slice(-2)}
                      </div>
                      <span className="font-bold text-[#14261E]">
                        {u.name} {u.role === "admin" ? <span className="text-2xs text-[#0C3B2E] bg-[#F5F5F5] px-1 py-0.5 rounded font-black">관리자</span> : <span className="text-2xs text-[#6F8377] bg-[#F5F5F5] px-1 py-0.5 rounded">지체</span>}
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
                            className="w-14 px-1 py-0.5 rounded text-center text-2xs font-bold tracking-widest text-[#14261E] bg-white"
                          />
                          <button
                            onClick={() => handleAdminChangeUserPin(u.id)}
                            className="bg-[#0C3B2E] hover:bg-[#072A20] text-white px-1.5 py-0.5 rounded text-2xs font-semibold transition cursor-pointer"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingPinUserId(null);
                              setAdminNewPin("");
                            }}
                            className="bg-[#D2DDD3] hover:bg-[#AFC0B2] text-[#4A6B57] px-1.5 py-0.5 rounded text-2xs font-semibold transition cursor-pointer"
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
                            className="text-2xs font-bold text-[#4A6B57] hover:text-[#0C3B2E] flex items-center gap-0.5 hover:bg-[#F5F5F5] px-1.5 py-1 rounded-xl transition cursor-pointer"
                            title="비밀번호 변경"
                          >
                            <Lock size={11} />
                            비번
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-2xs font-bold text-[#B3261E] hover:text-[#7A1913] flex items-center gap-0.5 hover:bg-[#FDF3F3] px-1.5 py-1 rounded-xl transition cursor-pointer"
                            title="계정 삭제"
                          >
                            <Trash2 size={11} />
                            삭제
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-2xs text-[#6F8377] font-bold italic px-2">나</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xs text-[#6F8377]">가입된 지체가 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="max-w-md bg-[#FDF3F3] rounded-3xl p-4 text-xs text-[#7A1913] space-y-2.5">
            <p className="font-bold">⚠️ 주의사항:</p>
            <p className="leading-relaxed">
              계정을 삭제하시면 로그인 화면의 <strong>이름 목록에서 내 이름이 영구적으로 지워집니다</strong>. 이 조치는 즉시 효력을 가집니다.
            </p>
            <button
              onClick={() => handleDeleteUser(currentUser.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 hover:border-[#E4BEBE] text-[#8F1E17] hover:text-white bg-white hover:bg-[#B3261E] rounded-3xl font-bold transition shadow-sm cursor-pointer"
            >
              <Trash2 size={14} />
              내 이름 목록에서 영구 지우기 (탈퇴하기)
            </button>
          </div>
        )}
      </div>

      {/* 앱 버전 — 휴대폰에 옛 화면이 남아 있는지 확인할 때 쓴다 */}
      <p className="text-2xs text-[#A8B3A9] text-center pt-2">앱 버전 {__BUILD_TIME__}</p>
    </div>
  );
}
