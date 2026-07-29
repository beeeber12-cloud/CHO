import React, { useState, useEffect, useRef } from "react";
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

  // Search & Result states — 검색창은 사용자가 직접 입력할 때만 채워진다(평소엔 안내 문구 노출)
  const [query, setQuery] = useState<string>(initialQuery || "");
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

  // 원터치 성경 네비게이터 (구약/신약 탭 → 팝업에서 권 → 장 → 절)
  const [showNavModal, setShowNavModal] = useState<boolean>(false);
  const [navTestament, setNavTestament] = useState<'OT' | 'NT'>('OT');
  const [navStep, setNavStep] = useState<'book' | 'chapter' | 'verse'>('book');
  const [navBook, setNavBook] = useState<BibleBookInfo | null>(null);
  const [navChapter, setNavChapter] = useState<number | null>(null);
  const [navVerseCount, setNavVerseCount] = useState<number | null>(null);
  const [navVerseLoading, setNavVerseLoading] = useState<boolean>(false);

  // 본문 영역 스크롤 / 선택한 절 강조
  const readerRef = useRef<HTMLDivElement>(null);
  const verseBoxRef = useRef<HTMLDivElement>(null);
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);

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

  // 본문이 로드되면 본문 영역으로 화면을 내리고, 선택한 절이 있으면 그 절 위치까지 맞춰준다.
  useEffect(() => {
    if (!pendingScroll || loading || !result) return;

    const timer = setTimeout(() => {
      readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      if (highlightVerse != null) {
        const box = verseBoxRef.current;
        const target = box?.querySelector<HTMLElement>(`[data-verse="${highlightVerse}"]`);
        if (box && target) {
          box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top - 16;
        }
      }
      setPendingScroll(false);
    }, 120);

    return () => clearTimeout(timer);
  }, [pendingScroll, loading, result, highlightVerse]);

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
            handleSearchQuery(`${data.lastReadBook} ${data.lastReadChapter}장`);
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

  // 특정 장의 절 개수를 서버에서 조회 (verse 그리드 생성용)
  const fetchVerseCount = async (book: BibleBookInfo, chapter: number) => {
    setNavVerseLoading(true);
    setNavVerseCount(null);
    try {
      const res = await fetch(`/api/bible/search?query=${encodeURIComponent(`${book.name} ${chapter}장`)}`);
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.verseNumbers) && data.verseNumbers.length > 0) {
          setNavVerseCount(Math.max(...data.verseNumbers));
        } else if (typeof data.text === "string" && data.text.trim()) {
          // verseNumbers가 없을 때 본문에서 절 번호 추출
          const nums = data.text.split("\n")
            .map((l: string) => {
              const m = l.trim().match(/^(\d{1,3})\s/);
              return m ? parseInt(m[1], 10) : 0;
            })
            .filter((n: number) => n > 0);
          setNavVerseCount(nums.length > 0 ? Math.max(...nums) : null);
        }
      }
    } catch (err) {
      console.error("절 개수 조회 실패:", err);
    } finally {
      setNavVerseLoading(false);
    }
  };

  // 구약/신약 탭을 누르면 권·장·절 선택 팝업을 연다
  const openNavModal = (testament: 'OT' | 'NT') => {
    setNavTestament(testament);
    setNavStep('book');
    setNavBook(null);
    setNavChapter(null);
    setNavVerseCount(null);
    setShowNavModal(true);
  };

  // 네비게이터: 권 선택 → 장 선택 단계로
  const handleNavSelectBook = (book: BibleBookInfo) => {
    setNavBook(book);
    setNavChapter(null);
    setNavStep('chapter');
  };

  // 네비게이터: 장 선택 → 절 선택 단계로 (동시에 장 전체 본문을 미리 불러둠)
  const handleNavSelectChapter = (chapter: number) => {
    if (!navBook) return;
    setNavChapter(chapter);
    setNavStep('verse');
    fetchVerseCount(navBook, chapter);
    setHighlightVerse(null);
    handleSelectBookChapter(navBook, chapter);
  };

  // 네비게이터: 절 선택 → 팝업을 닫고, 장 전체 본문에서 그 절 위치로 이동
  const handleNavSelectVerse = (verse: number) => {
    if (!navBook || !navChapter) return;
    setHighlightVerse(verse);
    setShowNavModal(false);
    setPendingScroll(true);
    // 장 전체가 이미 로드된 경우 재조회 없이 스크롤만, 아니면 장 전체를 불러온다
    if (selectedBook.name !== navBook.name || selectedChapter !== navChapter) {
      handleSelectBookChapter(navBook, navChapter);
    }
  };

  const handleSelectBookChapter = (book: BibleBookInfo, chapter: number, verseNum: string = "") => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    const searchTarget = verseNum ? `${book.name} ${chapter}:${verseNum}` : `${book.name} ${chapter}장`;
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
        <div className="bg-gradient-to-br from-[#2C2F36] via-[#4B4E55] to-[#4B4E55] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white pointer-events-none">
            <BookMarked size={180} />
          </div>

          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-white/10 pb-3 sm:pb-4">
              <div>
                <h3 className="font-bold text-xl sm:text-2xl flex items-center gap-2">
                  <span>{currentUser.name}님의 개인 성경 통독방</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-2xl transition cursor-pointer border border-white/20 whitespace-nowrap shrink-0"
                >
                  <Settings size={14} />
                  <span>목표 설정</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowChecklistModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-[#2C2F36] hover:bg-[#1E2128] text-white rounded-2xl transition cursor-pointer shadow-sm whitespace-nowrap shrink-0"
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
                  <span className="font-bold text-[#D5D7DB] flex items-center gap-1.5">
                    <Target size={15} className="text-[#FFFFFF]" />
                    목표: {userProgress?.goalTitle || "1년 1독 (전체 1,189장)"}
                  </span>
                  <span className="font-black text-[#FFFFFF] text-sm">
                    {completedCount}장 / {targetCount}장 ({progressPercent}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="bg-gradient-to-r from-[#85888F] to-[#2C2F36] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, progressPercent)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-2xs text-[#D5D7DB]/80 mt-2 font-medium">
                  <span>일일 추천: 하루 {userProgress?.dailyTarget || 3}장씩</span>
                  <span>남은 분량: {Math.max(0, targetCount - completedCount)}장</span>
                </div>
              </div>

              {/* Today's Bookmark / Last Read Box */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-2xs text-[#D5D7DB]/80 font-bold block flex items-center gap-1">
                    <Bookmark size={13} className="text-[#FFFFFF]" />
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
                    setHighlightVerse(null);
                    setPendingScroll(true);
                    handleSelectBookChapter(book, userProgress?.lastReadChapter || 1);
                  }}
                  className="mt-2 w-full py-1.5 bg-white hover:bg-[#EDEEF0] text-[#2C2F36] text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>이어서 읽기</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 원터치 성경 네비게이터 (구약/신약 → 권 → 장 → 절) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E3E4E7] shadow-sm p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E3E4E7] pb-3">
          <div className="p-1.5 sm:p-2 bg-[#EDEEF0] text-[#2C2F36] rounded-2xl shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h4 className="font-bold text-[#2C2F36] text-base sm:text-lg">성경 선택</h4>
            <p className="text-xs text-[#85888F]">구약 · 신약에서 권 · 장 · 절을 눌러 바로 펼쳐 보세요.</p>
          </div>
        </div>

        {/* 구약 / 신약 탭 — 누르면 권·장·절 선택 팝업이 열린다 */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openNavModal('OT')}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-[#FF0000] hover:bg-[#D40000] text-white font-bold text-sm sm:text-base shadow-sm transition cursor-pointer"
          >
            <BookOpen size={17} />
            <span>구약 (39권)</span>
          </button>
          <button
            type="button"
            onClick={() => openNavModal('NT')}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-[#2C2F36] hover:bg-[#1E2128] text-white font-bold text-sm sm:text-base shadow-sm transition cursor-pointer"
          >
            <BookOpen size={17} />
            <span>신약 (27권)</span>
          </button>
        </div>

        {/* Custom Search Input */}
        <div className="pt-3 border-t border-[#E3E4E7] space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#85888F]">
            <Search size={13} /> 단어로 구절 찾기
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setHighlightVerse(null);
              handleSearchQuery(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="단어로 구절 찾기 (예: 사랑, 요한복음 1장, 로마서 8:28)..."
                className="w-full pl-3 pr-9 py-2.5 bg-[#F4F5F7] border border-[#E3E4E7] rounded-2xl text-xs font-semibold text-[#1A1C21] focus:outline-none focus:ring-2 focus:ring-[#4B4E55]"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 p-1 text-[#4B4E55] hover:bg-[#D5D7DB] rounded-xl cursor-pointer"
              >
                {loading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-[#2C2F36] hover:bg-[#1E2128] text-white text-xs font-bold rounded-2xl transition cursor-pointer shrink-0"
            >
              검색
            </button>
          </form>
        </div>
      </div>

      {/* 3. Main Bible Chapter Reader Display */}
      <div ref={readerRef} className="scroll-mt-4" />
      <AnimatePresence mode="wait">
        {loading && (
          <div className="bg-white rounded-3xl border border-[#E3E4E7] p-12 text-center shadow-sm">
            <Loader className="animate-spin text-[#4B4E55] mx-auto mb-3" size={32} />
            <p className="text-sm font-bold text-[#2C2F36]">성경 본문을 불러오고 있습니다...</p>
            <p className="text-xs text-[#85888F] mt-1">1절부터 그 장의 마지막 절까지 전체 구절을 준비 중입니다.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#FFF2F2] border border-[#FFD6D6] rounded-2xl sm:rounded-3xl p-6 text-center text-[#B00000] text-xs sm:text-sm font-semibold space-y-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleSearchQuery(query || `${selectedBook.name} ${selectedChapter}장`)}
              className="px-4 py-2 bg-[#2C2F36] text-white rounded-2xl text-xs font-bold hover:bg-[#4B4E55] transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
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
            <div className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 md:p-8 border border-[#E3E4E7] shadow-sm space-y-2.5 sm:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-[#E3E4E7] pb-3">
                <div className="w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-2xs sm:text-xs font-bold text-[#2C2F36] bg-[#EDEEF0] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border border-[#DCDEE1] whitespace-nowrap shrink-0">
                      <Bookmark size={12} className="text-[#4B4E55] fill-[#4B4E55] shrink-0" />
                      {userProgress?.lastReadBook && userProgress?.lastReadChapter ? (
                        `내가 직전 통독 위치: ${userProgress.lastReadBook} ${userProgress.lastReadChapter}장`
                      ) : (
                        `성경 통독 본문`
                      )}
                    </span>
                    {userProgress?.lastReadBook === selectedBook.name && userProgress?.lastReadChapter === selectedChapter && (
                      <span className="text-2xs font-bold text-[#2C2F36] bg-[#EDEEF0] border border-[#DCDEE1] px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        ✨ 이어서 보는 중
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-[#2C2F36] flex items-center gap-2">
                    <Quote size={18} className="text-[#4B4E55] shrink-0" />
                    <span>{result.reference}</span>
                  </h3>
                </div>
              </div>

              {/* 성경 번역본 선택 토글: 개역개정 / NIV / 같이보기 */}
              <div className="flex items-center gap-1 bg-[#F4F5F7] p-1 rounded-2xl border border-[#E3E4E7] w-fit">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      bibleVersion === opt.key
                        ? "bg-[#2C2F36] text-white shadow-sm"
                        : "text-[#4B4E55] hover:bg-[#D5D7DB]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Scripture Verse Text Container - Compact padding for maximum mobile reading width */}
              <div
                ref={verseBoxRef}
                className="serif-font bg-[#EFF1F3] p-3 sm:p-6 rounded-2xl sm:rounded-2xl border border-[#E3E4E7] shadow-inner max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
              >
                {(bibleVersion === "niv" || bibleVersion === "both") && !result.textNiv ? (
                  <>
                    <FormattedBibleText text={result.text} highlightVerse={highlightVerse} />
                    <p className="mt-3 text-xs text-[#1E2128] bg-[#F4F5F7] border border-[#E3E4E7] rounded-xl p-2">
                      이 본문은 NIV(영어) 데이터가 아직 없어 개역개정으로 표시됩니다.
                    </p>
                  </>
                ) : (
                  <DualBibleText
                    krvText={result.text}
                    nivText={result.textNiv}
                    mode={bibleVersion}
                    highlightVerse={highlightVerse}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#E3E4E7]">
                {/* Chapter Navigation Previous / Next */}
                <div className="flex gap-2">
                  {selectedChapter > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightVerse(null);
                        handleSelectBookChapter(selectedBook, selectedChapter - 1);
                      }}
                      className="px-3 py-1.5 bg-[#F4F5F7] hover:bg-[#D5D7DB] text-[#2C2F36] font-bold text-xs rounded-2xl transition cursor-pointer whitespace-nowrap"
                    >
                      ← 이전 장 ({selectedChapter - 1}장)
                    </button>
                  )}
                  {selectedChapter < selectedBook.chapters && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightVerse(null);
                        handleSelectBookChapter(selectedBook, selectedChapter + 1);
                      }}
                      className="px-3 py-1.5 bg-[#2C2F36] hover:bg-[#1E2128] text-white font-bold text-xs rounded-2xl transition cursor-pointer whitespace-nowrap"
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
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl font-bold text-xs transition cursor-pointer shadow-sm whitespace-nowrap shrink-0 ${
                        isCurrentChapterCompleted
                          ? "bg-[#2C2F36] text-white hover:bg-[#1E2128]"
                          : "bg-[#F4F5F7] hover:bg-[#EDEEF0] text-[#2C2F36] border border-[#DCDEE1]"
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
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#4B4E55] hover:bg-[#1E2128] px-3.5 py-1.5 rounded-2xl shadow-md transition cursor-pointer whitespace-nowrap"
                    >
                      <Send size={14} />
                      <span>이 말씀으로 내 묵상 쓰기</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Practical Meditation Guide */}
            {result.meditationGuide && (
              <div className="bg-[#EDEEF0]/60 rounded-3xl p-5 border border-[#E3E4E7]">
                <div className="flex items-center gap-1.5 text-[#2C2F36] mb-2">
                  <Sparkles size={15} className="text-[#4B4E55]" />
                  <span className="text-2xs font-black uppercase tracking-[0.1em] text-[#85888F]">오늘의 통독 실천 제안</span>
                </div>
                <p className="text-xs text-[#2C2F36] leading-relaxed font-semibold">
                  {result.meditationGuide}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 성경 선택 팝업 (권 → 장 → 절) */}
      <AnimatePresence>
        {showNavModal && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowNavModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 flex flex-col border border-[#E3E4E7] shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E4E7] pb-3">
                <h4 className="font-bold text-[#2C2F36] text-base sm:text-lg flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-2xl shrink-0 ${
                      navTestament === 'OT' ? "bg-[#FF0000] text-white" : "bg-[#2C2F36] text-white"
                    }`}
                  >
                    <BookOpen size={16} />
                  </span>
                  {navTestament === 'OT' ? '구약' : '신약'} 성경 펼치기
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNavModal(false)}
                  className="text-[#85888F] hover:text-[#4B4E55] cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 이동 경로(breadcrumb) */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2C2F36] flex-wrap py-3">
                <button
                  type="button"
                  onClick={() => { setNavStep('book'); setNavBook(null); setNavChapter(null); }}
                  className={`px-2 py-1 rounded-xl transition cursor-pointer ${navStep === 'book' ? "bg-[#EDEEF0]" : "hover:bg-[#F4F5F7]"}`}
                >
                  {navTestament === 'OT' ? '구약' : '신약'}
                </button>
                {navBook && (
                  <>
                    <ChevronRight size={14} className="text-[#C3C5CA]" />
                    <button
                      type="button"
                      onClick={() => { setNavStep('chapter'); setNavChapter(null); }}
                      className={`px-2 py-1 rounded-xl transition cursor-pointer ${navStep === 'chapter' ? "bg-[#EDEEF0]" : "hover:bg-[#F4F5F7]"}`}
                    >
                      {navBook.name}
                    </button>
                  </>
                )}
                {navBook && navChapter && (
                  <>
                    <ChevronRight size={14} className="text-[#C3C5CA]" />
                    <span className="px-2 py-1 rounded-xl bg-[#EDEEF0]">{navChapter}장</span>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                {/* STEP 1: 권(책) 선택 */}
                {navStep === 'book' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {BIBLE_BOOKS.filter(b => b.testament === navTestament).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleNavSelectBook(b)}
                        className="py-3 px-1 bg-[#EFF1F3] border border-[#E3E4E7] rounded-2xl text-[#1A1C21] font-bold text-sm hover:bg-[#EDEEF0] hover:border-[#2C2F36] transition cursor-pointer text-center"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 2: 장 선택 */}
                {navStep === 'chapter' && navBook && (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {Array.from({ length: navBook.chapters }, (_, i) => i + 1).map((ch) => {
                      const key = `${navBook.name} ${ch}장`;
                      const isDone = userProgress?.completedChapters?.includes(key);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleNavSelectChapter(ch)}
                          className={`py-2.5 rounded-2xl font-bold text-sm border transition cursor-pointer relative ${
                            isDone
                              ? "bg-[#4B4E55] text-white border-[#4B4E55]"
                              : "bg-[#EFF1F3] text-[#1A1C21] border-[#E3E4E7] hover:bg-[#EDEEF0] hover:border-[#2C2F36]"
                          }`}
                        >
                          {ch}
                          {isDone && <span className="absolute top-0.5 right-1 text-2xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* STEP 3: 절 선택 */}
                {navStep === 'verse' && navBook && navChapter && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[#85888F]">
                      절을 누르면 팝업이 닫히고 본문에서 그 절로 이동합니다.
                    </p>
                    {navVerseLoading ? (
                      <div className="py-6 text-center text-xs text-[#85888F] flex items-center justify-center gap-2">
                        <Loader className="animate-spin" size={16} /> 절 정보를 불러오는 중...
                      </div>
                    ) : navVerseCount ? (
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                        {Array.from({ length: navVerseCount }, (_, i) => i + 1).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleNavSelectVerse(v)}
                            className="py-2 rounded-xl font-bold text-xs bg-[#EFF1F3] text-[#1A1C21] border border-[#E3E4E7] hover:bg-[#2C2F36] hover:text-white hover:border-[#2C2F36] transition cursor-pointer"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-xs text-[#85888F]">절 정보를 표시할 수 없습니다.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 절을 고르지 않고 장 전체만 보고 싶을 때 */}
              {navStep === 'verse' && navBook && navChapter && (
                <div className="pt-3 border-t border-[#E3E4E7] flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightVerse(null);
                      setShowNavModal(false);
                      setPendingScroll(true);
                    }}
                    className="px-5 py-2.5 bg-[#2C2F36] text-white text-xs font-bold rounded-2xl hover:bg-[#1E2128] transition cursor-pointer"
                  >
                    {navBook.name} {navChapter}장 처음부터 읽기
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Setup Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#E3E4E7] shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E4E7] pb-3">
                <h4 className="font-bold text-[#2C2F36] text-base flex items-center gap-2">
                  <Target className="text-[#4B4E55]" size={18} />
                  내 성경 통독 목표 설정 (개인 전용)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="text-[#85888F] hover:text-[#4B4E55] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#2C2F36] mb-1">통독 목표 이름</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="예: 1년 1독, 신약 통독, 100일 성경통독"
                    className="w-full p-2.5 bg-[#EFF1F3] border border-[#E3E4E7] rounded-2xl text-[#1A1C21] font-semibold focus:ring-2 focus:ring-[#4B4E55]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2C2F36] mb-1">목표 장 수 (권장 preset)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("1년 1독 (전체 1,189장)");
                        setTargetChapters(1189);
                        setDailyTarget(3);
                      }}
                      className={`p-2 rounded-2xl text-2xs font-bold border transition cursor-pointer ${
                        targetChapters === 1189 ? "bg-[#2C2F36] text-white border-[#2C2F36]" : "bg-[#F4F5F7] text-[#4B4E55] hover:bg-[#D5D7DB]"
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
                      className={`p-2 rounded-2xl text-2xs font-bold border transition cursor-pointer ${
                        targetChapters === 260 ? "bg-[#2C2F36] text-white border-[#2C2F36]" : "bg-[#F4F5F7] text-[#4B4E55] hover:bg-[#D5D7DB]"
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
                      className={`p-2 rounded-2xl text-2xs font-bold border transition cursor-pointer ${
                        targetChapters === 929 ? "bg-[#2C2F36] text-white border-[#2C2F36]" : "bg-[#F4F5F7] text-[#4B4E55] hover:bg-[#D5D7DB]"
                      }`}
                    >
                      구약 전체 (929장)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={targetChapters}
                    onChange={(e) => setTargetChapters(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#EFF1F3] border border-[#E3E4E7] rounded-2xl text-[#1A1C21] font-semibold"
                    min={1}
                    max={1189}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2C2F36] mb-1">하루 권장 읽기 장 수</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#EFF1F3] border border-[#E3E4E7] rounded-2xl text-[#1A1C21] font-semibold"
                    min={1}
                    max={50}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E4E7]">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 border border-[#E3E4E7] text-[#4B4E55] rounded-2xl font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="px-5 py-2 bg-[#4B4E55] hover:bg-[#1E2128] text-white font-bold rounded-2xl transition cursor-pointer"
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
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] p-6 flex flex-col border border-[#E3E4E7] shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E4E7] pb-3 mb-3">
                <div>
                  <h4 className="font-bold text-[#2C2F36] text-base flex items-center gap-2">
                    <ListChecks className="text-[#4B4E55]" size={20} />
                    {currentUser?.name} 성도님의 성경 66권 통독 체크리스트
                  </h4>
                  <p className="text-2xs text-[#85888F]">
                    초록색 체크 항목은 내가 이미 완독한 장입니다. 클릭하면 완독 여부를 언제든지 변경할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="text-[#85888F] hover:text-[#4B4E55] cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filter Tabs & Search Bar for Checklist Modal */}
              <div className="space-y-2.5 pb-3 border-b border-[#E3E4E7] mb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Testament Tabs */}
                  <div className="flex bg-[#F4F5F7] p-1 rounded-2xl text-xs font-bold text-[#4B4E55] overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setChecklistTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'ALL' ? "bg-[#2C2F36] text-white" : "hover:text-[#2C2F36]"
                      }`}
                    >
                      전체 66권
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('OT')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'OT' ? "bg-[#2C2F36] text-white" : "hover:text-[#2C2F36]"
                      }`}
                    >
                      구약 (39권)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('NT')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                        checklistTab === 'NT' ? "bg-[#2C2F36] text-white" : "hover:text-[#2C2F36]"
                      }`}
                    >
                      신약 (27권)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistTab('IN_PROGRESS')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        checklistTab === 'IN_PROGRESS' ? "bg-[#2C2F36] text-white" : "hover:text-[#1E2128] text-[#2C2F36] font-black"
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
                      className="text-xs font-bold px-3 py-1.5 bg-[#EDEEF0] hover:bg-[#DCDEE1] text-[#2C2F36] border border-[#DCDEE1] rounded-2xl transition cursor-pointer flex items-center gap-1"
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
                    className="w-full pl-3 pr-8 py-2 bg-[#EFF1F3] border border-[#E3E4E7] rounded-2xl text-xs font-medium text-[#1A1C21] focus:outline-none focus:ring-2 focus:ring-[#4B4E55]"
                  />
                  {checklistSearch && (
                    <button
                      type="button"
                      onClick={() => setChecklistSearch('')}
                      className="absolute right-2.5 top-2.5 text-[#85888F] hover:text-[#4B4E55] cursor-pointer"
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
                      isLastReadBook ? "bg-[#F4F5F7] border-[#FF0000]/40 ring-2 ring-[#FF0000]/25" : "bg-[#EFF1F3] border-[#E3E4E7]"
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#2C2F36] text-sm flex items-center gap-2">
                          <span className="text-2xs bg-[#EDEEF0] text-[#2C2F36] px-2 py-0.5 rounded-full font-black">
                            {b.testament === 'OT' ? '구약' : '신약'}
                          </span>
                          {b.name} ({b.chapters}장)
                          {isLastReadBook && (
                            <span className="text-2xs font-extrabold bg-[#DCDEE1] text-[#2C2F36] px-2 py-0.5 rounded-full">
                              📍 내가 읽는 중
                            </span>
                          )}
                        </span>
                        <span className="text-2xs font-bold text-[#4B4E55]">
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
                              className={`w-8 h-8 rounded-2xl font-bold text-2xs transition cursor-pointer flex items-center justify-center relative ${
                                isDone
                                  ? "bg-[#2C2F36] text-white shadow-sm font-black"
                                  : isCurrentReadingLocation
                                  ? "bg-[#4B4E55] text-white ring-2 ring-[#4B4E55] font-extrabold"
                                  : "bg-[#F4F5F7] hover:bg-[#D5D7DB] text-[#4B4E55] border border-[#E3E4E7]"
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

              <div className="pt-3 border-t border-[#E3E4E7] flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="px-5 py-2 bg-[#2C2F36] text-white text-xs font-bold rounded-2xl hover:bg-[#1E2128] transition cursor-pointer"
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
