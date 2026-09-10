import React, { useState, useEffect, useRef } from "react";
import { Notice, User } from "../types";
import { BookOpen, Check, Edit3, Plus, UserCheck, HelpCircle, Loader, Sparkles, Send, ChevronRight, Settings, Trash2 } from "lucide-react";
import { SettingModal } from "./SettingsUI";
import ReadingJesusScheduleForm from "./ReadingJesusScheduleForm";
import {
  buildRjSchedule,
  rjDateKey,
  rjDateLabel,
  rjDayOn,
  rjFinishDate,
  rjNormalizeSettings,
  rjRangeLabel,
  RJBreak,
  RJSettings,
  RJ_DAY_LABELS,
  RJ_DAY_PRESETS,
  RJ_DEFAULT_READING_DAYS,
  RJ_TOTAL_DAYS,
  RJ_WEEKS
} from "../lib/readingJesus";
import { READING_JESUS_TITLE } from "../data/readingJesus";
import { motion, AnimatePresence } from "motion/react";
import FormattedBibleText from "./FormattedBibleText";
import DualBibleText from "./DualBibleText";
import CoachMark from "./CoachMark";
import PickedVerseBar from "./PickedVerseBar";
import { NOTICE_READ_EVENT } from "./TodayVerseCard";
import BibleVersionPicker from "./BibleVersionPicker";
import { BibleVersionKey, loadSelectedVersions, saveSelectedVersions } from "../lib/bibleVersions";
import { buildVerseReference } from "../lib/verseRef";
import { useKeepAwake } from "../lib/keepAwake";

