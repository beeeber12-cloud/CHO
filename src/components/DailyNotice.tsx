import React, { useState, useEffect } from "react";
import { Notice, User } from "../types";
import { BookOpen, Check, Edit3, Plus, UserCheck, HelpCircle, Loader, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FormattedBibleText from "./FormattedBibleText";


interface DailyNoticeProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
  allUsers: { id: string; name: string; role: string }[];
  onVerseSelect?: (verse: string) => void;
}

export default function DailyNotice({ currentUser, allUsers, onVerseSelect }: DailyNoticeProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
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
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#ece8df] shadow-sm p-3.5 sm:p-6 overflow-hidden">
      <div className="flex justify-between items-center border-b border-[#ece8df] pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-[#e0e7df] text-[#2c3e2d] rounded-xl shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#2c3e2d] text-base sm:text-lg whitespace-nowrap">오늘의 말씀 공지</h3>
            <p className="text-[11px] sm:text-xs text-[#8a8171]">매일 아침 새 말씀이 공지됩니다</p>
          </div>
        </div>

        {currentUser.role === "admin" && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4a6d4a] bg-[#f4f2eb] border border-[#ece8df] px-3 py-1.5 rounded-lg hover:bg-[#e0dcd0] transition cursor-pointer"
          >
            {notice ? <Edit3 size={14} /> : <Plus size={14} />}
            {notice ? "말씀 수정" : "새 말씀 공지"}
          </button>
        )}
      </div>

      {/* Bible Auto Notice Planner Section for Admins */}
      {currentUser.role === "admin" && (
        <div className="mb-4 bg-[#f4f2eb]/60 border border-[#ece8df] rounded-2xl p-4">
          <button
            onClick={() => setShowPlannerConfig(!showPlannerConfig)}
            className="flex items-center justify-between w-full text-xs font-bold text-[#2c3e2d] hover:text-[#4a6d4a] transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              📖 말씀 일일 자동 공지 플래너 설정
              {plannerActive ? (
                <span className="bg-[#e0e7df] text-[#2c3e2d] text-[10px] px-2 py-0.5 rounded-full font-bold">활성화됨</span>
              ) : (
                <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">비활성화</span>
              )}
            </span>
            <span className="text-[10px] underline font-bold text-[#4a6d4a]">{showPlannerConfig ? "닫기" : "설정 열기"}</span>
          </button>

          <AnimatePresence>
            {showPlannerConfig && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveBiblePlan}
                className="mt-3.5 pt-3.5 border-t border-[#ece8df] space-y-3 text-xs"
              >
                <p className="text-[#8a8171] leading-relaxed">
                  설정한 성경책에서 매일 새로운 하루가 시작될 때 <strong>한 장씩</strong> 오늘의 말씀으로 자동 공지합니다 (Gemini AI가 말씀 본문을 조회하고 목회적인 가이드와 묵상 해설을 함께 작성해 줍니다).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8171] mb-1">성경 책 설정 (한글명)</label>
                    <input
                      type="text"
                      value={plannerBook}
                      onChange={(e) => setPlannerBook(e.target.value)}
                      placeholder="예: 요한복음, 창세기, 시편"
                      className="w-full text-xs px-3 py-2 border border-[#ece8df] rounded-lg bg-white text-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8a8171] mb-1">현재/시작 장 번호 (장)</label>
                    <input
                      type="number"
                      min={1}
                      value={plannerChapter}
                      onChange={(e) => setPlannerChapter(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-[#ece8df] rounded-lg bg-white text-slate-800 font-semibold"
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
                    className="w-4 h-4 rounded border-[#ece8df] text-[#4a6d4a] focus:ring-[#4a6d4a] cursor-pointer"
                  />
                  <label htmlFor="plannerActive" className="font-bold text-[#2c3e2d] cursor-pointer">
                    매일 자동으로 한 장씩 공지 활성화하기 (체크 시 자동 공지 시작)
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#4a6d4a] font-bold text-[10px]">{plannerMessage}</span>
                  <button
                    type="submit"
                    disabled={plannerSaving}
                    className="px-3.5 py-1.5 bg-[#4a6d4a] hover:bg-[#3d5a3d] text-white font-bold rounded-lg transition text-xs cursor-pointer"
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
            <Loader className="animate-spin text-[#4a6d4a] mb-2" size={24} />
            <p className="text-sm text-slate-500">말씀을 불러오고 있습니다...</p>
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
            {error && <div className="text-sm text-rose-500 bg-rose-50 p-2.5 rounded-lg">{error}</div>}

            <div>
              <label className="block text-xs font-semibold text-[#8a8171] mb-1">성경 구절</label>
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
                  className="flex-1 text-sm px-3 py-2 border border-[#ece8df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] text-slate-800 font-medium"
                />
                <button
                  type="button"
                  disabled={fetchingVerse || !verseTitle.trim()}
                  onClick={() => handleFetchVerse()}
                  className="px-3.5 py-2 bg-[#4a6d4a] hover:bg-[#3d5a3d] disabled:bg-[#d8d4cb] disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
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
              <p className="text-[10px] text-[#8a8171] mt-1.5 leading-relaxed">
                💡 성경 구절(예: <strong>이사야 41:10</strong>, <strong>시편 23</strong>)만 입력하고 <strong>[본문 자동 완성]</strong> 버튼을 누르거나 빈 곳을 클릭하면, 성경 본문과 가이드가 자동으로 개역개정으로 완성됩니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8a8171] mb-1">성경 말씀 본문</label>
              <textarea
                required
                rows={4}
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                placeholder="성경 본문을 기입하세요..."
                className="w-full text-sm px-3 py-2 border border-[#ece8df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] text-slate-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8a8171] mb-1">오늘의 메시지 / 묵상 방향 안내 (선택)</label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공동체에 전할 따뜻한 권면이나 해설을 적어주세요..."
                className="w-full text-sm px-3 py-2 border border-[#ece8df] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] text-slate-800 leading-relaxed"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 border border-[#ece8df] text-xs font-semibold rounded-lg text-slate-600 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-[#4a6d4a] hover:bg-[#3d5a3d] transition cursor-pointer"
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
            <div className="bg-white rounded-xl sm:rounded-3xl p-2.5 sm:p-6 md:p-8 border border-[#ece8df] shadow-sm">
              <div className="flex justify-between items-center gap-2 mb-2.5">
                <span className="text-[11px] sm:text-xs font-black text-[#8a8171] uppercase tracking-widest whitespace-nowrap shrink-0">
                  {notice.date} TODAY&apos;S BIBLE
                </span>
                {onVerseSelect && (
                  <button
                    onClick={() => onVerseSelect(notice.verseTitle)}
                    className="flex items-center gap-1 text-[11px] sm:text-xs text-[#2c3e2d] bg-[#e0e7df] hover:bg-[#d0ded0] border border-[#c4d3c2] px-2.5 py-1 rounded-xl font-bold cursor-pointer transition shadow-xs whitespace-nowrap shrink-0"
                  >
                    <BookOpen size={13} className="text-[#4a6d4a]" />
                    <span>성경 읽기방에서 보기</span>
                  </button>
                )}
              </div>

              <div className="serif-font bg-[#fdfbf7] p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-[#ece8df]">
                <div className="max-h-72 md:max-h-96 overflow-y-auto pr-1 border-b border-[#ece8df]/60 pb-3 mb-3 select-text scrollbar-thin scrollbar-thumb-slate-200">
                  <FormattedBibleText
                    text={notice.verseText}
                  />
                </div>
                <p className="text-right text-[#6b665c] font-bold text-xs sm:text-sm md:text-base">
                  {notice.verseTitle}
                </p>
              </div>
            </div>


            {notice.content && (
              <div className="bg-[#f4f2eb] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#ece8df]">
                <span className="block text-xs font-black text-[#8a8171] uppercase tracking-[0.1em] mb-1.5 whitespace-nowrap">말씀 가이드 / 소그룹 광고</span>
                <p className="text-xs text-[#4a463f] leading-relaxed whitespace-pre-line">
                  {notice.content}
                </p>
              </div>
            )}

            {/* Read/Unread Toggle Checkbox */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#ece8df] mt-2">
              <button
                onClick={handleToggleRead}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer text-white whitespace-nowrap ${
                  hasRead
                    ? "bg-[#2c3e2d] hover:bg-[#1a281b]"
                    : "bg-[#4a6d4a] hover:bg-[#3d5a3d]"
                }`}
              >
                <Check size={18} className={hasRead ? "stroke-[3px]" : ""} />
                {hasRead ? "오늘 말씀 읽기 완료!" : "오늘 말씀 읽었습니다"}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                <UserCheck size={16} className="text-[#4a6d4a] shrink-0" />
                <span>
                  읽음 체크: <strong className="text-slate-800 font-bold">{notice.readBy.length}명</strong>
                </span>
              </div>
            </div>

            {/* List of readers */}
            {notice.readBy.length > 0 && (
              <div className="bg-[#f4f2eb]/60 rounded-2xl p-3 sm:p-4 border border-[#ece8df] text-xs">
                <span className="font-bold text-[#2c3e2d] block mb-1 whitespace-nowrap">
                  체크인 한 동역자들 ({notice.readBy.length}명 / {allUsers.length}명 읽음)
                </span>
                <p className="text-[#6b665c] leading-relaxed font-medium">
                  {readersNames}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-10 bg-[#f4f2eb] rounded-2xl border border-dashed border-[#ece8df]">
            <HelpCircle className="mx-auto text-[#8a8171] mb-2" size={28} />
            <p className="text-sm text-[#4a463f]">등록된 오늘의 말씀 공지가 없습니다.</p>
            {currentUser.role === "admin" && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 text-xs font-bold text-[#4a6d4a] bg-white px-3 py-1.5 rounded-lg border border-[#ece8df] hover:bg-[#f4f2eb] cursor-pointer"
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
