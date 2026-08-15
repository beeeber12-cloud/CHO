import React, { useState, useEffect } from "react";
import { Notice, User } from "../types";
import { BookOpen, Check, Edit3, Plus, UserCheck, HelpCircle, Loader, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FormattedBibleText from "./FormattedBibleText";
import DualBibleText from "./DualBibleText";
import BibleVersionPicker from "./BibleVersionPicker";
import { BibleVersionKey, loadSelectedVersions, saveSelectedVersions } from "../lib/bibleVersions";
import { buildVerseReference } from "../lib/verseRef";


interface DailyNoticeProps {
  /** 고른 구절을 묵상 쓰기로 넘긴다 */
  onSelectVerseForMeditation?: (verseTitle: string, verseText: string) => void;
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
  allUsers: { id: string; name: string; role: string }[];
  onVerseSelect?: (verse: string) => void;
}

export default function DailyNotice({ currentUser, allUsers, onVerseSelect, onSelectVerseForMeditation }: DailyNoticeProps) {
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
    if (currentUser?.id && m) {
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
          // Only auto-fill guide content if currently empty
          if (data.explanation && !content.trim()) {
            setContent(`${data.explanation}\n\n💡 오늘의 묵상 가이드:\n${data.meditationGuide || ""}`);
          }
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

  useEffect(() => {
    fetchTodayNotice();
    if (currentUser.role === "admin") {
      fetchBiblePlan();
    }
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
          active: plannerActive
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

  const hasRead = notice?.readBy.includes(currentUser.id) || false;

  // Map IDs to human names for readability
  const readersNames = notice?.readBy
    .map(id => {
      const u = allUsers.find(user => user.id === id);
      return u ? u.name : "익명";
    })
    .join(", ") || "";

  return (
    <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm px-1.5 py-3.5 sm:p-6 overflow-hidden">
      <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#0C3B2E] text-xl sm:text-2xl whitespace-nowrap">오늘의 말씀 공지</h3>
            <p className="text-2xs sm:text-xs text-[#6F8377]">매일 아침 새 말씀이 공지됩니다</p>
          </div>
        </div>

        {currentUser.role === "admin" && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4A6B57] bg-[#F5F5F5] px-3 py-1.5 rounded-xl hover:bg-[#D2DDD3] transition cursor-pointer"
          >
            {notice ? <Edit3 size={14} /> : <Plus size={14} />}
            {notice ? "말씀 수정" : "새 말씀 공지"}
          </button>
        )}
      </div>

      {/* Bible Auto Notice Planner Section for Admins */}
      {currentUser.role === "admin" && (
        <div className="mb-4 bg-[#F5F5F5]/60 bg-[#F5F5F5] rounded-3xl p-4">
          <button
            onClick={() => setShowPlannerConfig(!showPlannerConfig)}
            className="flex items-center justify-between w-full text-xs font-bold text-[#0C3B2E] hover:text-[#4A6B57] transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              📖 말씀 일일 자동 공지 플래너 설정
              {plannerActive ? (
                <span className="bg-[#F5F5F5] text-[#0C3B2E] text-2xs px-2 py-0.5 rounded-full font-bold">활성화됨</span>
              ) : (
                <span className="bg-[#D2DDD3] text-[#6F8377] text-2xs px-2 py-0.5 rounded-full font-bold">비활성화</span>
              )}
            </span>
            <span className="text-2xs underline font-bold text-[#4A6B57]">{showPlannerConfig ? "닫기" : "설정 열기"}</span>
          </button>

          <AnimatePresence>
            {showPlannerConfig && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveBiblePlan}
                className="mt-3.5 pt-3.5 border-t border-[#E3E9E2] space-y-3 text-xs"
              >
                <p className="text-[#6F8377] leading-relaxed">
                  설정한 성경책에서 매일 새로운 하루가 시작될 때 <strong>한 장씩</strong> 오늘의 말씀으로 자동 공지합니다 (Gemini AI가 말씀 본문을 조회하고 목회적인 가이드와 묵상 해설을 함께 작성해 줍니다).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-[#6F8377] mb-1">성경 책 설정 (한글명)</label>
                    <input
                      type="text"
                      value={plannerBook}
                      onChange={(e) => setPlannerBook(e.target.value)}
                      placeholder="예: 요한복음, 창세기, 시편"
                      className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-white text-[#14261E] font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-bold text-[#6F8377] mb-1">현재/시작 장 번호 (장)</label>
                    <input
                      type="number"
                      min={1}
                      value={plannerChapter}
                      onChange={(e) => setPlannerChapter(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-white text-[#14261E] font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="plannerActive"
                    checked={plannerActive}
                    onChange={(e) => setPlannerActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E3E9E2] text-[#4A6B57] focus:ring-[#4A6B57] cursor-pointer"
                  />
                  <label htmlFor="plannerActive" className="font-bold text-[#0C3B2E] cursor-pointer">
                    매일 자동으로 한 장씩 공지 활성화하기 (체크 시 자동 공지 시작)
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#4A6B57] font-bold text-2xs">{plannerMessage}</span>
                  <button
                    type="submit"
                    disabled={plannerSaving}
                    className="px-3.5 py-1.5 bg-[#4A6B57] hover:bg-[#072A20] text-white font-bold rounded-xl transition text-xs cursor-pointer"
                  >
                    {plannerSaving ? "저장 중..." : "설정 저장하기"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
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

            <div>
              <label className="block text-xs font-semibold text-[#6F8377] mb-1">오늘의 메시지 / 묵상 방향 안내 (선택)</label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공동체에 전할 따뜻한 권면이나 해설을 적어주세요..."
                className="w-full text-sm px-3 py-2 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] leading-relaxed"
              />
            </div>

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
            <div className="scripture-font bg-white rounded-none sm:rounded-[32px] py-3.5 sm:p-6 md:p-8 shadow-none sm:shadow-sm">
              <div className="flex justify-between items-center gap-2 mb-3">
                <span className="pl-[10px] sm:pl-[16px] text-xs sm:text-sm font-black text-[#6F8377] uppercase tracking-widest whitespace-nowrap shrink-0">
                  {notice.date}
                </span>
                {onVerseSelect && (
                  <button
                    onClick={() => onVerseSelect(notice.verseTitle)}
                    className="flex items-center gap-1 text-xs sm:text-sm text-[#0C3B2E] bg-[#F5F5F5] hover:bg-[#E8E8E8] px-2.5 py-1 rounded-3xl font-bold cursor-pointer transition whitespace-nowrap shrink-0"
                  >
                    <BookOpen size={13} className="text-[#4A6B57]" />
                    <span>성경통독에서 보기</span>
                  </button>
                )}
              </div>

              {/* 번역본 고르기(왼쪽)와 구절명(오른쪽)을 한 줄에 둔다.
                  구절명이 본문 아래에 있으면 스크롤을 끝까지 내려야 어느 장인지 보였다. */}
              <div className="flex items-end justify-between gap-2 mb-2.5">
                <div className="pl-[10px] sm:pl-[16px]">
                  <BibleVersionPicker selected={noticeVersions} onChange={handleNoticeVersionsChange} />
                </div>
                <p className="text-[#4A6B57] font-bold text-xs sm:text-sm md:text-base shrink-0">
                  {notice.verseTitle}
                </p>
              </div>

              {/* 화면 높이에 맞춰 본문을 길게 보여준다. 예전에는 288px 로 고정이라
                  몇 줄 못 보고 계속 스크롤해야 했다. */}
              <div className="max-h-[60vh] md:max-h-[65vh] overflow-y-auto overflow-x-hidden -mx-1.5 px-1.5 pb-3 mb-3 select-text scrollbar-thin scrollbar-thumb-slate-200">
                <DualBibleText
                  panes={noticePanes}
                  selectedVerses={new Set(pickedVerses.keys())}
                  onToggleVerse={togglePickedVerse}
                />
              </div>

              {/* 마음에 닿은 구절을 고르면 그 구절만 묵상으로 가져간다 */}
              {onSelectVerseForMeditation && (
                <div className="mt-4 pt-3 border-t border-[#E3E9E2] flex items-center justify-between gap-2 flex-wrap">
                  <span className="pl-[10px] sm:pl-[16px] text-xs sm:text-sm text-[#6F8377] font-medium">
                    {pickedVerses.size > 0
                      ? `${pickedVerses.size}개 구절을 골랐어요`
                      : "마음에 닿은 구절을 눌러보세요"}
                  </span>
                  <div className="flex items-center gap-2">
                    {pickedVerses.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setPickedVerses(new Map())}
                        className="text-xs font-bold text-[#6F8377] hover:text-[#0C3B2E] cursor-pointer"
                      >
                        선택 해제
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const picked = buildPickedText();
                        // 장까지 함께 남긴다 ("마가복음 1장 3,5절")
                        const ref = buildVerseReference(notice.verseTitle, pickedVerses.keys());
                        // 지금 보고 있는 번역본을 그대로 넘긴다
                        onSelectVerseForMeditation(
                          ref,
                          picked || (noticePanes[0]?.text || notice.verseText).slice(0, 200)
                        );
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#4A6B57] hover:bg-[#072A20] px-3.5 py-2 rounded-3xl transition cursor-pointer whitespace-nowrap"
                    >
                      <Send size={13} />
                      {pickedVerses.size > 0
                        ? `고른 ${pickedVerses.size}구절로 묵상 쓰기`
                        : "이 말씀으로 묵상 쓰기"}
                    </button>
                  </div>
                </div>
              )}
            </div>


            {notice.content && (
              <div className="bg-[#F5F5F5] rounded-3xl sm:rounded-[32px] p-3.5 sm:p-5">
                <span className="block text-xs font-black text-[#6F8377] uppercase tracking-[0.1em] mb-1.5 whitespace-nowrap">말씀 가이드 / 소그룹 광고</span>
                <p className="text-xs text-[#4A6B57] leading-relaxed whitespace-pre-line">
                  {notice.content}
                </p>
              </div>
            )}

            {/* Read/Unread Toggle Checkbox */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#E3E9E2] mt-2">
              <button
                onClick={handleToggleRead}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-3xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer text-white whitespace-nowrap ${
                  hasRead
                    ? "bg-[#0C3B2E] hover:bg-[#051E17]"
                    : "bg-[#4A6B57] hover:bg-[#072A20]"
                }`}
              >
                <Check size={18} className={hasRead ? "stroke-[3px]" : ""} />
                {hasRead ? "오늘 말씀 읽기 완료!" : "오늘 말씀 읽었습니다"}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-[#6F8377] whitespace-nowrap">
                <UserCheck size={16} className="text-[#4A6B57] shrink-0" />
                <span>
                  읽음 체크: <strong className="text-[#14261E] font-bold">{notice.readBy.length}명</strong>
                </span>
              </div>
            </div>

            {/* List of readers */}
            {notice.readBy.length > 0 && (
              <div className="bg-[#F5F5F5]/60 rounded-3xl p-3 sm:p-4 text-xs">
                <span className="font-bold text-[#0C3B2E] block mb-1 whitespace-nowrap">
                  체크인 한 동역자들 ({notice.readBy.length}명 / {allUsers.length}명 읽음)
                </span>
                <p className="text-[#4A6B57] leading-relaxed font-medium">
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
