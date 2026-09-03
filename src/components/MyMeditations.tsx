import React, { useState, useEffect } from "react";
import { Meditation, GratitudeNote, SharingGoal, SavedVerse } from "../types";
import { MessageSquare, Heart, Edit2, Trash2, Send, Search, BookOpen, Clock, Calendar, X, Loader, HeartHandshake, Sparkles, Settings, Check, Target, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subscribeToDataChanges } from "../lib/revision";
import { splitLeadingVerses } from "../lib/verseRef";

interface MyMeditationsProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
}

type RecordTypeFilter = 'meditation' | 'gratitude';

export default function MyMeditations({ currentUser }: MyMeditationsProps) {
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [gratitudes, setGratitudes] = useState<GratitudeNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 성경 읽다 체크해 둔 구절 (말씀 체크리스트)
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);

  const fetchSavedVerses = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/saved-verses/${currentUser.id}`);
      if (res.ok) setSavedVerses(await res.json());
    } catch (err) {
      console.error("체크한 말씀 조회 실패:", err);
    }
  };

  const openSavedVerses = async () => {
    await fetchSavedVerses();
    setShowSavedModal(true);
  };

  const removeSavedVerse = async (id: string) => {
    try {
      const res = await fetch(`/api/saved-verses/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) setSavedVerses((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("체크한 말씀 삭제 실패:", err);
    }
  };

  // 나눔 목표 (주간) — 이번 달 진행률 계산에 쓰인다
  const [goal, setGoal] = useState<SharingGoal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [goalMed, setGoalMed] = useState<number>(3);
  const [goalGrat, setGoalGrat] = useState<number>(3);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/sharing-goal/${currentUser.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((g: SharingGoal | null) => {
        if (g) {
          setGoal(g);
          setGoalMed(g.weeklyMeditations);
          setGoalGrat(g.weeklyGratitudes);
        }
      })
      .catch((e) => console.error("나눔 목표 조회 실패:", e));
  }, [currentUser?.id]);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);
    try {
      const res = await fetch("/api/sharing-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          weeklyMeditations: goalMed,
          weeklyGratitudes: goalGrat
        })
      });
      if (res.ok) {
        setGoal(await res.json());
        setShowGoalModal(false);
      }
    } catch (err) {
      console.error("나눔 목표 저장 실패:", err);
    } finally {
      setSavingGoal(false);
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<RecordTypeFilter>('meditation');

  // Edit/Write state (for editing existing meditations within this page)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVerseTitle, setEditVerseTitle] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [editPrayer, setEditPrayer] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Comments state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchMyRecords(true);
    fetchSavedVerses(); // 버튼의 개수 배지를 위해 진입 시 한 번 불러온다

    // 묵상나눔·감사칭찬에서 글이 지워지면 여기에도 바로 반영된다.
    // 바뀐 게 있을 때만 다시 받아온다.
    const unsubscribe = subscribeToDataChanges(() => fetchMyRecords(false));
    const handleFocus = () => fetchMyRecords(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchMyRecords = async (isFirst = true) => {
    if (isFirst) setLoading(true);
    try {
      const [medRes, gratRes] = await Promise.all([
        fetch("/api/meditations"),
        fetch("/api/gratitudes")
      ]);

      if (medRes.ok) {
        const data = await medRes.json();
        const myData = data.filter((m: Meditation) => m.userId === currentUser.id);
        setMeditations(myData);
      }

      if (gratRes.ok) {
        const gratData = await gratRes.json();
        const myGratData = gratData.filter((g: GratitudeNote) => g.userId === currentUser.id);
        setGratitudes(myGratData);
      }
    } catch (err) {
      console.error("Failed to load my records:", err);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  const handleEditClick = (med: Meditation) => {
    setEditingId(med.id);
    setEditVerseTitle(med.verseTitle);
    setEditTitle(med.title);
    setEditContent(med.content);
    setEditPrayer(med.prayer);
    setFormError("");
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVerseTitle.trim() || !editTitle.trim() || !editContent.trim()) {
      setFormError("말씀 구절, 제목, 내용을 모두 기입해 주세요.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/meditations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          verseTitle: editVerseTitle.trim(),
          title: editTitle.trim(),
          content: editContent.trim(),
          prayer: editPrayer.trim(),
          meditationId: editingId
        })
      });

      if (res.ok) {
        setEditingId(null);
        await fetchMyRecords();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      setFormError("통신 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeditation = async (id: string) => {
    if (!confirm("이 묵상 기록을 정말로 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/meditations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        setMeditations(meditations.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete meditation:", err);
    }
  };

  const handleDeleteGratitude = async (id: string) => {
    if (!confirm("이 감사 기록을 정말로 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/gratitudes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        setGratitudes(gratitudes.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete gratitude:", err);
    }
  };

  const handleLikeToggle = async (id: string, isGratitude = false) => {
    const endpoint = isGratitude ? `/api/gratitudes/${id}/like` : `/api/meditations/${id}/like`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updated = await res.json();
        if (isGratitude) {
          setGratitudes(gratitudes.map(g => g.id === id ? updated : g));
        } else {
          setMeditations(meditations.map(m => m.id === id ? updated : m));
        }
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleAddComment = async (id: string, isGratitude = false) => {
    const text = commentInputs[id] || "";
    if (!text.trim()) return;

    const endpoint = isGratitude ? `/api/gratitudes/${id}/comment` : `/api/meditations/${id}/comment`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          content: text.trim()
        })
      });

      if (res.ok) {
        const updated = await res.json();
        if (isGratitude) {
          setGratitudes(gratitudes.map(g => g.id === id ? updated : g));
        } else {
          setMeditations(meditations.map(m => m.id === id ? updated : m));
        }
        setCommentInputs(prev => ({ ...prev, [id]: "" }));
        setExpandedComments(prev => ({ ...prev, [id]: true }));
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleDeleteComment = async (itemId: string, commentId: string, isGratitude = false) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    const endpoint = isGratitude
      ? `/api/gratitudes/${itemId}/comment/${commentId}`
      : `/api/meditations/${itemId}/comment/${commentId}`;

    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updated = await res.json();
        if (isGratitude) {
          setGratitudes(gratitudes.map(g => g.id === itemId ? updated : g));
        } else {
          setMeditations(meditations.map(m => m.id === itemId ? updated : m));
        }
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const toggleCommentsExpanded = (id: string) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter My Meditations & Gratitudes
  const filteredMeditations = meditations.filter(med => {
    const matchesDate = selectedDateFilter === "" || med.date === selectedDateFilter;
    const matchesSearch = searchQuery === "" ||
      med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.verseTitle.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesSearch;
  });

  const filteredGratitudes = gratitudes.filter(grat => {
    const matchesDate = selectedDateFilter === "" || grat.date === selectedDateFilter;
    const matchesSearch = searchQuery === "" ||
      grat.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesSearch;
  });

  // ── 이번 달 나눔 목표 진행률 ──────────────────────────────
  // 목표는 "한 주에 몇 회"로 정하고, 화면에서는 이번 달 기준으로 환산해 보여준다.
  const WEEKS_PER_MONTH = 4;
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const inThisMonth = (d?: string) => !!d && d.startsWith(monthPrefix);
  const monthMeditations = meditations.filter((m) => inThisMonth(m.date)).length;
  const monthGratitudes = gratitudes.filter((g) => inThisMonth(g.date)).length;

  // 달이 바뀌면 진행률이 0부터 다시 시작한다. 기록이 사라진 걸로 보이지 않도록
  // 지난달 결과를 한 줄로 같이 보여준다.
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const inPrevMonth = (d?: string) => !!d && d.startsWith(prevMonthPrefix);
  const prevMonthMeditations = meditations.filter((m) => inPrevMonth(m.date)).length;
  const prevMonthGratitudes = gratitudes.filter((g) => inPrevMonth(g.date)).length;
  const hasPrevMonth = prevMonthMeditations + prevMonthGratitudes > 0;

  const medTarget = (goal?.weeklyMeditations ?? 3) * WEEKS_PER_MONTH;
  const gratTarget = (goal?.weeklyGratitudes ?? 3) * WEEKS_PER_MONTH;

  const pct = (done: number, target: number) =>
    target <= 0 ? 100 : Math.min(100, Math.round((done / target) * 100));
  const medPct = pct(monthMeditations, medTarget);
  const gratPct = pct(monthGratitudes, gratTarget);

  // Stats calculations
  const totalWritten = meditations.length;
  const totalGratitudes = gratitudes.length;

  const allMyDates: string[] = Array.from(new Set([
    ...meditations.map(m => m.date),
    ...gratitudes.map(g => g.date)
  ]));
  const distinctDays = allMyDates.length;

  // Calculate consecutive streak
  const getStreak = () => {
    if (allMyDates.length === 0) return 0;
    const sortedDates = allMyDates
      .map(d => new Date(d).getTime())
      .sort((a, b) => b - a); // latest first

    let streak = 0;
    const oneDayMs = 24 * 3600 * 1000;
    const currentCheck = Date.now();

    const getMidnight = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    const todayMidnight = getMidnight(currentCheck);
    const hasWroteToday = sortedDates.some(d => getMidnight(d) === todayMidnight);
    const hasWroteYesterday = sortedDates.some(d => getMidnight(d) === todayMidnight - oneDayMs);

    if (!hasWroteToday && !hasWroteYesterday) {
      return 0;
    }

    let expectedDate = hasWroteToday ? todayMidnight : todayMidnight - oneDayMs;

    for (let i = 0; i < sortedDates.length; i++) {
      const dateMidnight = getMidnight(sortedDates[i]);
      if (dateMidnight === expectedDate) {
        streak++;
        expectedDate -= oneDayMs;
      } else if (dateMidnight < expectedDate) {
        break; // streak broken
      }
    }
    return streak;
  };

  const activeStreak = getStreak();

  // Combine lists according to recordTypeFilter
  type CombinedItem =
    | { type: 'meditation'; data: Meditation; sortTime: number }
    | { type: 'gratitude'; data: GratitudeNote; sortTime: number };

  const combinedItems: CombinedItem[] = [];

  if (recordTypeFilter === 'meditation') {
    filteredMeditations.forEach(m => {
      combinedItems.push({
        type: 'meditation',
        data: m,
        sortTime: new Date(m.createdAt || m.date).getTime()
      });
    });
  }

  if (recordTypeFilter === 'gratitude') {
    filteredGratitudes.forEach(g => {
      combinedItems.push({
        type: 'gratitude',
        data: g,
        sortTime: new Date(g.createdAt || g.date).getTime()
      });
    });
  }

  combinedItems.sort((a, b) => b.sortTime - a.sortTime);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page title — 다른 탭과 같은 자리, 같은 형식 */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0C3B2E]">나의 기록</h2>
        <p className="text-xs sm:text-sm text-[#6F8377] mt-0.5">{currentUser.name}님의 나눔 발자취</p>
      </div>

      {/* 말씀 체크리스트 · 내 나눔 목표 — 시안의 .nav-card (플레인 행 두 개, 아이콘+글+꺾쇠) */}
      <div className="bg-[#F9F9F9] rounded-3xl sm:rounded-[32px] px-3 sm:px-4">
        <button
          type="button"
          onClick={openSavedVerses}
          className="w-full flex items-center gap-3 py-3.5 text-left cursor-pointer"
        >
          <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
            <Check size={17} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-[#0C3B2E]">말씀 체크리스트</span>
            <span className="block text-2xs text-[#6F8377] mt-0.5">읽다가 체크해 둔 구절 {savedVerses.length}개</span>
          </span>
          <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setShowGoalModal(true)}
          className="w-full flex items-center gap-3 py-3.5 text-left cursor-pointer border-t border-[#F0F0F0]"
        >
          <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
            <Target size={16} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-[#0C3B2E]">내 나눔 목표</span>
            <span className="block text-2xs text-[#6F8377] mt-0.5">
              이번 달 묵상 {monthMeditations}/{medTarget}회 · 감사 {monthGratitudes}/{gratTarget}회
              {hasPrevMonth ? ` (지난달 묵상 ${prevMonthMeditations}회·감사 ${prevMonthGratitudes}회)` : ""}
            </span>
          </span>
          <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-[#F9F9F9] rounded-[32px] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-[#6F8377]" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="내 기록 내용 및 구절 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] text-xs font-semibold"
            />
          </div>

        </div>

        {/* Record Type Category Pills — 좁은 화면에서도 세 칩이 한 줄에 들어가야 한다 */}
        <div className="flex gap-1 border-t border-[#F0F0F0] pt-3 text-xs font-bold">
          <button
            onClick={() => setRecordTypeFilter('meditation')}
            className={`flex-1 px-1.5 py-1.5 rounded-3xl transition cursor-pointer flex items-center justify-center gap-1 ${
              recordTypeFilter === 'meditation'
                ? "grad-forest text-white"
                : "bg-white text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <span className="whitespace-nowrap">말씀 묵상</span>
            <span className="text-2xs bg-white/20 px-1.5 py-0.2 rounded-full">{totalWritten}</span>
          </button>
          <button
            onClick={() => setRecordTypeFilter('gratitude')}
            className={`flex-1 px-1.5 py-1.5 rounded-3xl transition cursor-pointer flex items-center justify-center gap-1 ${
              recordTypeFilter === 'gratitude'
                ? "grad-forest text-white"
                : "bg-white text-[#6F8377] hover:text-[#072A20]"
            }`}
          >
            <span className="whitespace-nowrap">감사 칭찬</span>
            <span className="text-2xs bg-white/20 px-1.5 py-0.2 rounded-full">{totalGratitudes}</span>
          </button>
        </div>
      </div>

      {/* Editing Form Container for Meditations */}
      {editingId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border-2 border-[#4A6B57] p-5 shadow-md"
        >
          <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3 mb-4">
            <h4 className="font-bold text-[#0C3B2E] text-sm flex items-center gap-1.5">
              <Edit2 size={16} className="text-[#4A6B57]" />
              내 묵상 기록 수정하기
            </h4>
            <button
              onClick={() => setEditingId(null)}
              className="text-[#6F8377] hover:text-[#4A6B57] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
            {formError && (
              <div className="text-[#B3261E] bg-[#FDF3F3] p-2 rounded-xl font-semibold">{formError}</div>
            )}

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] mb-1">말씀 구절</label>
              <input
                type="text"
                value={editVerseTitle}
                onChange={(e) => setEditVerseTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-[#F0F0F0] text-[#14261E] font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] mb-1">묵상 제목</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-[#F0F0F0] text-[#14261E] font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] mb-1">묵상 고백 및 적용</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-[#F0F0F0] text-[#14261E] leading-relaxed font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#6F8377] mb-1">나의 동역자 중보기도 제목 (선택)</label>
              <input
                type="text"
                value={editPrayer}
                onChange={(e) => setEditPrayer(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-[#F0F0F0] text-[#14261E] font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3.5 py-1.5 text-[#4A6B57] hover:bg-[#F5F5F5] transition font-bold rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-[#4A6B57] hover:bg-[#072A20] text-white font-bold rounded-xl transition cursor-pointer"
              >
                {submitting ? "수정 중..." : "수정 완료"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Unified Records List */}
      <div>
        <p className="text-2xs font-bold text-[#6F8377] tracking-wider mb-2.5 ml-1.5">내가 쓴 글</p>
        <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="animate-spin text-[#4A6B57] mb-2" size={24} />
            <p className="text-xs text-[#6F8377]">내 영성 기록을 불러오고 있습니다...</p>
          </div>
        ) : combinedItems.length > 0 ? (
          combinedItems.map((item) => {
            if (item.type === 'meditation') {
              const med = item.data;
              const hasLiked = med.likes.includes(currentUser.id);
              const commentsOpen = expandedComments[med.id] || false;

              return (
                <motion.div
                  key={med.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#F9F9F9] rounded-[22px] p-5 space-y-2.5 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-[#D2DDD3] text-[#4A6B57] font-bold rounded-full flex items-center justify-center text-xs shrink-0">
                        {currentUser.name.slice(-1)}
                      </div>
                      <div>
                        <span className="font-bold text-[#0C3B2E] text-xs block">{currentUser.name}</span>
                        <div className="flex items-center gap-1 text-2xs text-[#6F8377] mt-0.5 font-medium">
                          <Clock size={10} />
                          <span>{med.date} {new Date(med.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(med)}
                        className="p-1.5 text-[#6F8377] hover:text-[#4A6B57] hover:bg-white rounded-xl transition cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMeditation(med.id)}
                        className="p-1.5 text-[#6F8377] hover:text-[#B3261E] hover:bg-white rounded-xl transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-[#4A6B57]">{med.verseTitle}</p>
                    <h4 className="text-sm font-bold text-[#0C3B2E]">{med.title}</h4>
                    {(() => {
                      // 앞머리의 골라 온 성경 구절만 굵게, 박스 없이 카드 배경 위에 그대로
                      const { quote, body } = splitLeadingVerses(med.content);
                      return (
                        <>
                          {quote && (
                            <p className="text-xs font-bold text-[#0C3B2E] leading-relaxed whitespace-pre-line">
                              {quote}
                            </p>
                          )}
                          {body && (
                            <p className="text-sm text-[#14261E] leading-relaxed whitespace-pre-line">
                              {body}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {med.prayer && (
                    <div className="bg-white rounded-3xl p-4 text-2xs">
                      <span className="font-bold text-[#0C3B2E] block mb-1">기도제목</span>
                      <p className="text-[#4A6B57] leading-relaxed font-medium italic">
                        "{med.prayer}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-[#EDEDED] pt-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLikeToggle(med.id, false)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          hasLiked ? "text-[#B3261E]" : "text-[#6F8377] hover:text-[#B3261E]"
                        }`}
                      >
                        <Heart size={14} className={hasLiked ? "fill-[#B3261E] text-[#B3261E]" : ""} />
                        <span>좋아요 {med.likes.length > 0 ? med.likes.length : ""}</span>
                      </button>

                      <button
                        onClick={() => toggleCommentsExpanded(med.id)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          commentsOpen ? "text-[#0C3B2E]" : "text-[#6F8377] hover:text-[#0C3B2E]"
                        }`}
                      >
                        <MessageSquare size={14} />
                        <span>댓글 {med.comments.length > 0 ? med.comments.length : ""}</span>
                      </button>
                    </div>

                    {med.likes.length > 0 && (
                      <div className="text-2xs text-[#6F8377] font-medium">
                        {med.likes.length}명의 지체가 격려 중입니다
                      </div>
                    )}
                  </div>

                  {commentsOpen && (
                    <div className="bg-white rounded-3xl p-4 space-y-3 mt-2">
                      {med.comments.length > 0 ? (
                        <div className="space-y-2">
                          {med.comments.map((comment) => {
                            const isMyComment = comment.userId === currentUser.id;
                            return (
                              <div key={comment.id} className="flex justify-between items-start gap-2 bg-[#F9F9F9] p-3 rounded-3xl">
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <strong className="font-bold text-[#0C3B2E]">{comment.userName}</strong>
                                    <span className="text-2xs text-[#6F8377]">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-[#4A6B57] leading-relaxed font-medium">
                                    {comment.content}
                                  </p>
                                </div>

                                {isMyComment && (
                                  <button
                                    onClick={() => handleDeleteComment(med.id, comment.id, false)}
                                    className="text-[#AFC0B2] hover:text-[#B3261E] p-0.5 rounded cursor-pointer"
                                    title="댓글 삭제"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-2xs text-[#6F8377] text-center py-2">
                          아직 달린 댓글이 없습니다. 지체들과 은혜로운 댓글을 나눠보세요! 💬
                        </p>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[med.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [med.id]: e.target.value }))}
                          placeholder="은혜로운 답글을 남겨보세요..."
                          className="flex-1 text-2xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4A6B57] text-[#14261E]"
                        />
                        <button
                          onClick={() => handleAddComment(med.id, false)}
                          className="grad-forest px-3 text-white rounded-xl transition flex items-center justify-center cursor-pointer hover:brightness-110"
                        >
                          <Send size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            } else {
              // Gratitude Item
              const grat = item.data;
              const hasLiked = grat.likes.includes(currentUser.id);
              const commentsOpen = expandedComments[grat.id] || false;

              return (
                <motion.div
                  key={grat.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#F9F9F9] rounded-[32px] p-5 space-y-4 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-[#D2DDD3] text-[#4A6B57] font-bold rounded-full flex items-center justify-center text-xs shrink-0">
                        <HeartHandshake size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0C3B2E] text-xs">
                            {grat.isAnonymous ? "익명 (감사 지체)" : currentUser.name}
                          </span>
                          <span className="bg-white text-[#0C3B2E] text-2xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles size={10} className="text-[#4A6B57]" /> 감사칭찬
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-2xs text-[#6F8377] mt-0.5 font-medium">
                          <Clock size={10} />
                          <span>{grat.date} {new Date(grat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGratitude(grat.id)}
                      className="p-1.5 text-[#6F8377] hover:text-[#B3261E] hover:bg-[#FDF3F3] rounded-xl transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p className="text-sm text-[#14261E] leading-relaxed whitespace-pre-line">
                    {grat.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-[#EDEDED] pt-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLikeToggle(grat.id, true)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          hasLiked ? "text-[#B3261E]" : "text-[#6F8377] hover:text-[#B3261E]"
                        }`}
                      >
                        <Heart size={14} className={hasLiked ? "fill-[#B3261E] text-[#B3261E]" : ""} />
                        <span>감사해요 {grat.likes.length > 0 ? grat.likes.length : ""}</span>
                      </button>

                      <button
                        onClick={() => toggleCommentsExpanded(grat.id)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          commentsOpen ? "text-[#0C3B2E]" : "text-[#6F8377] hover:text-[#0C3B2E]"
                        }`}
                      >
                        <MessageSquare size={14} />
                        <span>댓글 {grat.comments.length > 0 ? grat.comments.length : ""}</span>
                      </button>
                    </div>

                    {grat.likes.length > 0 && (
                      <div className="text-2xs text-[#6F8377] font-medium">
                        {grat.likes.length}명이 이 감사에 함께하고 있습니다
                      </div>
                    )}
                  </div>

                  {commentsOpen && (
                    <div className="bg-white rounded-3xl p-4 space-y-3 mt-2">
                      {grat.comments.length > 0 ? (
                        <div className="space-y-2">
                          {grat.comments.map((comment) => {
                            const isMyComment = comment.userId === currentUser.id;
                            return (
                              <div key={comment.id} className="flex justify-between items-start gap-2 bg-[#F9F9F9] p-3 rounded-3xl">
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <strong className="font-bold text-[#14261E]">{comment.userName}</strong>
                                    <span className="text-2xs text-[#6F8377]">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-[#4A6B57] leading-relaxed font-medium">
                                    {comment.content}
                                  </p>
                                </div>

                                {isMyComment && (
                                  <button
                                    onClick={() => handleDeleteComment(grat.id, comment.id, true)}
                                    className="text-[#AFC0B2] hover:text-[#B3261E] p-0.5 rounded cursor-pointer"
                                    title="댓글 삭제"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-2xs text-[#0C3B2E]/70 text-center py-2">
                          아직 달린 댓글이 없습니다. 따뜻한 감사 격려 댓글을 남겨보세요! 🙏
                        </p>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[grat.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [grat.id]: e.target.value }))}
                          placeholder="감사·칭찬에 댓글 남기기..."
                          className="flex-1 text-2xs px-3 py-2 bg-[#F5F5F5] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4A6B57] text-[#14261E]"
                        />
                        <button
                          onClick={() => handleAddComment(grat.id, true)}
                          className="grad-teal px-3 text-white rounded-xl transition flex items-center justify-center cursor-pointer hover:brightness-110"
                        >
                          <Send size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            }
          })
        ) : (
          <div className="bg-[#F9F9F9] rounded-[32px] p-12 text-center text-[#6F8377]">
            <BookOpen className="mx-auto text-[#6F8377] mb-2" size={32} />
            <p className="text-xs font-semibold text-[#4A6B57]">기록된 영성 발자취가 없습니다.</p>
            <p className="text-2xs text-[#6F8377] mt-1">
              말씀 묵상 또는 감사·칭찬을 나누어 매일의 은혜를 기록해 보세요!
            </p>
          </div>
        )}
        </div>
      </div>

      {/* 말씀 체크리스트 — 성경 읽다 눌러 체크해 둔 구절 모음 */}
      <AnimatePresence>
        {showSavedModal && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowSavedModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] max-w-lg w-full max-h-[85vh] p-5 sm:p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-start gap-2 border-b border-[#E3E9E2] pb-3 mb-3">
                <div>
                  <h4 className="font-bold text-[#0C3B2E] text-base">말씀 체크리스트</h4>
                  <p className="text-xs text-[#6F8377] font-medium mt-0.5">
                    성경을 읽다 마음에 닿아 눌러 두신 구절입니다. ({savedVerses.length}개)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="text-[#85888F] hover:text-[#4A6B57] cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                {savedVerses.length === 0 ? (
                  <div className="py-12 text-center">
                    <BookOpen className="mx-auto text-[#6F8377] mb-2" size={28} />
                    <p className="text-xs font-bold text-[#4A6B57]">아직 체크한 말씀이 없습니다.</p>
                    <p className="text-2xs text-[#6F8377] mt-1 leading-relaxed">
                      오늘말씀이나 성경통독에서 마음에 닿는 구절을 눌러보세요.
                    </p>
                  </div>
                ) : (
                  savedVerses.map((v) => (
                    <div key={v.id} className="bg-[#F5F5F5] rounded-3xl p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-[#0C3B2E] bg-[#FFF6DC] px-2 py-0.5 rounded-lg">
                          {v.book} {v.chapter}:{v.verseNum}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-2xs text-[#6F8377] font-medium">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSavedVerse(v.id)}
                            className="text-[#85888F] hover:text-[#B3261E] cursor-pointer"
                            title="체크 해제"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#333333] leading-relaxed scripture-font">
                        {v.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 나눔 목표 설정 */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3">
                <h4 className="font-bold text-[#0C3B2E] text-base">내 나눔 목표</h4>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="text-[#85888F] hover:text-[#4A6B57] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-[#6F8377] font-medium leading-relaxed">
                한 주에 몇 번 나눌지 정해 보세요. 이번 달 진행률은 <strong>주간 목표 × 4주</strong> 로 계산됩니다.
              </p>

              <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1.5">
                    묵상 나눔 · 주 {goalMed}회
                    <span className="text-[#6F8377] font-medium"> (한 달 {goalMed * 4}회)</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={14}
                    value={goalMed}
                    onChange={(e) => setGoalMed(Number(e.target.value))}
                    className="w-full accent-[#0C3B2E] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1.5">
                    감사·칭찬 · 주 {goalGrat}회
                    <span className="text-[#6F8377] font-medium"> (한 달 {goalGrat * 4}회)</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={14}
                    value={goalGrat}
                    onChange={(e) => setGoalGrat(Number(e.target.value))}
                    className="w-full accent-[#0C3B2E] cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E9E2]">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 text-[#6F8377] rounded-3xl font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="grad-forest px-5 py-2 text-white font-bold rounded-3xl transition cursor-pointer disabled:opacity-60 hover:brightness-110"
                  >
                    {savingGoal ? "저장 중..." : "목표 저장"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
