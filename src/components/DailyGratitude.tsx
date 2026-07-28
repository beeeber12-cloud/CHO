import React, { useState, useEffect, useRef } from "react";
import { User, GratitudeNote } from "../types";
import { Heart, MessageSquare, Send, Trash2, Sparkles, UserCheck, EyeOff, Calendar, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailyGratitudeProps {
  currentUser: Omit<User, 'pin' | 'createdAt'>;
}

export default function DailyGratitude({ currentUser }: DailyGratitudeProps) {
  const [gratitudes, setGratitudes] = useState<GratitudeNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Helper for KST YYYY-MM-DD
  const getKSTToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  // Form State
  const [content, setContent] = useState<string>("");
  const [date, setDate] = useState<string>(getKSTToday());
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Filter
  const [filterMyOnly, setFilterMyOnly] = useState<boolean>(false);

  // Active Comment Drawer State
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGratitudes(true);

    // 4-second polling for real-time live sync
    const intervalId = setInterval(() => {
      fetchGratitudes(false);
    }, 4000);

    const handleFocus = () => fetchGratitudes(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchGratitudes = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      const res = await fetch("/api/gratitudes");
      if (res.ok) {
        const data: GratitudeNote[] = await res.json();
        setGratitudes(data);
      }
    } catch (err) {
      console.error("Failed to fetch gratitudes:", err);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("오늘의 감사 내용을 한 줄 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/gratitudes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          isAnonymous,
          content: content.trim(),
          date,
          gratitudeId: editingId || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "감사 글 저장 실패");
      }

      // Reset form
      setContent("");
      setIsAnonymous(false);
      setShowForm(false);
      setEditingId(null);
      await fetchGratitudes(false);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/gratitudes/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        const updated: GratitudeNote = await res.json();
        setGratitudes(prev => prev.map(g => g.id === id ? updated : g));
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 감사 글을 정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/gratitudes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setGratitudes(prev => prev.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleAddComment = async (id: string) => {
    if (!commentInput.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/gratitudes/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          content: commentInput.trim()
        })
      });

      if (res.ok) {
        const updated: GratitudeNote = await res.json();
        setGratitudes(prev => prev.map(g => g.id === id ? updated : g));
        setCommentInput("");
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (gratitudeId: string, commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/gratitudes/${gratitudeId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updated: GratitudeNote = await res.json();
        setGratitudes(prev => prev.map(g => g.id === gratitudeId ? updated : g));
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // Filtered Gratitudes
  const filteredGratitudes = gratitudes.filter(g => {
    if (filterMyOnly && g.userId !== currentUser.id) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Real-time sync banner & header */}
      <div className="bg-gradient-to-r from-[#2c3e2d] to-[#3d5a3d] text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                <Sparkles size={18} />
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">오늘의 감사 나눔터</h2>
            </div>
            <p className="text-xs text-emerald-100/80 leading-relaxed max-w-xl">
              범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라 (살전 5:18).<br />
              오늘 하루 발견한 작고 소중한 감사를 한 줄로 나눠보세요.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setContent("");
              setIsAnonymous(false);
              setError("");
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 hover:bg-amber-300 text-[#2c3e2d] font-bold rounded-2xl shadow-md transition cursor-pointer text-xs shrink-0"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "작성 창 닫기" : "오늘의 감사 고백하기"}
          </button>
        </div>
      </div>

      {/* Write Gratitude Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#ece8df] shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#ece8df] pb-3">
                <h3 className="text-sm font-bold text-[#2c3e2d] flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-500" />
                  {editingId ? "감사 고백 수정하기" : "오늘의 감사 등록"}
                </h3>
                <span className="text-xs text-[#8a8171]">
                  작성자: <strong>{currentUser.name}</strong>
                </span>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a463f] mb-1 flex items-center gap-1">
                    <Calendar size={14} className="text-[#4a6d4a]" />
                    감사 날짜
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium border border-[#ece8df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] bg-white text-slate-800"
                  />
                </div>

                {/* Anonymous Option Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a463f] mb-1 flex items-center gap-1">
                    {isAnonymous ? <EyeOff size={14} className="text-amber-600" /> : <UserCheck size={14} className="text-[#4a6d4a]" />}
                    이름 공개 여부
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isAnonymous
                        ? "bg-amber-50 border-amber-300 text-amber-800"
                        : "bg-[#f4f2eb] border-[#ece8df] text-[#4a463f] hover:bg-[#e8e4d8]"
                    }`}
                  >
                    <span>{isAnonymous ? "🔒 익명으로 올려요" : `👤 실명으로 올려요 (${currentUser.name})`}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 font-normal">
                      {isAnonymous ? "익명 (감사 지체)" : "이름 표시"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Gratitude Content */}
              <div>
                <label className="block text-xs font-semibold text-[#4a463f] mb-1">
                  감사 고백 내용 (한 줄 또는 짧은 메시지)
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="예) 오늘 퇴근길 하늘이 너무 예뻐서 마음이 평안해졌습니다. 힘든 업무 속에서도 힘주신 주님 감사합니다!"
                  className="w-full p-3 text-xs font-medium border border-[#ece8df] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] text-slate-800 leading-relaxed bg-white shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-[#ece8df] rounded-xl text-xs font-semibold text-[#8a8171] hover:bg-[#f4f2eb] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#4a6d4a] hover:bg-[#3d5a3d] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  {submitting ? "저장 중..." : editingId ? "수정 완료" : "감사 나누기"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#ece8df] p-3 shadow-sm flex items-center justify-end gap-2.5">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilterMyOnly(!filterMyOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              filterMyOnly
                ? "bg-[#2c3e2d] text-white border-[#2c3e2d]"
                : "bg-[#f4f2eb] text-[#4a463f] border-[#ece8df] hover:bg-[#e0dcd0]"
            }`}
          >
            {filterMyOnly ? "✓ 내 감사글만 보기" : "전체 감사글"}
          </button>
          <span className="text-[11px] font-semibold text-[#8a8171] bg-[#f4f2eb] px-2.5 py-1 rounded-xl border border-[#ece8df]">
            총 {filteredGratitudes.length}건
          </span>
        </div>
      </div>

      {/* Gratitudes Feed List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-10 text-center text-[#8a8171] text-xs font-medium border border-[#ece8df] shadow-sm">
          <Sparkles className="mx-auto mb-2 text-[#4a6d4a] animate-spin" size={24} />
          감사 고백을 불러오는 중입니다...
        </div>
      ) : filteredGratitudes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#ece8df] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Sparkles size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#2c3e2d]">등록된 감사 고백이 없습니다.</h4>
            <p className="text-xs text-[#8a8171] mt-1">
              오늘 첫 번째 감사 제목을 나눠 공동체를 따뜻하게 밝혀주세요!
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4a6d4a] text-white font-bold text-xs rounded-xl shadow hover:bg-[#3d5a3d] transition cursor-pointer"
          >
            <Plus size={14} />
            첫 감사 고백 남기기
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredGratitudes.map((grat) => {
            const isLiked = grat.likes.includes(currentUser.id);
            const isAuthor = grat.userId === currentUser.id;
            const canDelete = isAuthor || currentUser.role === "admin";
            const isCommentOpen = activeCommentId === grat.id;

            return (
              <motion.div
                key={grat.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#ece8df] shadow-sm p-4 sm:p-5 transition hover:border-[#4a6d4a]/40"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      grat.isAnonymous
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-[#e0e7df] text-[#2c3e2d] border border-[#4a6d4a]/30"
                    }`}>
                      {grat.isAnonymous ? "익명" : grat.userName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#2c3e2d]">
                          {grat.isAnonymous ? "익명 (감사 지체)" : grat.userName}
                        </span>
                        {isAuthor && (
                          <span className="text-[10px] bg-[#4a6d4a] text-white px-1.5 py-0.2 rounded font-semibold">
                            나
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8a8171] block">
                        {grat.date}
                      </span>
                    </div>
                  </div>

                  {/* Options / Delete */}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(grat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="bg-[#fcfbf9] border border-[#f0ede6] rounded-2xl p-3.5 mb-3 text-xs sm:text-sm text-[#2c3e2d] font-medium leading-relaxed shadow-inner">
                  &ldquo;{grat.content}&rdquo;
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#f4f2eb] text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(grat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer font-bold ${
                        isLiked
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "text-[#8a8171] hover:bg-[#f4f2eb]"
                      }`}
                    >
                      <Heart size={14} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                      <span>{grat.likes.length}</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentId(isCommentOpen ? null : grat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer font-semibold ${
                        isCommentOpen
                          ? "bg-[#4a6d4a] text-white"
                          : "text-[#8a8171] hover:bg-[#f4f2eb]"
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span>댓글 {grat.comments.length}</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-[#8a8171]">
                    {new Date(grat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Expandable Comments Drawer */}
                <AnimatePresence>
                  {isCommentOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-[#ece8df] space-y-3"
                    >
                      {/* Comments List */}
                      {grat.comments.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {grat.comments.map((comment) => {
                            const canDeleteComment = comment.userId === currentUser.id || currentUser.role === "admin";
                            return (
                              <div key={comment.id} className="bg-[#f4f2eb]/70 rounded-xl p-2.5 text-xs flex justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-bold text-[#2c3e2d]">{comment.userName}</span>
                                    <span className="text-[10px] text-[#8a8171]">
                                      {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[#4a463f] leading-relaxed">{comment.content}</p>
                                </div>

                                {canDeleteComment && (
                                  <button
                                    onClick={() => handleDeleteComment(grat.id, comment.id)}
                                    className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer shrink-0"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8a8171] text-center py-2">
                          첫 댓글을 남겨 이 감사의 고백에 함께 기뻐해 주세요!
                        </p>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(grat.id);
                          }}
                          placeholder="따뜻한 축하와 위로의 댓글을 남겨보세요..."
                          className="flex-1 px-3 py-2 text-xs border border-[#ece8df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a6d4a] bg-white text-slate-800"
                        />
                        <button
                          onClick={() => handleAddComment(grat.id)}
                          disabled={submittingComment || !commentInput.trim()}
                          className="p-2 bg-[#4a6d4a] hover:bg-[#3d5a3d] text-white rounded-xl disabled:opacity-50 transition cursor-pointer"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
