import React, { useState, useEffect } from "react";
import { Search, BookOpen, Quote, Sparkles, Send, Loader, CheckCircle2, Bookmark, Target, Award, ListChecks, ChevronRight, Settings, X, BookMarked, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FormattedBibleText from "./FormattedBibleText";
import DualBibleText from "./DualBibleText";
import { BIBLE_BOOKS, TOTAL_BIBLE_CHAPTERS, BibleBookInfo } from "../data/bibleBooks";
import { UserBibleProgress } from "../types";

interface BibleReaderProps {
  currentUser?: { id: string; name: string; role: 'admin' | 'member' };
  onSelectVerseForMeditation?: (verseTitle: string, verseText: string) => void;
  initialQuery?: string;
}

interface BibleResult {
  reference: string;
  text: string;
  textNiv?: string;
  explanation: string;
  meditationGuide: string;
}

type BibleVersion = "krv" | "niv" | "both";

export default function BibleReader({ currentUser, onSelectVerseForMeditation, initialQuery = "" }: BibleReaderProps) {
  // Navigation & Selector states
  const [selectedBook, setSelectedBook] = useState<BibleBookInfo>(BIBLE_BOOKS.find(b => b.name === "요한복음") || BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerseNum, setSelectedVerseNum] = useState<string>("");

  // Search & Result states
  const [query, setQuery] = useState<string>(initialQuery || "요한복음 1장");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("bibleVersion");
      if (saved === "krv" || saved === "niv" || saved === "both") return saved;
    }
    return "krv";
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Personal Progress states
  const [userProgress, setUserProgress] = useState<UserBibleProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);

  // Goal Form state
  const [goalTitle, setGoalTitle] = useState<string>("1년 1독 (매일 3장)");
  const [targetChapters, setTargetChapters] = useState<number>(TOTAL_BIBLE_CHAPTERS);
  const [dailyTarget, setDailyTarget] = useState<number>(3);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  // Filter Testament in dropdown
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  // Checklist Modal Filter States
  const [checklistTab, setChecklistTab] = useState<'ALL' | 'OT' | 'NT' | 'IN_PROGRESS'>('ALL');
  const [checklistSearch, setChecklistSearch] = useState<string>('');

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserProgress(currentUser.id);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    // Perform initial load if query or default is set
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearchQuery(initialQuery);
    } else if (!userProgress?.lastReadBook) {
      handleSearchQuery("요한복음 1장");
    }
  }, [initialQuery]);

  const fetchUserProgress = async (userId: string) => {
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/bible-progress/${userId}`);
      if (res.ok) {
        const data: UserBibleProgress = await res.json();
        setUserProgress(data);
        setGoalTitle(data.goalTitle);
        setTargetChapters(data.targetChapters);
        setDailyTarget(data.dailyTarget);

        if (!initialQuery && data.lastReadBook && data.lastReadChapter) {
          const matchedBook = BIBLE_BOOKS.find(b => b.name === data.lastReadBook);
          if (matchedBook) {
            setSelectedBook(matchedBook);
            setSelectedChapter(data.lastReadChapter);
            const targetQuery = `${data.lastReadBook} ${data.lastReadChapter}장`;
            setQuery(targetQuery);
            handleSearchQuery(targetQuery);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user Bible progress:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleSearchQuery = async (searchStr: string) => {
    if (!searchStr.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/bible/search?query=${encodeURIComponent(searchStr.trim())}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "성경 본문을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 연결이 원활하지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBookChapter = (book: BibleBookInfo, chapter: number, verseNum: string = "") => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    const searchTarget = verseNum ? `${book.name} ${chapter}:${verseNum}` : `${book.name} ${chapter}장`;
    setQuery(searchTarget);
    handleSearchQuery(searchTarget);

    // Save as last read location for current user
    if (currentUser?.id) {
      updateLastReadBookmark(book.name, chapter);
    }
  };

  const updateLastReadBookmark = async (bookName: string, ch: number) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          lastReadBook: bookName,
          lastReadChapter: ch
        })
      });
      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
      }
    } catch (err) {
      console.error("Failed to update last read bookmark:", err);
    }
  };

  const handleToggleChapterComplete = async (chapterKey: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          toggleChapter: chapterKey
        })
      });

      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
      }
    } catch (err) {
      console.error("Failed to toggle chapter completion:", err);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setSavingGoal(true);
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          goalTitle: goalTitle.trim(),
          targetChapters: Number(targetChapters),
          dailyTarget: Number(dailyTarget)
        })
      });

      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
        setShowGoalModal(false);
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setSavingGoal(false);
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter(b => {
    if (testamentFilter === 'OT') return b.testament === 'OT';
    if (testamentFilter === 'NT') return b.testament === 'NT';
    return true;
  });

  // Calculate current chapter key
  const currentChapterKey = `${selectedBook.name} ${selectedChapter}장`;
  const isCurrentChapterCompleted = userProgress?.completedChapters?.includes(currentChapterKey) || false;

  // Calculate Progress Stats
  const completedCount = userProgress?.completedChapters?.length || 0;
  const targetCount = userProgress?.targetChapters || TOTAL_BIBLE_CHAPTERS;
  const progressPercent = Math.min(100, Math.round((completedCount / targetCount) * 100));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Personal Bible Reading Tracker Header (Personalized per logged-in user) */}
      {currentUser && (
        <div className="bg-gradient-to-br from-[#2c3e2d] via-[#3a533c] to-[#4a6d4a] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white pointer-events-none">
            <BookMarked size={180} />
          </div>

          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-white/10 pb-3 sm:pb-4">
              <div>
                <h3 className="font-bold text-xl sm:text-3xl flex items-center gap-2">
                  <span>{currentUser.name}님의 개인 성경 통독방</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl transition cursor-pointer border border-white/20 whitespace-nowrap shrink-0"
                >
                  <Settings size={14} />
                  <span>목표 설정</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowChecklistModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl transition cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                >
                  <ListChecks size={14} />
                  <span>통독 체크리스트</span>
                </button>
              </div>
            </div>

            {/* Reading Progress Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Progress Bar Box */}
              <div className="md:col-span-2 bg-white/10 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-bold text-emerald-100 flex items-center gap-1.5">
                    <Target size={15} className="text-amber-300" />
                    목표: {userProgress?.goalTitle || "1년 1독 (전체 1,189장)"}
                  </span>
                  <span className="font-black text-amber-200 text-sm">
                    {completedCount}장 / {targetCount}장 ({progressPercent}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="bg-gradient-to-r from-amber-300 to-emerald-300 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, progressPercent)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-emerald-100/80 mt-2 font-medium">
                  <span>일일 추천: 하루 {userProgress?.dailyTarget || 3}장씩</span>
                  <span>남은 분량: {Math.max(0, targetCount - completedCount)}장</span>
                </div>
              </div>

              {/* Today's Bookmark / Last Read Box */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-emerald-200/80 font-bold block flex items-center gap-1">
                    <Bookmark size={13} className="text-amber-300" />
                    마지막 읽은 본문 북마크
                  </span>
                  <strong className="text-base font-bold text-white block mt-1">
                    {userProgress?.lastReadBook || "창세기"} {userProgress?.lastReadChapter || 1}장
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const book = BIBLE_BOOKS.find(b => b.name === (userProgress?.lastReadBook || "창세기")) || BIBLE_BOOKS[0];
                    handleSelectBookChapter(book, userProgress?.lastReadChapter || 1);
                  }}
                  className="mt-2 w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>이어서 읽기</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full Bible Book & Chapter Quick Selector (성경 66권 탐색기) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#ece8df] shadow-sm p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-[#ece8df] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-[#e0e7df] text-[#2c3e2d] rounded-xl shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <h4 className="font-bold text-[#2c3e2d] text-sm sm:text-base whitespace-nowrap">성경 66권 전체 바로 탐색 (권 · 장 · 절)</h4>
              <p className="text-[11px] text-[#8a8171]">원하시는 성경 책과 장을 선택하여 전체 본문을 통독하세요.</p>
            </div>
          </div>

          {/* Testament filter pills */}
          <div className="flex bg-[#f4f2eb] p-1 rounded-xl text-xs font-bold text-[#4a463f] self-stretch sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setTestamentFilter('ALL')}
              className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                testamentFilter === 'ALL' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
              }`}
            >
              전체 66권
            </button>
            <button
              type="button"
              onClick={() => setTestamentFilter('OT')}
              className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                testamentFilter === 'OT' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
              }`}
            >
              구약 (39권)
            </button>
            <button
              type="button"
              onClick={() => setTestamentFilter('NT')}
              className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                testamentFilter === 'NT' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
              }`}
            >
              신약 (27권)
            </button>
          </div>
        </div>

        {/* Dropdowns for Book, Chapter, Verse */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Select Book */}
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-bold text-[#8a8171] mb-1">1. 성경 선택 (권)</label>
            <select
              value={selectedBook.id}
              onChange={(e) => {
                const book = BIBLE_BOOKS.find(b => b.id === e.target.value);
                if (book) {
                  setSelectedBook(book);
                  setSelectedChapter(1);
                  setSelectedVerseNum("");
                }
              }}
              className="w-full p-2.5 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-slate-800 font-bold text-xs focus:ring-2 focus:ring-[#4a6d4a]"
            >
              {filteredBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.testament === 'OT' ? '구약' : '신약'}] {b.name} ({b.chapters}장)
                </option>
              ))}
            </select>
          </div>

          {/* Select Chapter */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-[#8a8171] mb-1">2. 장 선택 (1 ~ {selectedBook.chapters}장)</label>
            <select
              value={selectedChapter}
              onChange={(e) => {
                const ch = Number(e.target.value);
                setSelectedChapter(ch);
              }}
              className="w-full p-2.5 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-slate-800 font-bold text-xs focus:ring-2 focus:ring-[#4a6d4a]"
            >
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const key = `${selectedBook.name} ${ch}장`;
                const isDone = userProgress?.completedChapters?.includes(key);
                return (
                  <option key={ch} value={ch}>
                    {ch}장 {isDone ? "✅ (통독 완료)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Select Optional Verse / Load button */}
          <div className="sm:col-span-3 flex items-end">
            <button
              type="button"
              onClick={() => handleSelectBookChapter(selectedBook, selectedChapter, selectedVerseNum)}
              className="w-full py-2.5 bg-[#4a6d4a] hover:bg-[#3d5a3d] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <BookOpen size={16} />
              <span>본문 열기</span>
            </button>
          </div>
        </div>

        {/* Custom Search Input */}
        <div className="pt-2 border-t border-[#ece8df]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchQuery(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색어 또는 구절 직접 입력 (예: 요한복음 1장, 로마서 8:28, 시편 23)..."
                className="w-full pl-3 pr-9 py-2.5 bg-[#f4f2eb] border border-[#ece8df] rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a6d4a]"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 p-1 text-[#4a6d4a] hover:bg-[#e0dcd0] rounded-lg cursor-pointer"
              >
                {loading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-[#2c3e2d] hover:bg-[#1f2d20] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              검색
            </button>
          </form>
        </div>
      </div>

      {/* 3. Main Bible Chapter Reader Display */}
      <AnimatePresence mode="wait">
        {loading && (
          <div className="bg-white rounded-3xl border border-[#ece8df] p-12 text-center shadow-sm">
            <Loader className="animate-spin text-[#4a6d4a] mx-auto mb-3" size={32} />
            <p className="text-sm font-bold text-[#2c3e2d]">성경 본문을 불러오고 있습니다...</p>
            <p className="text-xs text-[#8a8171] mt-1">1절부터 그 장의 마지막 절까지 전체 구절을 준비 중입니다.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl sm:rounded-3xl p-6 text-center text-rose-800 text-xs sm:text-sm font-semibold space-y-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleSearchQuery(query || `${selectedBook.name} ${selectedChapter}장`)}
              className="px-4 py-2 bg-[#2c3e2d] text-white rounded-xl text-xs font-bold hover:bg-[#3a533c] transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={14} />
              <span>성경 본문 다시 불러오기</span>
            </button>
          </div>
        )}

        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Main Chapter Content Card */}
            <div className="bg-white rounded-xl sm:rounded-3xl p-2.5 sm:p-6 md:p-8 border border-[#ece8df] shadow-sm space-y-2.5 sm:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-[#ece8df] pb-3">
                <div className="w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[11px] sm:text-xs font-bold text-[#2c3e2d] bg-[#e0e7df] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border border-[#c4d3c2] whitespace-nowrap shrink-0">
                      <Bookmark size={12} className="text-amber-600 fill-amber-500 shrink-0" />
                      {userProgress?.lastReadBook && userProgress?.lastReadChapter ? (
                        `내가 직전 통독 위치: ${userProgress.lastReadBook} ${userProgress.lastReadChapter}장`
                      ) : (
                        `성경 통독 본문`
                      )}
                    </span>
                    {userProgress?.lastReadBook === selectedBook.name && userProgress?.lastReadChapter === selectedChapter && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        ✨ 이어서 보는 중
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-[#2c3e2d] flex items-center gap-2">
                    <Quote size={18} className="text-[#4a6d4a] shrink-0" />
                    <span>{result.reference}</span>
                  </h3>
                </div>
              </div>

              {/* 성경 번역본 선택 토글: 개역개정 / NIV / 같이보기 */}
              <div className="flex items-center gap-1 bg-[#f4f2eb] p-1 rounded-xl border border-[#ece8df] w-fit">
                {([
                  { key: "krv", label: "개역개정" },
                  { key: "niv", label: "NIV" },
                  { key: "both", label: "같이 보기" },
                ] as { key: BibleVersion; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setBibleVersion(opt.key);
                      if (typeof window !== "undefined") window.localStorage.setItem("bibleVersion", opt.key);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      bibleVersion === opt.key
                        ? "bg-[#2c3e2d] text-white shadow-sm"
                        : "text-[#5a6b5a] hover:bg-[#e0dcd0]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Scripture Verse Text Container - Compact padding for maximum mobile reading width */}
              <div className="serif-font bg-[#fdfbf7] p-3 sm:p-6 rounded-xl sm:rounded-2xl border border-[#ece8df] shadow-inner max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                {(bibleVersion === "niv" || bibleVersion === "both") && !result.textNiv ? (
                  <>
                    <FormattedBibleText text={result.text} />
                    <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      이 본문은 NIV(영어) 데이터가 아직 없어 개역개정으로 표시됩니다.
                    </p>
                  </>
                ) : (
                  <DualBibleText krvText={result.text} nivText={result.textNiv} mode={bibleVersion} />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#ece8df]">
                {/* Chapter Navigation Previous / Next */}
                <div className="flex gap-2">
                  {selectedChapter > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSelectBookChapter(selectedBook, selectedChapter - 1)}
                      className="px-3 py-1.5 bg-[#f4f2eb] hover:bg-[#e0dcd0] text-[#2c3e2d] font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap"
                    >
                      ← 이전 장 ({selectedChapter - 1}장)
                    </button>
                  )}
                  {selectedChapter < selectedBook.chapters && (
                    <button
                      type="button"
                      onClick={() => handleSelectBookChapter(selectedBook, selectedChapter + 1)}
                      className="px-3 py-1.5 bg-[#2c3e2d] hover:bg-[#1f2d20] text-white font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap"
                    >
                      다음 장 ({selectedChapter + 1}장) →
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Chapter Completion Checkbox Button for Logged-In User */}
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => handleToggleChapterComplete(currentChapterKey)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-sm whitespace-nowrap shrink-0 ${
                        isCurrentChapterCompleted
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      <CheckCircle2 size={16} fill={isCurrentChapterCompleted ? "currentColor" : "none"} />
                      <span>{isCurrentChapterCompleted ? "통독 완료함 ✅" : "이 장 통독 완료 체크"}</span>
                    </button>
                  )}

                  {onSelectVerseForMeditation && (
                    <button
                      type="button"
                      onClick={() => onSelectVerseForMeditation(result.reference, result.text.slice(0, 200))}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#4a6d4a] hover:bg-[#3d5a3d] px-3.5 py-1.5 rounded-xl shadow-md transition cursor-pointer whitespace-nowrap"
                    >
                      <Send size={14} />
                      <span>이 말씀으로 내 묵상 쓰기</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Commentary / Explanation Box */}
            {result.explanation && (
              <div className="bg-[#f4f2eb] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#ece8df] text-[#4a463f]">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8171] whitespace-nowrap">말씀 주석 및 묵상 가이드</span>
                </div>
                <p className="text-xs text-[#4a463f] leading-relaxed font-medium">
                  {result.explanation}
                </p>
              </div>
            )}

            {/* Practical Meditation Guide */}
            {result.meditationGuide && (
              <div className="bg-[#e0e7df]/60 rounded-3xl p-5 border border-[#ece8df]">
                <div className="flex items-center gap-1.5 text-[#2c3e2d] mb-2">
                  <Sparkles size={15} className="text-[#4a6d4a]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8a8171]">오늘의 통독 실천 제안</span>
                </div>
                <p className="text-xs text-[#2c3e2d] leading-relaxed font-semibold">
                  {result.meditationGuide}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Setup Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#ece8df] shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#ece8df] pb-3">
                <h4 className="font-bold text-[#2c3e2d] text-base flex items-center gap-2">
                  <Target className="text-[#4a6d4a]" size={18} />
                  내 성경 통독 목표 설정 (개인 전용)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#2c3e2d] mb-1">통독 목표 이름</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="예: 1년 1독, 신약 통독, 100일 성경통독"
                    className="w-full p-2.5 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-[#4a6d4a]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2c3e2d] mb-1">목표 장 수 (권장 preset)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("1년 1독 (전체 1,189장)");
                        setTargetChapters(1189);
                        setDailyTarget(3);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        targetChapters === 1189 ? "bg-[#2c3e2d] text-white border-[#2c3e2d]" : "bg-[#f4f2eb] text-[#4a463f] hover:bg-[#e0dcd0]"
                      }`}
                    >
                      성경 전체 (1,189장)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("신약 통독 (260장)");
                        setTargetChapters(260);
                        setDailyTarget(2);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        targetChapters === 260 ? "bg-[#2c3e2d] text-white border-[#2c3e2d]" : "bg-[#f4f2eb] text-[#4a463f] hover:bg-[#e0dcd0]"
                      }`}
                    >
                      신약 전체 (260장)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("구약 통독 (929장)");
                        setTargetChapters(929);
                        setDailyTarget(3);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        targetChapters === 929 ? "bg-[#2c3e2d] text-white border-[#2c3e2d]" : "bg-[#f4f2eb] text-[#4a463f] hover:bg-[#e0dcd0]"
                      }`}
                    >
                      구약 전체 (929장)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={targetChapters}
                    onChange={(e) => setTargetChapters(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-slate-800 font-semibold"
                    min={1}
                    max={1189}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2c3e2d] mb-1">하루 권장 읽기 장 수</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-slate-800 font-semibold"
                    min={1}
                    max={50}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#ece8df]">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 border border-[#ece8df] text-slate-600 rounded-xl font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="px-5 py-2 bg-[#4a6d4a] hover:bg-[#3d5a3d] text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    {savingGoal ? "저장 중..." : "목표 저장하기"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full 66-Book Checklist Modal */}
      <AnimatePresence>
        {showChecklistModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] p-6 flex flex-col border border-[#ece8df] shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#ece8df] pb-3 mb-3">
                <div>
                  <h4 className="font-bold text-[#2c3e2d] text-base flex items-center gap-2">
                    <ListChecks className="text-amber-500" size={20} />
                    {currentUser?.name} 성도님의 성경 66권 통독 체크리스트
                  </h4>
                  <p className="text-[11px] text-[#8a8171]">
                    초록색 체크 항목은 내가 이미 완독한 장입니다. 클릭하면 완독 여부를 언제든지 변경할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filter Tabs & Search Bar for Checklist Modal */}
              <div className="space-y-2.5 pb-3 border-b border-[#ece8df] mb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Testament Tabs */}
                  <div className="flex bg-[#f4f2eb] p-1 rounded-xl text-xs font-bold text-[#4a463f] overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setChecklistTab('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'ALL' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
                      }`}
                    >
                      전체 66권
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('OT')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'OT' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
                      }`}
                    >
                      구약 (39권)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('NT')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'NT' ? "bg-[#2c3e2d] text-white" : "hover:text-[#2c3e2d]"
                      }`}
                    >
                      신약 (27권)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('IN_PROGRESS')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        checklistTab === 'IN_PROGRESS' ? "bg-amber-600 text-white" : "hover:text-amber-700 text-amber-800 font-black"
                      }`}
                    >
                      🔥 통독 진행 중
                    </button>
                  </div>

                  {/* Quick Jump to Last Read Location */}
                  {userProgress?.lastReadBook && (
                    <button
                      type="button"
                      onClick={() => {
                        setChecklistTab('ALL');
                        setChecklistSearch(userProgress.lastReadBook);
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <span>📍 내가 읽던 '{userProgress.lastReadBook}' 바로찾기</span>
                    </button>
                  )}
                </div>

                {/* Quick Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={checklistSearch}
                    onChange={(e) => setChecklistSearch(e.target.value)}
                    placeholder="성경 이름으로 빠르게 검색 (예: 창세기, 마태복음, 시편, 요한)..."
                    className="w-full pl-3 pr-8 py-2 bg-[#fdfbf7] border border-[#ece8df] rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a6d4a]"
                  />
                  {checklistSearch && (
                    <button
                      type="button"
                      onClick={() => setChecklistSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Book Chapter Grid */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 text-xs">
                {BIBLE_BOOKS.filter((b) => {
                  if (checklistTab === 'OT' && b.testament !== 'OT') return false;
                  if (checklistTab === 'NT' && b.testament !== 'NT') return false;

                  const bookCompletedCount = Array.from({ length: b.chapters }, (_, i) => i + 1)
                    .filter(ch => userProgress?.completedChapters?.includes(`${b.name} ${ch}장`)).length;
                  const isLastReadBook = userProgress?.lastReadBook === b.name;

                  if (checklistTab === 'IN_PROGRESS' && bookCompletedCount === 0 && !isLastReadBook) {
                    return false;
                  }

                  if (checklistSearch.trim()) {
                    const q = checklistSearch.trim().toLowerCase();
                    return b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q);
                  }

                  return true;
                }).map((b) => {
                  const bookCompletedCount = Array.from({ length: b.chapters }, (_, i) => i + 1)
                    .filter(ch => userProgress?.completedChapters?.includes(`${b.name} ${ch}장`)).length;
                  const isLastReadBook = userProgress?.lastReadBook === b.name;

                  return (
                    <div key={b.id} className={`p-4 rounded-2xl border transition ${
                      isLastReadBook ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30" : "bg-[#fdfbf7] border-[#ece8df]"
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#2c3e2d] text-sm flex items-center gap-2">
                          <span className="text-[10px] bg-[#e0e7df] text-[#2c3e2d] px-2 py-0.5 rounded-full font-black">
                            {b.testament === 'OT' ? '구약' : '신약'}
                          </span>
                          {b.name} ({b.chapters}장)
                          {isLastReadBook && (
                            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                              📍 내가 읽는 중
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-bold text-[#4a6d4a]">
                          {bookCompletedCount} / {b.chapters}장 완료 ({Math.round((bookCompletedCount / b.chapters) * 100)}%)
                        </span>
                      </div>

                      {/* Chapter Pill Grid */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => {
                          const key = `${b.name} ${ch}장`;
                          const isDone = userProgress?.completedChapters?.includes(key);
                          const isCurrentReadingLocation = userProgress?.lastReadBook === b.name && userProgress?.lastReadChapter === ch;

                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => handleToggleChapterComplete(key)}
                              className={`w-8 h-8 rounded-xl font-bold text-[11px] transition cursor-pointer flex items-center justify-center relative ${
                                isDone
                                  ? "bg-emerald-600 text-white shadow-sm font-black"
                                  : isCurrentReadingLocation
                                  ? "bg-amber-400 text-slate-900 ring-2 ring-amber-500 font-extrabold"
                                  : "bg-[#f4f2eb] hover:bg-[#e0dcd0] text-[#4a463f] border border-[#ece8df]"
                              }`}
                              title={`${key} ${isDone ? "완독 해제" : "완독 표시"}`}
                            >
                              {ch}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#ece8df] flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="px-5 py-2 bg-[#2c3e2d] text-white text-xs font-bold rounded-xl hover:bg-[#1f2d20] transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