/** "2026-09-04" → "9월 4일 금요일" (저장된 형식이 그대로 화면에 노출되지 않도록) */
const formatKoreanDate = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${Number(m[2])}월 ${Number(m[3])}일 ${weekdays[d.getDay()]}요일`;
};

interface DailyNoticeProps {
  /** 고른 구절을 묵상 쓰기로 넘긴다 */
  onSelectVerseForMeditation?: (verseTitle: string, verseText: string) => void;
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
  allUsers: { id: string; name: string; role: string }[];
  onVerseSelect?: (verse: string) => void;
}

export default function DailyNotice({ currentUser, allUsers, onVerseSelect, onSelectVerseForMeditation }: DailyNoticeProps) {
  // 말씀을 읽는 동안에는 화면이 꺼지지 않는다 (이 탭을 떠나면 바로 풀린다)
  useKeepAwake();

  const [notice, setNotice] = useState<Notice | null>(null);

  // 사용자가 눌러서 고른 구절 (번호 -> 본문)
  const [pickedVerses, setPickedVerses] = useState<Map<string, string>>(new Map());

  const togglePickedVerse = (num: string, body: string) => {
    setPickedVerses((prev) => {
      const next = new Map(prev);
      if (next.has(num)) next.delete(num);
      else next.set(num, body);
      return next;
    });

    // 눌러서 체크한 구절은 '말씀 체크리스트'에 남도록 서버에도 저장한다.
    // 공지의 구절명("요한1서 5장")에서 책 이름과 장을 뽑아낸다.
    const ref = notice?.verseTitle || "";
    // '요한1서'처럼 책 이름 안에 숫자가 있으므로 끝의 '장/편'을 기준으로 끊어야 한다.
    // (앞에서부터 첫 숫자를 집으면 '요한1서 7장'이 '요한 1장'으로 잘린다)
    const m = ref.match(/^(.+?)\s*(\d+)\s*[장편]\s*$/) || ref.match(/^(.+)\s+(\d+)\s*$/);
    // 리딩지저스 통독표는 하루에 여러 장을 올린다("마태복음 1~3장").
    // 그런 제목은 책 이름이 엉뚱하게 잘리므로 말씀 체크리스트에 남기지 않는다.
    const isRange = /[~-]/.test(ref);
    if (currentUser?.id && m && !isRange) {
      fetch("/api/saved-verses/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          book: m[1].trim(),
          chapter: Number(m[2]),
          verseNum: Number(num),
          text: body
        })
      }).catch((e) => console.error("말씀 체크 저장 실패:", e));
    }
  };

  /**
   * 고른 번역본 중 아직 안 받아온 것이 있으면 그때 한 번만 받아온다.
   * 개역개정은 공지에 이미 실려 오므로 추가 요청이 없다.
   */
  const ensureAltTexts = async (versions: BibleVersionKey[], ref?: string) => {
    const title = ref || notice?.verseTitle;
    if (!title) return;
    const need = versions.filter((k) => k !== "krv" && !altTexts[k]);
    if (need.length === 0) return;
    try {
      const res = await fetch(
        `/api/bible/search?query=${encodeURIComponent(title)}&versions=${encodeURIComponent(need.join(","))}`
      );
      if (!res.ok) return;
      const d = await res.json();
      setAltTexts((prev) => ({
        ...prev,
        ...(d.textWm ? { wm: d.textWm } : {}),
        ...(d.textNiv ? { niv: d.textNiv } : {})
      }));
    } catch (err) {
      console.error("번역본 불러오기 실패:", err);
    }
  };

  const handleNoticeVersionsChange = (next: BibleVersionKey[]) => {
    setNoticeVersions(next);
    saveSelectedVersions(next);
    ensureAltTexts(next);
  };

  /** 고른 구절을 "3 본문..." 형태로, 번호 순서대로 이어붙인다. */
  const buildPickedText = (): string =>
    [...pickedVerses.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([n, t]) => `${n} ${t}`)
      .join("\n");

  // 오늘 말씀도 번역본을 골라 볼 수 있다 (최대 두 개 대조).
  // 성경 읽기방과 같은 설정을 공유해서, 한 곳에서 고르면 양쪽 다 적용된다.
  const [noticeVersions, setNoticeVersions] = useState<BibleVersionKey[]>(() => loadSelectedVersions());
  // 개역개정 외 번역본은 필요할 때만 받아온다 (안 보는 본문을 미리 받지 않는다)
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showReaders, setShowReaders] = useState<boolean>(false);

  /**
   * 이 화면 어디를 누르든 화면을 말씀 본문에 딱 맞춰 준다 (성경통독과 같은 동작).
   *
   * 두 가지는 건드리지 않는다.
   *  ① 버튼·입력칸을 누른 경우 — 읽음 체크나 수정을 방해하지 않는다
   *  ② 팝업(.fixed) 안을 누른 경우 — 뒤쪽 화면이 움직이면 안 된다
   * 이미 맞아 있으면 움직이지 않는다 — 절을 고를 때마다 화면이 흔들리면 성가시다.
   */
  const readerRef = useRef<HTMLDivElement>(null);
  const alignReader = (e?: React.MouseEvent) => {
    const hit = e?.target as HTMLElement | undefined;
    if (hit?.closest?.("button, a, input, select, textarea, label, .fixed")) return;
    const el = readerRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= -6 && top <= 28) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Form states for Admin
  const [verseTitle, setVerseTitle] = useState<string>("");
  const [verseText, setVerseText] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchingVerse, setFetchingVerse] = useState<boolean>(false);

  const handleFetchVerse = async (queryToFetch?: string) => {
    const query = queryToFetch || verseTitle;
    if (!query || !query.trim()) return;

    setFetchingVerse(true);
    setError("");
    try {
      const res = await fetch(`/api/bible/search?query=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setVerseText(data.text);
          if (data.reference) {
            setVerseTitle(data.reference);
          }
          // 가이드 상자를 뺐으므로 해설·묵상 가이드는 채워 넣지 않는다
        } else {
          setError("해당 성경 구절을 찾을 수 없습니다. 직접 입력하시거나 정확한 명칭으로 다시 검색해 주세요.");
        }
      } else {
        setError("성경 말씀 본문을 가져오지 못했습니다.");
      }
    } catch (err) {
      console.error("Failed to fetch Bible verse:", err);
      setError("성경 본문 자동 조회 중 오류가 발생했습니다.");
    } finally {
      setFetchingVerse(false);
    }
  };

  // Bible Planner States for Admin
  const [plannerBook, setPlannerBook] = useState<string>("요한복음");
  const [plannerChapter, setPlannerChapter] = useState<number>(1);
  const [plannerActive, setPlannerActive] = useState<boolean>(false);
  const [showPlannerConfig, setShowPlannerConfig] = useState<boolean>(false);
  const [plannerSaving, setPlannerSaving] = useState<boolean>(false);
  const [plannerMessage, setPlannerMessage] = useState<string>("");

  /**
   * 오늘의 말씀을 만드는 방식.
   *  - chapter: 정한 권에서 하루 한 장씩 (예전부터 쓰던 방식)
   *  - readingJesus: 교회 리딩지저스 통독표를 따라 그날 분량 전체
   */
  const [plannerMode, setPlannerMode] = useState<"chapter" | "readingJesus">("chapter");
  /** 통독을 시작하는 날 */
  const [rjStartDate, setRjStartDate] = useState<string>("");
  /** 읽는 요일 (0=일 … 6=토) */
  const [rjReadingDays, setRjReadingDays] = useState<number[]>([...RJ_DEFAULT_READING_DAYS]);
  /** 쉬는 기간 (방학·특별주간) */
  const [rjBreaks, setRjBreaks] = useState<RJBreak[]>([]);

  /** 지금 설정대로 통독표를 달력에 얹어 본 것 */
  const rjSettings: RJSettings | null = React.useMemo(
    () => rjNormalizeSettings({ startDate: rjStartDate, readingDays: rjReadingDays, breaks: rjBreaks }),
    [rjStartDate, rjReadingDays, rjBreaks]
  );
  const rjSchedule = React.useMemo(() => buildRjSchedule(rjSettings), [rjSettings]);
  const rjTodayDay = React.useMemo(
    () => rjDayOn(rjSchedule, rjDateKey(new Date())),
    [rjSchedule]
  );
  const rjFinish = React.useMemo(() => rjFinishDate(rjSchedule), [rjSchedule]);

  const toggleRjDay = (day: number) =>
    setRjReadingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  const updateRjBreak = (i: number, patch: Partial<RJBreak>) =>
    setRjBreaks((prev) => prev.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  useEffect(() => {
    fetchTodayNotice();
    // 통독 방식은 모두가 알아야 한다 (제목에 '리딩지저스' 를 붙일지 판단한다).
    // 관리자 설정 화면도 이 값으로 채워진다.
    fetchBiblePlan();
  }, []);

  // 공지를 받아온 뒤, 개역개정 외 번역본을 고른 상태라면 그것도 채워둔다
  useEffect(() => {
    if (notice?.verseTitle) ensureAltTexts(noticeVersions, notice.verseTitle);
  }, [notice?.verseTitle]);

  // 화면에 실을 번역본 (고른 순서대로, 본문이 있는 것만)
  const noticePanes = noticeVersions
    .map((k) => ({ key: k, text: k === "krv" ? notice?.verseText || "" : altTexts[k] || "" }))
    .filter((p) => p.text.trim());

  const fetchTodayNotice = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notices/today");
      if (res.ok) {
        const data = await res.json();
        setNotice(data);
        if (data) {
          setVerseTitle(data.verseTitle);
          setVerseText(data.verseText);
          setContent(data.content);
        }
      }
    } catch (err) {
      console.error("Failed to fetch today notice:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBiblePlan = async () => {
    try {
      const res = await fetch("/api/bible-plan");
      if (res.ok) {
        const data = await res.json();
        setPlannerBook(data.book);
        setPlannerChapter(data.currentChapter);
        setPlannerActive(data.active);
        setPlannerMode(data.mode === "readingJesus" ? "readingJesus" : "chapter");
        setRjStartDate(data.rjStartDate || "");
        setRjReadingDays(
          Array.isArray(data.rjReadingDays) && data.rjReadingDays.length > 0
            ? data.rjReadingDays
            : [...RJ_DEFAULT_READING_DAYS]
        );
        setRjBreaks(Array.isArray(data.rjBreaks) ? data.rjBreaks : []);
      }
    } catch (err) {
      console.error("Failed to fetch bible plan:", err);
    }
  };

  const handleSaveBiblePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlannerSaving(true);
    setPlannerMessage("");
    try {
      const res = await fetch("/api/bible-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: plannerBook,
          currentChapter: plannerChapter,
          active: plannerActive,
          mode: plannerMode,
          rjStartDate,
          rjReadingDays,
          // 날짜를 다 채운 것만 보낸다
          rjBreaks: rjBreaks.filter((b) => b.from && b.to)
        })
      });
      if (res.ok) {
        setPlannerMessage("플래너 설정이 저장되었습니다! 📖");
        setTimeout(() => setPlannerMessage(""), 3000);
        fetchTodayNotice(); // Refresh notice if plan is toggled active
      } else {
        setPlannerMessage("설정 저장에 실패했습니다.");
      }
    } catch (err) {
      setPlannerMessage("통신 오류가 발생했습니다.");
    } finally {
      setPlannerSaving(false);
    }
  };

  const handleToggleRead = async () => {
    if (!notice) return;

    try {
      const res = await fetch(`/api/notices/${notice.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updatedNotice = await res.json();
        setNotice(updatedNotice);
        // 다른 화면 위의 '오늘 함께 읽을 말씀' 카드도 같이 사라지도록 알린다
        window.dispatchEvent(new Event(NOTICE_READ_EVENT));
      }
    } catch (err) {
      console.error("Failed to toggle read status:", err);
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verseTitle.trim() || !verseText.trim()) {
      setError("성경 말씀 구절과 본문 내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/notices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseTitle: verseTitle.trim(),
          verseText: verseText.trim(),
          content: content.trim(),
          createdBy: currentUser.name,
          noticeId: notice?.id // Pass if we are editing today's, else creates new
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNotice(data);
        setIsEditing(false);
      } else {
        const errData = await res.json();
        setError(errData.error || "공지 말씀 등록에 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 통신에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  /** 고른 구절(없으면 본문 앞부분)을 묵상 쓰기로 넘긴다 — 아래 단추와 막대가 함께 쓴다 */
  const writeWithPicked = () => {
    if (!notice || !onSelectVerseForMeditation) return;
    const picked = buildPickedText();
    // 장까지 함께 남긴다 ("마가복음 1장 3,5절")
    const ref = buildVerseReference(notice.verseTitle, pickedVerses.keys());
    // 지금 보고 있는 번역본을 그대로 넘긴다
    onSelectVerseForMeditation(ref, picked || (noticePanes[0]?.text || notice.verseText).slice(0, 200));
  };

  const hasRead = notice?.readBy.includes(currentUser.id) || false;

  // Map IDs to human names for readability
  const readersNames = notice?.readBy
    .map(id => {
      const u = allUsers.find(user => user.id === id);
      return u ? u.name : "익명";
    })
    .join(", ") || "";

  return (
    // 화면 어디를 눌러도 말씀이 화면에 맞춰진다 (버튼·팝업은 제외 — alignReader 참고)
    <div onClick={alignReader}>
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3.5">
        <div className="min-w-0">
          <h3 className="font-bold text-[#0C3B2E] text-xl sm:text-2xl">
            {/* 공동체가 리딩지저스 통독표로 도는 중이면 제목에 그렇게 적는다 */}
            {plannerActive && plannerMode === "readingJesus" ? "리딩지저스 오늘의 말씀" : "오늘의 말씀"}
          </h3>
          <p className="text-xs sm:text-sm text-[#6F8377] mt-0.5">
            {notice ? `${notice.verseTitle} · ${formatKoreanDate(notice.date)}` : "매일 아침 새 말씀이 공지됩니다"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onVerseSelect && notice && (
            <button
              onClick={() => onVerseSelect(notice.verseTitle)}
              className="flex items-center gap-1 text-xs text-[#0C3B2E] bg-[#F9F9F9] hover:bg-[#F0F0F0] px-2.5 py-1.5 rounded-3xl font-bold cursor-pointer transition whitespace-nowrap"
            >
              <BookOpen size={13} className="text-[#195C50]" />
              <span>성경통독에서 보기</span>
            </button>
          )}
          {/* 말씀 수정·자동 공지 설정은 아래 '오늘의 말씀 설정' 한 창에서 다 한다 */}
        </div>
      </div>

      {/* 오늘의 말씀 설정 — 말씀 수정과 자동 공지를 한 창에서 다 한다 */}
      {currentUser.role === "admin" && (
        <button
          type="button"
          onClick={() => setShowPlannerConfig(true)}
          className="w-full flex items-center gap-3 mb-4 p-3.5 bg-[#F9F9F9] hover:bg-[#F0F0F0] rounded-3xl transition cursor-pointer text-left"
        >
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-[#14261E] truncate">오늘의 말씀 설정</span>
              {plannerActive ? (
                <span className="shrink-0 bg-[#D2DDD3] text-[#0C3B2E] text-2xs px-2 py-0.5 rounded-full font-bold">
                  자동 공지 켜짐
                </span>
              ) : (
                <span className="shrink-0 bg-[#EDEDED] text-[#6F8377] text-2xs px-2 py-0.5 rounded-full font-bold">
                  자동 공지 꺼짐
                </span>
              )}
            </span>
            <span className="block text-2xs text-[#6F8377] mt-0.5 truncate">
              말씀 수정 · {plannerMode === "readingJesus" ? READING_JESUS_TITLE : "한 장씩 자동 공지"}
            </span>
          </span>
          <span className="w-9 h-9 rounded-full bg-white text-[#4A6B57] flex items-center justify-center shrink-0">
            <Settings size={17} />
          </span>
        </button>
      )}

      {/* 오늘의 말씀 설정 창 */}
      {currentUser.role === "admin" && (
        <SettingModal
          open={showPlannerConfig}
          onClose={() => setShowPlannerConfig(false)}
          title="오늘의 말씀 설정"
          sub="말씀을 직접 쓰거나, 매일 자동으로 올라갈 말씀을 정합니다."
        >
          <form onSubmit={handleSaveBiblePlan} className="space-y-4 text-xs">
            {/* 말씀 직접 쓰기 — 예전에 화면 위에 따로 있던 단추 */}
            <button
              type="button"
              onClick={() => {
                setShowPlannerConfig(false);
                setIsEditing(true);
              }}
              className="w-full flex items-center gap-3 p-3 bg-[#F9F9F9] hover:bg-[#F0F0F0] rounded-2xl transition cursor-pointer text-left"
            >
              <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                {notice ? <Edit3 size={17} /> : <Plus size={17} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-[#14261E] truncate">
                  {notice ? "오늘 말씀 직접 수정" : "새 말씀 직접 공지"}
                </span>
                <span className="block text-2xs text-[#6F8377] mt-px truncate">
                  {notice ? `${notice.verseTitle} · 구절과 본문을 손으로 고칩니다` : "구절을 적으면 본문을 찾아 채워 줍니다"}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#6F8377] shrink-0" />
            </button>

            <div className="pt-1 border-t border-[#EDEDED]" />

            {/* 어떤 방식으로 자동 공지할지 */}
            <div>
              <label className="block text-2xs font-bold text-[#6F8377] mb-1.5">자동 공지 방식</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "chapter" as const, label: "한 장씩 자동 공지" },
                  { key: "readingJesus" as const, label: "리딩지저스 통독표" }
                ]).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPlannerMode(m.key)}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                      plannerMode === m.key
                        ? "grad-forest text-white"
                        : "bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[#6F8377] leading-relaxed">
              {plannerMode === "readingJesus"
                ? "교회 리딩지저스 통독표를 그대로 따릅니다. 고른 날짜부터 하루하루 그날 분량 전체(예: 마태복음 1~3장)가 오늘의 말씀으로 올라갑니다. 강해 영상만 있는 주일과 특별주간처럼 읽을 분량이 없는 날은 앞 공지가 그대로 남습니다."
                : "설정한 성경책에서 매일 새로운 하루가 시작될 때 한 장씩 오늘의 말씀으로 자동 공지합니다 (Gemini AI가 목회적인 가이드와 묵상 해설을 함께 작성해 줍니다)."}
            </p>

            {/* 리딩지저스 — 시작날 · 읽는 요일 · 방학만 정하면 통독표가 날짜에 얹힌다.
                지체가 자기 일정을 정할 때(성경통독)와 같은 칸을 쓴다. */}
            {plannerMode === "readingJesus" && (
              <ReadingJesusScheduleForm
                startDate={rjStartDate}
                onStartDate={setRjStartDate}
                readingDays={rjReadingDays}
                onReadingDays={setRjReadingDays}
                breaks={rjBreaks}
                onBreaks={setRjBreaks}
                todayLabel="오늘 올라갈 말씀"
                startHint="이 날 1주차 첫 분량(창세기 1~4장)부터 공동체 전체가 함께 시작합니다."
              />
            )}

            <div className={`grid grid-cols-2 gap-3 ${plannerMode === "readingJesus" ? "hidden" : ""}`}>
              <div>
                <label className="block text-2xs font-bold text-[#6F8377] mb-1">성경 책 설정 (한글명)</label>
                <input
                  type="text"
                  value={plannerBook}
                  onChange={(e) => setPlannerBook(e.target.value)}
                  placeholder="예: 요한복음, 창세기, 시편"
                  className="w-full text-xs px-3 py-2.5 bg-[#F9F9F9] rounded-xl text-[#14261E] font-semibold"
                  required={plannerMode !== "readingJesus"}
                />
              </div>
              <div>
                <label className="block text-2xs font-bold text-[#6F8377] mb-1">현재/시작 장 번호 (장)</label>
                <input
                  type="number"
                  min={1}
                  value={plannerChapter}
                  onChange={(e) => setPlannerChapter(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2.5 bg-[#F9F9F9] rounded-xl text-[#14261E] font-semibold"
                  required={plannerMode !== "readingJesus"}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="plannerActive"
                checked={plannerActive}
                onChange={(e) => setPlannerActive(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#E3E9E2] text-[#4A6B57] focus:ring-[#4A6B57] cursor-pointer shrink-0"
              />
              <label htmlFor="plannerActive" className="font-bold text-[#0C3B2E] cursor-pointer leading-relaxed">
                {plannerMode === "readingJesus"
                  ? "매일 통독표대로 자동 공지하기"
                  : "매일 자동으로 한 장씩 공지하기"}
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EDEDED]">
              <span className="text-[#4A6B57] font-bold text-2xs">{plannerMessage}</span>
              <button
                type="submit"
                disabled={plannerSaving}
                className="grad-forest px-5 py-2.5 text-white font-bold rounded-2xl transition text-xs cursor-pointer hover:brightness-110 disabled:opacity-60"
              >
                {plannerSaving ? "저장 중..." : "설정 저장하기"}
              </button>
            </div>
          </form>
        </SettingModal>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader className="animate-spin text-[#4A6B57] mb-2" size={24} />
            <p className="text-sm text-[#6F8377]">말씀을 불러오고 있습니다...</p>
          </div>
        ) : isEditing ? (
          <motion.form
            key="edit-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handlePublishNotice}
            className="space-y-4"
          >
            {error && <div className="text-sm text-[#B3261E] bg-[#FDF3F3] p-2.5 rounded-xl">{error}</div>}

            <div>
              <label className="block text-xs font-semibold text-[#6F8377] mb-1">성경 구절</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={verseTitle}
                  onChange={(e) => setVerseTitle(e.target.value)}
                  onBlur={() => {
                    // Auto-fetch if there is a book name and chapter/verse (typically has space or numbers)
                    if (verseTitle.trim().length >= 3 && (/\d/.test(verseTitle) || verseTitle.includes(" "))) {
                      handleFetchVerse();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchVerse();
                    }
                  }}
                  placeholder="예: 이사야 41:10"
                  className="flex-1 text-sm px-3 py-2 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] font-medium"
                />
                <button
                  type="button"
                  disabled={fetchingVerse || !verseTitle.trim()}
                  onClick={() => handleFetchVerse()}
                  className="px-3.5 py-2 bg-[#4A6B57] hover:bg-[#072A20] disabled:bg-[#D2DDD3] disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {fetchingVerse ? (
                    <>
                      <Loader className="animate-spin" size={13} />
                      <span>조회 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>본문 자동 완성</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-2xs text-[#6F8377] mt-1.5 leading-relaxed">
                💡 성경 구절(예: <strong>이사야 41:10</strong>, <strong>시편 23</strong>)만 입력하고 <strong>[본문 자동 완성]</strong> 버튼을 누르거나 빈 곳을 클릭하면, 성경 본문과 가이드가 자동으로 개역개정으로 완성됩니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6F8377] mb-1">성경 말씀 본문</label>
              <textarea
                required
                rows={4}
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                placeholder="성경 본문을 기입하세요..."
                className="w-full text-sm px-3 py-2 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] leading-relaxed"
              />
            </div>

            {/* 위 상자를 뺐으므로 입력칸도 함께 뺀다 — 안 보이는 곳에 글을 쓰게 두지 않는다 */}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[#4A6B57] bg-white hover:bg-[#F5F5F5] transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold rounded-xl text-white bg-[#4A6B57] hover:bg-[#072A20] transition cursor-pointer"
              >
                {submitting ? "등록 중..." : "말씀 공지하기"}
              </button>
            </div>
          </motion.form>
        ) : notice ? (
          <motion.div
            key="notice-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* 말씀 카드 — 바깥 카드와 같은 흰색이라, 모바일에서는 좌우 여백을 없애
                본문이 화면을 최대한 넓게 쓰도록 한다 (겹쳐 있던 안쪽 여백 제거) */}
            {/* 화면을 맞출 기준점 — 여기가 화면 맨 위로 오면 말씀이 가장 넓게 보인다 */}
            <div ref={readerRef} className="scroll-mt-4" />

            <div className="scripture-font py-3.5">
              <div className="mb-2.5">
                <BibleVersionPicker selected={noticeVersions} onChange={handleNoticeVersionsChange} />
              </div>

              {/* 화면 높이에 맞춰 본문을 길게 보여준다. 예전에는 288px 로 고정이라
                  몇 줄 못 보고 계속 스크롤해야 했다. */}
              <div
                className="max-h-[60vh] md:max-h-[65vh] overflow-y-auto overflow-x-hidden pb-3 mb-3 select-text scrollbar-thin scrollbar-thumb-slate-200"
              >
                <DualBibleText
                  panes={noticePanes}
                  selectedVerses={new Set(pickedVerses.keys())}
                  onToggleVerse={togglePickedVerse}
                />
              </div>

              {/* 고른 구절이 있는 동안 화면 아래에 떠 있는 막대 */}
              {onSelectVerseForMeditation && (
                <PickedVerseBar
                  count={pickedVerses.size}
                  onClear={() => setPickedVerses(new Map())}
                  onWrite={writeWithPicked}
                />
              )}

              {/* 처음 오신 분께 한 번만 — 절을 눌러 고를 수 있다는 것 */}
              <div className="relative h-0">
                <CoachMark
                  id="notice-pick"
                  show={noticePanes.length > 0}
                  gesture="tap"
                  className="absolute bottom-3 left-0 right-0"
                  text={
                    <>
                      마음에 닿는 <b style={{ color: "#FFD470" }}>절을 누르면</b> 그 구절만 골라
                      묵상을 쓸 수 있습니다
                    </>
                  }
                />
              </div>

              {/* 마음에 닿은 구절을 고르면 그 구절만 묵상으로 가져간다 */}
              {onSelectVerseForMeditation && pickedVerses.size === 0 && (
                <div className="mt-4 pt-3 border-t border-[#E3E9E2] flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-[#6F8377] font-medium">
                    마음에 닿은 구절을 눌러보세요
                  </span>
                  <button
                    type="button"
                    onClick={writeWithPicked}
                    className="grad-forest flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-3xl transition cursor-pointer whitespace-nowrap hover:brightness-110"
                  >
                    <Send size={13} />
                    이 말씀으로 묵상 쓰기
                  </button>
                </div>
              )}
            </div>


            {/*
              '말씀 가이드 / 소그룹 광고' 상자를 뺐다 (2026-08-31).
              말씀 본문에 집중하도록 화면을 비웠다. notice.content 는 그대로 저장되므로
              다시 보이게 하려면 이 자리에 상자를 되돌리기만 하면 된다.
            */}

            {/* Read/Unread Toggle Checkbox */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#E3E9E2] mt-2">
              <button
                onClick={handleToggleRead}
                className={`grad-forest flex items-center justify-center gap-2 px-4 py-2.5 rounded-3xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-white whitespace-nowrap ${
                  hasRead ? "brightness-90" : "hover:brightness-110"
                }`}
              >
                <Check size={18} className={hasRead ? "stroke-[3px]" : ""} />
                {hasRead ? "오늘 말씀 읽기 완료!" : "오늘 말씀 읽었습니다"}
              </button>

              <button
                type="button"
                onClick={() => setShowReaders((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-[#6F8377] whitespace-nowrap cursor-pointer hover:text-[#195C50] transition"
              >
                <UserCheck size={16} className="text-[#4A6B57] shrink-0" />
                <span>
                  읽음 체크: <strong className="text-[#14261E] font-bold">{notice.readBy.length}명</strong>
                </span>
              </button>
            </div>

            {/* List of readers — 기본은 접어두고, 눌러야 이름이 보인다 */}
            {notice.readBy.length > 0 && showReaders && (
              <div className="bg-[#F9F9F9] rounded-2xl px-3 py-2 text-2xs">
                <span className="font-bold text-[#0C3B2E] block mb-0.5 whitespace-nowrap">
                  체크인 한 동역자들 ({notice.readBy.length}명 / {allUsers.length}명 읽음)
                </span>
                <p className="text-[#6F8377] leading-relaxed">
                  {readersNames}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-10 bg-[#F5F5F5] rounded-3xl">
            <HelpCircle className="mx-auto text-[#6F8377] mb-2" size={28} />
            <p className="text-sm text-[#4A6B57]">등록된 오늘의 말씀 공지가 없습니다.</p>
            {currentUser.role === "admin" && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 text-xs font-bold text-[#4A6B57] bg-white px-3 py-1.5 rounded-xl hover:bg-[#F5F5F5] cursor-pointer"
              >
                첫 말씀 등록하기
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
