import React, { useState, useEffect, useRef } from "react";
import { AlarmConfig } from "../types";
import { Clock, Check, Send, Users, Smartphone, Info } from "lucide-react";
import { useFontSize, FontScale } from "../context/FontSizeContext";
import { checkPushSupport, enablePush, disablePush, isPushEnabled, sendTestPush, PushSupport } from "../lib/push";
import { authFetch } from "../lib/session";
import { SectionLabel, RowGroup, Row, Switch, SettingModal } from "./SettingsUI";

interface NotificationSettingsProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
}

/**
 * 글씨 크기 — 시안의 슬라이딩 세그먼트.
 * 누른 칸으로 흰 알약이 미끄러져 옮겨 간다. 버튼의 '가' 는 실제 크기 차이로 보여준다.
 */
function FontSizeSegment() {
  const { fontScale, setFontScale } = useFontSize();

  const scales: { key: FontScale; label: string; sample: string }[] = [
    { key: "small", label: "작게", sample: "text-2xs" },
    { key: "normal", label: "보통", sample: "text-xs" },
    { key: "large", label: "크게", sample: "text-sm" },
    { key: "xlarge", label: "아주크게", sample: "text-base" },
  ];
  const index = Math.max(0, scales.findIndex((s) => s.key === fontScale));

  return (
    <div className="relative grid grid-cols-4 bg-[#F9F9F9] rounded-2xl p-1">
      {/* 미끄러지는 흰 알약 — 한 칸 폭만큼(=자기 폭의 100%) 옮겨 간다 */}
      <div
        className="absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(25%-2px)] bg-white rounded-xl shadow-[0_2px_6px_rgba(47,115,88,0.14)] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {scales.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => setFontScale(s.key)}
          className={`relative z-10 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors cursor-pointer ${
            fontScale === s.key ? "text-[#14261E]" : "text-[#6F8377]"
          }`}
        >
          <span className={`${s.sample} font-bold leading-none`}>가</span>
          <span className="text-2xs font-bold whitespace-nowrap">{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 누가 알림을 켜 뒀는지 (관리자만).
 * "알림이 안 와요" 의 대부분은 그 지체가 아직 안 켠 경우다.
 */
function PushStatusPanel() {
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

  if (loading && !status) return <p className="text-xs text-[#6F8377] py-3">불러오는 중...</p>;
  if (!status) return <p className="text-xs text-[#6F8377] py-3">현황을 불러오지 못했습니다.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#0C3B2E]">
          {status.totalDevices === 0 ? (
            <span className="text-[#8F1E17]">아직 아무도 알림을 켜지 않았습니다.</span>
          ) : (
            <>
              {on.length}명 / {status.users.length}명 켜짐 · 기기 {status.totalDevices}대
            </>
          )}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="text-2xs font-bold text-[#4A6B57] hover:text-[#0C3B2E] px-2.5 py-1.5 rounded-xl bg-[#F9F9F9] hover:bg-[#F0F0F0] transition cursor-pointer shrink-0"
        >
          새로고침
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {on.map((u) => (
          <span
            key={u.name}
            className="text-2xs font-bold px-2.5 py-1 rounded-full bg-[#E8F0E9] text-[#0C3B2E]"
          >
            {u.name}
            {u.devices > 1 && ` (${u.devices}대)`}
          </span>
        ))}
        {off.map((u) => (
          <span
            key={u.name}
            className="text-2xs font-medium px-2.5 py-1 rounded-full bg-[#F9F9F9] text-[#6F8377]"
          >
            {u.name} 꺼짐
          </span>
        ))}
      </div>

      {off.length > 0 && (
        <p className="text-2xs text-[#6F8377] leading-relaxed bg-[#F9F9F9] rounded-2xl p-3.5">
          꺼진 지체에게는 이렇게 안내해 주세요 —
          <strong className="text-[#0C3B2E]"> 설정 → 알림 → 휴대폰 알림 켜기</strong>. 아이폰은
          사파리 공유 버튼 → 홈 화면에 추가로{" "}
          <strong className="text-[#0C3B2E]">앱을 설치한 뒤</strong> 켜야 합니다.
        </p>
      )}
    </div>
  );
}

export default function NotificationSettings({ currentUser }: NotificationSettingsProps) {
  // ── 아침 묵상 알림 ──
  const [config, setConfig] = useState<AlarmConfig | null>(null);
  const [time, setTime] = useState<string>("07:30");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");

  // ── 이 기기의 휴대폰 알림 ──
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [pushOn, setPushOn] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [pushMsg, setPushMsg] = useState<string>("");
  const [pushMsgTone, setPushMsgTone] = useState<"ok" | "warn">("ok");

  // ── 팝업 ──
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showPushHelp, setShowPushHelp] = useState<boolean>(false);

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  useEffect(() => {
    fetchAlarmConfig();
  }, [currentUser]);

  useEffect(() => {
    setSupport(checkPushSupport());
    isPushEnabled().then(setPushOn);
  }, []);

  const showPushMessage = (text: string, tone: "ok" | "warn" = "ok") => {
    setPushMsgTone(tone);
    setPushMsg(text);
  };

  const handleTogglePush = async () => {
    setPushBusy(true);
    setPushMsg("");
    try {
      if (pushOn) {
        const ok = await disablePush();
        if (ok) {
          setPushOn(false);
          showPushMessage("이 기기에서 알림을 껐습니다.");
        } else {
          showPushMessage("알림 해제에 실패했습니다.", "warn");
        }
      } else {
        const res = await enablePush(currentUser.id);
        if (res.ok) {
          setPushOn(true);
          showPushMessage("알림이 켜졌습니다. 아래 '테스트 알림 받아보기'로 확인해 보세요.");
        } else {
          showPushMessage(res.message || "알림을 켜지 못했습니다.", "warn");
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    setPushBusy(true);
    setPushMsg("");
    const res = await sendTestPush(currentUser.id);
    showPushMessage(
      res.ok ? "테스트 알림을 보냈습니다. 잠시 후 도착합니다." : res.message || "발송 실패",
      res.ok ? "ok" : "warn"
    );
    setPushBusy(false);
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

  /**
   * 시간·요일·켜짐을 바꾸면 잠시 뒤 알아서 저장한다.
   * 저장 버튼을 없앴다 — 누를 것이 하나라도 적은 편이 낫고,
   * 예전에는 바꿔놓고 저장을 안 눌러 알림이 안 오는 일이 생겼다.
   */
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (loading) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const timer = setTimeout(() => { saveAlarm(); }, 700);
    return () => clearTimeout(timer);
  }, [time, enabled, days, loading]);

  const saveAlarm = async () => {
    setSaving(true);
    setSuccess("");
    try {
      const res = await fetch("/api/alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, time, enabled, days })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSuccess("저장했습니다");
        setTimeout(() => setSuccess(""), 2500);
      }
    } catch (err) {
      console.error("Failed to save alarm:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) setDays(days.filter((d) => d !== dayIndex));
    else setDays([...days, dayIndex].sort());
  };

  /** "매일 07:30 · 월~금" 처럼 한 줄로 요약한다 */
  const alarmSummary = (() => {
    if (!enabled) return "꺼져 있습니다";
    const sorted = [...days].sort();
    let when: string;
    if (sorted.length === 7) when = "매일";
    else if (sorted.length === 0) when = "요일 없음";
    else if (sorted.join(",") === "1,2,3,4,5") when = "월~금";
    else if (sorted.join(",") === "0,6") when = "주말";
    else when = sorted.map((d) => dayLabels[d]).join("·");
    return `${time} · ${when}`;
  })();

  const pushUsable = support !== "ios-needs-install" && support !== "unsupported";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 글씨 크기 */}
      <div>
        <SectionLabel>글씨 크기</SectionLabel>
        <FontSizeSegment />
      </div>

      {/* 알림 */}
      <div>
        <SectionLabel>알림</SectionLabel>
        <RowGroup>
          {pushUsable ? (
            <Row
              icon={<Smartphone size={17} />}
              title="휴대폰 알림"
              sub={pushOn ? "이 기기에서 켜져 있습니다" : "앱을 닫아두셔도 새 소식이 도착합니다"}
              chevron={false}
              right={
                <Switch
                  checked={pushOn}
                  disabled={pushBusy}
                  onChange={handleTogglePush}
                  label="휴대폰 알림"
                />
              }
            />
          ) : (
            <Row
              icon={<Smartphone size={17} />}
              title="휴대폰 알림"
              sub={
                support === "ios-needs-install"
                  ? "아이폰은 앱으로 설치해야 받을 수 있습니다"
                  : "이 브라우저에서는 받을 수 없습니다"
              }
              onClick={() => setShowPushHelp(true)}
            />
          )}

          {pushUsable && pushOn && (
            <Row
              icon={<Send size={16} />}
              title="테스트 알림 받아보기"
              sub="지금 이 기기로 알림 하나를 보내 봅니다"
              chevron={false}
              onClick={handleTestPush}
            />
          )}

          <Row
            icon={<Clock size={17} />}
            title="아침 묵상 알림"
            sub={alarmSummary}
            onClick={() => setShowAlarmModal(true)}
          />

          {currentUser.role === "admin" && (
            <Row
              icon={<Users size={17} />}
              title="지체별 알림 켜짐 현황"
              sub="누가 알림을 켰는지 확인합니다"
              badge="관리자"
              onClick={() => setShowStatusModal(true)}
            />
          )}
        </RowGroup>

        {pushMsg && (
          <p
            className={`mt-2 text-xs leading-relaxed font-medium whitespace-pre-line rounded-2xl p-3 ${
              pushMsgTone === "ok" ? "bg-[#E8F0E9] text-[#0C3B2E]" : "bg-[#FDF3F3] text-[#7A1913]"
            }`}
          >
            {pushMsg}
          </p>
        )}
      </div>

      {/* 아침 묵상 알림 팝업 */}
      <SettingModal
        open={showAlarmModal}
        onClose={() => setShowAlarmModal(false)}
        title="아침 묵상 알림"
        sub="정한 시간에 오늘의 말씀을 알려드립니다. 바꾸시면 바로 저장됩니다."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#F9F9F9] rounded-2xl p-3.5">
            <span className="text-sm font-bold text-[#14261E]">알림 받기</span>
            <Switch checked={enabled} onChange={() => setEnabled(!enabled)} label="아침 묵상 알림" />
          </div>

          {enabled && (
            <>
              <div>
                <p className="text-2xs font-bold text-[#6F8377] mb-1.5 ml-1">시간</p>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F9F9F9] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] text-base font-bold"
                />
              </div>

              <div>
                <p className="text-2xs font-bold text-[#6F8377] mb-1.5 ml-1">요일</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {dayLabels.map((label, index) => {
                    const isSelected = days.includes(index);
                    const isWeekend = index === 0 || index === 6;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`h-10 rounded-2xl text-sm font-bold transition cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "grad-forest text-white"
                            : isWeekend
                            ? "bg-[#F9F9F9] text-[#B3261E] hover:bg-[#F0F0F0]"
                            : "bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {pushUsable && !pushOn && (
                <p className="text-2xs text-[#8F6B00] bg-[#FFF7E0] rounded-2xl px-3.5 py-2.5 leading-relaxed">
                  <strong>휴대폰 알림</strong>을 먼저 켜주셔야 이 알림이 도착합니다.
                </p>
              )}
            </>
          )}

          <p className="text-2xs text-[#4A6B57] h-4 flex items-center gap-1">
            {saving ? "저장 중..." : success ? (<><Check size={12} className="stroke-[3px]" />{success}</>) : ""}
          </p>
        </div>
      </SettingModal>

      {/* 지체별 알림 현황 팝업 */}
      <SettingModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="지체별 알림 켜짐 현황"
        sub="알림은 각자 자기 휴대폰에서 켜야 갑니다. 안 켠 지체에게는 어떤 알림도 가지 않습니다."
      >
        <PushStatusPanel />
      </SettingModal>

      {/* 알림을 못 켜는 기기 안내 */}
      <SettingModal
        open={showPushHelp}
        onClose={() => setShowPushHelp(false)}
        title="휴대폰 알림"
        sub={support === "ios-needs-install" ? "아이폰에서 알림 받는 법" : "이 브라우저 안내"}
      >
        {support === "ios-needs-install" ? (
          <div className="space-y-2.5 text-xs text-[#0C3B2E] leading-relaxed">
            <p className="font-bold flex items-center gap-1.5">
              <Info size={15} className="text-[#4A6B57]" />
              아이폰은 앱으로 설치해야 알림을 받을 수 있습니다.
            </p>
            <p className="text-[#6F8377] bg-[#F9F9F9] rounded-2xl p-3.5">
              사파리 아래쪽 <strong className="text-[#0C3B2E]">공유 버튼</strong> →{" "}
              <strong className="text-[#0C3B2E]">홈 화면에 추가</strong> 를 누른 뒤, 홈 화면에 생긴
              아이콘으로 열어 이 화면에서 다시 켜주세요. (애플 정책이라 우회할 방법이 없습니다.)
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#6F8377] bg-[#F9F9F9] rounded-2xl p-3.5 leading-relaxed">
            이 브라우저는 푸시 알림을 지원하지 않습니다. 크롬 또는 삼성 인터넷을 사용해 주세요.
          </p>
        )}
      </SettingModal>
    </div>
  );
}
