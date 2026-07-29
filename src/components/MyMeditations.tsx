import React, { useState, useEffect } from "react";
import { Meditation, GratitudeNote } from "../types";
import { MessageSquare, Heart, Edit2, Trash2, Send, Search, BookOpen, Clock, Calendar, X, Award, Activity, Loader, HeartHandshake, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MyMeditationsProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
}

type RecordTypeFilter = 'all' | 'meditation' | 'gratitude';

export default function MyMeditations({ currentUser }: MyMeditationsProps) {
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [gratitudes, setGratitudes] = useState<GratitudeNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<RecordTypeFilter>('all');

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
    fetchMyRecords();
  }, []);

  const fetchMyRecords = async () => {
    setLoading(true);
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
      setLoading(false);
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

  if (recordTypeFilter === 'all' || recordTypeFilter === 'meditation') {
    filteredMeditations.forEach(m => {
      combinedItems.push({
        type: 'meditation',
        data: m,
        sortTime: new Date(m.createdAt || m.date).getTime()
      });
    });
  }

  if (recordTypeFilter === 'all' || recordTypeFilter === 'gratitude') {
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
      {/* User Stats Card */}
      <div className="bg-gradient-to-br from-[#00311F] to-[#0B5C3C] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white pointer-events-none">
          <BookOpen size={180} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <span className="text-2xs font-black tracking-widest uppercase bg-white/20 px-2.5 py-1 rounded-full text-white/90 whitespace-nowrap shrink-0 inline-block">
              MY DEVOTIONAL JOURNAL
            </span>
            <h3 className="font-bold text-xl sm:text-2xl mt-1.5">{currentUser.name}님의 영성 기록 발자취</h3>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              주님과 친밀하게 나누어 온 묵상과 감사의 고백들이 은혜로 쌓여 가고 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 self-stretch md:self-auto border-t border-white/10 pt-3 md:pt-0 md:border-t-0">
            <div className="text-center bg-white/10 px-3 py-2.5 rounded-2xl min-w-[75px]">
              <div className="flex justify-center text-emerald-300 mb-0.5">
                <Activity size={16} />
              </div>
              <span className="text-2xs text-emerald-100/70 font-semibold block">묵상 작성</span>
              <strong className="text-base sm:text-lg font-black">{totalWritten}회</strong>
            </div>

            <div className="text-center bg-[#0B5C3C]/20 border border-[#C9EAD6]/30 px-3 py-2.5 rounded-2xl min-w-[75px]">
              <div className="flex justify-center text-[#6FF7A0] mb-0.5">
                <HeartHandshake size={16} />
              </div>
              <span className="text-2xs text-amber-100/90 font-semibold block">감사 작성</span>
              <strong className="text-base sm:text-lg font-black text-[#6FF7A0]">{totalGratitudes}회</strong>
            </div>

            <div className="text-center bg-white/10 px-3 py-2.5 rounded-2xl min-w-[75px]">
              <div className="flex justify-center text-emerald-300 mb-0.5">
                <Calendar size={16} />
              </div>
              <span className="text-2xs text-emerald-100/70 font-semibold block">기록한 날</span>
              <strong className="text-base sm:text-lg font-black">{distinctDays}일</strong>
            </div>

            <div className="text-center bg-white/10 px-3 py-2.5 rounded-2xl min-w-[75px]">
              <div className="flex justify-center text-[#6FF7A0] mb-0.5">
                <Award size={16} />
              </div>
              <span className="text-2xs text-emerald-100/70 font-semibold block">연속 일수</span>
              <strong className="text-base sm:text-lg font-black text-[#6FF7A0]">{activeStreak}일</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-3xl border border-[#E7E5D8] shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-[#8B8B82]" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="내 기록 내용 및 구절 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F4F2E6] border border-[#E7E5D8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] text-xs font-semibold"
            />
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-1 bg-[#F4F2E6] border border-[#E7E5D8] rounded-2xl px-2">
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent border-none text-[#1A1A1A] text-xs font-semibold py-2 focus:outline-none cursor-pointer"
              title="날짜별 검색"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter("")}
                className="text-[#8B8B82] hover:text-[#55554E] p-1 cursor-pointer"
                title="날짜 선택 해제"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Record Type Category Pills */}
        <div className="flex gap-2 border-t border-[#E7E5D8] pt-3 text-xs font-bold">
          <button
            onClick={() => setRecordTypeFilter('all')}
            className={`px-3 py-1.5 rounded-2xl transition cursor-pointer flex items-center gap-1.5 ${
              recordTypeFilter === 'all'
                ? "bg-[#00311F] text-white shadow-sm"
                : "bg-[#F4F2E6] text-[#8B8B82] hover:text-[#00311F]"
            }`}
          >
            <span>전체 기록</span>
            <span className="text-2xs bg-white/20 px-1.5 py-0.2 rounded-full">{totalWritten + totalGratitudes}</span>
          </button>
          <button
            onClick={() => setRecordTypeFilter('meditation')}
            className={`px-3 py-1.5 rounded-2xl transition cursor-pointer flex items-center gap-1.5 ${
              recordTypeFilter === 'meditation'
                ? "bg-[#00311F] text-white shadow-sm"
                : "bg-[#F4F2E6] text-[#8B8B82] hover:text-[#00311F]"
            }`}
          >
            <BookOpen size={13} />
            <span>말씀 묵상</span>
            <span className="text-2xs bg-white/20 px-1.5 py-0.2 rounded-full">{totalWritten}</span>
          </button>
          <button
            onClick={() => setRecordTypeFilter('gratitude')}
            className={`px-3 py-1.5 rounded-2xl transition cursor-pointer flex items-center gap-1.5 ${
              recordTypeFilter === 'gratitude'
                ? "bg-[#00311F] text-white shadow-sm"
                : "bg-[#F4F2E6] text-[#8B8B82] hover:text-[#004A2E]"
            }`}
          >
            <HeartHandshake size={13} />
            <span>오늘의 감사</span>
            <span className="text-2xs bg-white/20 px-1.5 py-0.2 rounded-full">{totalGratitudes}</span>
          </button>
        </div>
      </div>

      {/* Editing Form Container for Meditations */}
      {editingId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-[#0B5C3C] p-5 shadow-md"
        >
          <div className="flex justify-between items-center border-b border-[#E7E5D8] pb-3 mb-4">
            <h4 className="font-bold text-[#00311F] text-sm flex items-center gap-1.5">
              <Edit2 size={16} className="text-[#0B5C3C]" />
              내 묵상 기록 수정하기
            </h4>
            <button
              onClick={() => setEditingId(null)}
              className="text-[#8B8B82] hover:text-[#55554E] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
            {formError && (
              <div className="text-rose-500 bg-rose-50 p-2 rounded-xl font-semibold">{formError}</div>
            )}

            <div>
              <label className="block text-2xs font-bold text-[#8B8B82] mb-1">말씀 구절</label>
              <input
                type="text"
                value={editVerseTitle}
                onChange={(e) => setEditVerseTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-[#FBFBEF] text-[#1A1A1A] font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#8B8B82] mb-1">묵상 제목</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-[#FBFBEF] text-[#1A1A1A] font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#8B8B82] mb-1">묵상 고백 및 적용</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="w-full text-xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-[#FBFBEF] text-[#1A1A1A] leading-relaxed font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#8B8B82] mb-1">나의 동역자 중보기도 제목 (선택)</label>
              <input
                type="text"
                value={editPrayer}
                onChange={(e) => setEditPrayer(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-[#FBFBEF] text-[#1A1A1A] font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3.5 py-1.5 border border-[#E7E5D8] text-[#55554E] hover:bg-slate-50 transition font-bold rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-[#0B5C3C] hover:bg-[#004A2E] text-white font-bold rounded-xl transition cursor-pointer"
              >
                {submitting ? "수정 중..." : "수정 완료"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Unified Records List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="animate-spin text-[#0B5C3C] mb-2" size={24} />
            <p className="text-xs text-[#8B8B82]">내 영성 기록을 불러오고 있습니다...</p>
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
                  className="bg-white rounded-3xl border border-[#E7E5D8] shadow-sm p-5 space-y-4 hover:border-[#C9EAD6] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-[#00311F] text-white font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                        {currentUser.name.slice(-2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#00311F] text-xs">{currentUser.name}</span>
                          <span className="bg-[#E4F1E7] text-[#00311F] text-2xs font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            {med.verseTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-2xs text-[#8B8B82] mt-0.5 font-medium">
                          <Clock size={10} />
                          <span>{med.date} {new Date(med.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(med)}
                        className="p-1.5 text-[#8B8B82] hover:text-[#0B5C3C] hover:bg-[#F4F2E6] rounded-xl transition cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMeditation(med.id)}
                        className="p-1.5 text-[#8B8B82] hover:text-rose-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-[#00311F]">{med.title}</h4>
                    <p className="text-xs text-[#55554E] leading-relaxed whitespace-pre-line bg-[#FBFBEF] p-4 rounded-2xl border border-[#E7E5D8]">
                      {med.content}
                    </p>
                  </div>

                  {med.prayer && (
                    <div className="bg-[#E4F1E7]/40 border border-[#E7E5D8] rounded-2xl p-4 text-2xs">
                      <span className="font-bold text-[#00311F] block mb-1">🙏 이번 주 동역자 기도제목</span>
                      <p className="text-slate-700 leading-relaxed font-medium italic">
                        "{med.prayer}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-[#E7E5D8] pt-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLikeToggle(med.id, false)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          hasLiked ? "text-rose-600" : "text-[#8B8B82] hover:text-rose-500"
                        }`}
                      >
                        <Heart size={14} className={hasLiked ? "fill-rose-600 text-rose-600" : ""} />
                        <span>좋아요 {med.likes.length > 0 ? med.likes.length : ""}</span>
                      </button>

                      <button
                        onClick={() => toggleCommentsExpanded(med.id)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          commentsOpen ? "text-[#00311F]" : "text-[#8B8B82] hover:text-[#00311F]"
                        }`}
                      >
                        <MessageSquare size={14} />
                        <span>댓글 {med.comments.length > 0 ? med.comments.length : ""}</span>
                      </button>
                    </div>

                    {med.likes.length > 0 && (
                      <div className="text-2xs text-[#8B8B82] font-medium">
                        {med.likes.length}명의 지체가 격려 중입니다
                      </div>
                    )}
                  </div>

                  {commentsOpen && (
                    <div className="bg-[#F4F2E6]/60 border border-[#E7E5D8] rounded-2xl p-4 space-y-3 mt-2">
                      {med.comments.length > 0 ? (
                        <div className="space-y-2">
                          {med.comments.map((comment) => {
                            const isMyComment = comment.userId === currentUser.id;
                            return (
                              <div key={comment.id} className="flex justify-between items-start gap-2 bg-white/80 p-3 rounded-2xl border border-[#E7E5D8]">
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <strong className="font-bold text-[#00311F]">{comment.userName}</strong>
                                    <span className="text-2xs text-[#8B8B82]">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-[#55554E] leading-relaxed font-medium">
                                    {comment.content}
                                  </p>
                                </div>

                                {isMyComment && (
                                  <button
                                    onClick={() => handleDeleteComment(med.id, comment.id, false)}
                                    className="text-slate-300 hover:text-rose-500 p-0.5 rounded cursor-pointer"
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
                        <p className="text-2xs text-[#8B8B82] text-center py-2">
                          아직 달린 댓글이 없습니다. 지체들과 은혜로운 댓글을 나눠보세요! 💬
                        </p>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[med.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [med.id]: e.target.value }))}
                          placeholder="은혜로운 답글을 남겨보세요..."
                          className="flex-1 text-2xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5C3C] text-[#1A1A1A]"
                        />
                        <button
                          onClick={() => handleAddComment(med.id, false)}
                          className="px-3 bg-[#0B5C3C] hover:bg-[#004A2E] text-white rounded-xl transition flex items-center justify-center cursor-pointer"
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
                  className="bg-[#F4F2E6]/40 rounded-3xl border border-[#E7E5D8]/80 shadow-sm p-5 space-y-4 hover:border-[#C9EAD6] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-[#00311F] text-white font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                        <HeartHandshake size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#00311F] text-xs">
                            {grat.isAnonymous ? "익명 (감사 지체)" : currentUser.name}
                          </span>
                          <span className="bg-[#E9F5EC] text-[#00311F] border border-[#E7E5D8] text-2xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles size={10} className="text-[#0B5C3C]" /> 오늘의 감사
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-2xs text-[#00311F]/70 mt-0.5 font-medium">
                          <Clock size={10} />
                          <span>{grat.date} {new Date(grat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGratitude(grat.id)}
                      className="p-1.5 text-[#8B8B82] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p className="text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-line bg-white/90 p-4 rounded-2xl border border-[#E7E5D8]/60 font-medium">
                    {grat.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-[#E7E5D8]/60 pt-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLikeToggle(grat.id, true)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          hasLiked ? "text-rose-600" : "text-[#00311F]/70 hover:text-rose-500"
                        }`}
                      >
                        <Heart size={14} className={hasLiked ? "fill-rose-600 text-rose-600" : ""} />
                        <span>감사해요 {grat.likes.length > 0 ? grat.likes.length : ""}</span>
                      </button>

                      <button
                        onClick={() => toggleCommentsExpanded(grat.id)}
                        className={`flex items-center gap-1.5 text-2xs font-bold transition cursor-pointer ${
                          commentsOpen ? "text-[#00311F]" : "text-[#00311F]/70 hover:text-[#00311F]"
                        }`}
                      >
                        <MessageSquare size={14} />
                        <span>댓글 {grat.comments.length > 0 ? grat.comments.length : ""}</span>
                      </button>
                    </div>

                    {grat.likes.length > 0 && (
                      <div className="text-2xs text-[#00311F]/70 font-medium">
                        {grat.likes.length}명이 이 감사에 함께하고 있습니다
                      </div>
                    )}
                  </div>

                  {commentsOpen && (
                    <div className="bg-[#E9F5EC]/50 border border-[#E7E5D8]/70 rounded-2xl p-4 space-y-3 mt-2">
                      {grat.comments.length > 0 ? (
                        <div className="space-y-2">
                          {grat.comments.map((comment) => {
                            const isMyComment = comment.userId === currentUser.id;
                            return (
                              <div key={comment.id} className="flex justify-between items-start gap-2 bg-white/90 p-3 rounded-2xl border border-[#E7E5D8]/60">
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <strong className="font-bold text-[#1A1A1A]">{comment.userName}</strong>
                                    <span className="text-2xs text-[#8B8B82]">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed font-medium">
                                    {comment.content}
                                  </p>
                                </div>

                                {isMyComment && (
                                  <button
                                    onClick={() => handleDeleteComment(grat.id, comment.id, true)}
                                    className="text-slate-300 hover:text-rose-500 p-0.5 rounded cursor-pointer"
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
                        <p className="text-2xs text-[#00311F]/70 text-center py-2">
                          아직 달린 댓글이 없습니다. 따뜻한 감사 격려 댓글을 남겨보세요! 🙏
                        </p>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[grat.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [grat.id]: e.target.value }))}
                          placeholder="감사 나눔에 댓글 남기기..."
                          className="flex-1 text-2xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5C3C] text-[#1A1A1A]"
                        />
                        <button
                          onClick={() => handleAddComment(grat.id, true)}
                          className="px-3 bg-[#00311F] hover:bg-amber-700 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
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
          <div className="bg-[#F4F2E6]/50 rounded-3xl p-12 text-center border border-dashed border-[#E7E5D8] text-[#8B8B82]">
            <BookOpen className="mx-auto text-[#8B8B82] mb-2" size={32} />
            <p className="text-xs font-semibold text-[#55554E]">기록된 영성 발자취가 없습니다.</p>
            <p className="text-2xs text-[#8B8B82] mt-1">
              말씀 묵상 또는 오늘의 감사를 나누어 매일의 은혜를 기록해 보세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
