import React, { useState, useEffect } from "react";
import { User, BibleQA } from "../types";
import { HelpCircle, Sparkles, MessageSquare, Heart, Send, Trash2, Search, BookOpen, Clock, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

interface BibleQnAProps {
  currentUser: Omit<User, 'pin' | 'createdAt'>;
}

const PRESET_QUESTIONS = [
  "마태복음의 저자와 1세기 유대사회 역사적 배경은?",
  "신구약 중간기 400년 동안 어떤 사건들이 일어났나요?",
  "출애굽기 10가지 재앙의 고대 이집트 문화적 의미는?",
  "로마서가 집필된 시기와 로마 교회의 당시 상황은?",
  "요한계시록의 소아시아 7개 교회와 시대적 문맥은?"
];

export default function BibleQnA({ currentUser }: BibleQnAProps) {
  const [qnaList, setQnaList] = useState<BibleQA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search/Ask State
  const [question, setQuestion] = useState<string>("");
  const [category, setCategory] = useState<string>("성경 역사 & 배경");
  const [asking, setAsking] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Filter State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  // Comment Drawer State
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Collapsed status for long answers
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQnAList(true);

    const intervalId = setInterval(() => {
      fetchQnAList(false);
    }, 4000);

    const handleFocus = () => fetchQnAList(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchQnAList = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      const res = await fetch("/api/qna");
      if (res.ok) {
        const data: BibleQA[] = await res.json();
        setQnaList(data);
      }
    } catch (err) {
      console.error("Failed to fetch QnA:", err);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  const handleAsk = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const qToAsk = customQ || question;
    if (!qToAsk.trim()) {
      setError("궁금하신 성경 역사나 신학 질문을 입력해주세요.");
      return;
    }

    setAsking(true);
    setError("");

    try {
      const res = await fetch("/api/qna/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: qToAsk.trim(),
          category
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "질문 답변 생성 실패");
      }

      const newQA: BibleQA = await res.json();
      setQnaList(prev => [newQA, ...prev]);
      setQuestion("");
      // Auto expand newly asked item
      setExpandedIds(prev => new Set(prev).add(newQA.id));
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setAsking(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/api/qna/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        const updated: BibleQA = await res.json();
        setQnaList(prev => prev.map(q => q.id === id ? updated : q));
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 질문과 답변 기록을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/qna/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setQnaList(prev => prev.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleRegenerate = async (id: string) => {
    setRegeneratingId(id);
    try {
      const res = await fetch(`/api/qna/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const updated: BibleQA = await res.json();
        setQnaList(prev => prev.map(q => q.id === id ? updated : q));
        setExpandedIds(prev => new Set(prev).add(id));
      } else {
        alert("AI 답변 재생성에 실패했습니다.");
      }
    } catch (err) {
      console.error("Regenerate error:", err);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleAddComment = async (id: string) => {
    if (!commentInput.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/qna/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          content: commentInput.trim()
        })
      });

      if (res.ok) {
        const updated: BibleQA = await res.json();
        setQnaList(prev => prev.map(q => q.id === id ? updated : q));
        setCommentInput("");
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (qnaId: string, commentId: string) => {
    if (!window.confirm("코멘트를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/qna/${qnaId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updated: BibleQA = await res.json();
        setQnaList(prev => prev.map(q => q.id === qnaId ? updated : q));
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered QnA
  const filteredQnA = qnaList.filter(q => {
    if (selectedCategory !== "전체" && q.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return q.question.toLowerCase().includes(term) || q.answer.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072A20] via-[#0C3B2E] to-[#072A20] text-white rounded-[32px] p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#4A6B57]/20 text-[#FFFFFF] rounded-3xl">
              <BookOpen size={18} />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">AI 성경 역사 & 배경 Q&A</h2>
          </div>

          <p className="text-xs text-[#D2DDD3]/90 leading-relaxed max-w-2xl">
            성경 각 책의 연대, 제국 상황, 문화적 배경, 신학적 궁금증을 자유롭게 물어보세요.<br />
            AI가 성경 학술 자료를 바탕으로 명쾌하게 해설해주며, 목사님과 성도님들이 코멘트를 더해 은혜를 나눌 수 있습니다.
          </p>


        </div>
      </div>

      {/* Ask Question Form */}
      <div className="bg-white rounded-[32px] shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#E3E9E2] pb-2.5">
          <h3 className="text-sm font-bold text-[#0C3B2E] flex items-center gap-1.5">
            <HelpCircle size={16} className="text-[#4A6B57]" />
            성경 역사 및 배경 질문하기
          </h3>
          <span className="text-2xs text-[#6F8377] bg-[#F5F5F5] px-2.5 py-0.5 rounded-xl">
            🔒 익명 질문
          </span>
        </div>

        {error && (
          <div className="p-3 bg-[#FDF3F3] text-[#8F1E17] text-xs rounded-3xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] bg-white text-[#14261E] shrink-0 cursor-pointer shadow-sm"
            >
              <option value="성경 역사 & 배경">📜 성경 역사 & 배경</option>
              <option value="신학 & 구절 이해">📖 신학 & 구절 이해</option>
              <option value="성경 인물 탐구">👤 성경 인물 탐구</option>
              <option value="기타 성경 질문">❓ 기타 성경 질문</option>
            </select>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !asking) handleAsk(e);
              }}
              placeholder="예) 출애굽 당시 이집트의 역사적 상황과 파라오는 누구였나요?"
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] bg-white text-[#14261E] shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-2xs text-[#6F8377]">
              질문과 AI 해설은 전체 성도와 공유되며, 최신 질문이 맨 위에 남게 됩니다.
            </p>

            <button
              onClick={(e) => handleAsk(e)}
              disabled={asking || !question.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0C3B2E] hover:bg-[#072A20] text-white font-bold text-xs rounded-3xl shadow transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className={asking ? "animate-spin text-[#FFFFFF]" : "text-[#FFFFFF]"} />
              {asking ? "AI 역사 해설 생성 중..." : "AI에 질문하고 답변받기"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-[#6F8377]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Q&A 내용, 단어 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] bg-white text-[#14261E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
          {["전체", "성경 역사 & 배경", "신학 & 구절 이해", "성경 인물 탐구"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-3xl text-xs font-bold transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#0C3B2E] text-white"
                  : "bg-[#F5F5F5] text-[#6F8377] hover:text-[#0C3B2E]"
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="text-2xs text-[#6F8377] font-semibold bg-[#F5F5F5] px-2 py-1 rounded-3xl">
            총 {filteredQnA.length}건
          </span>
        </div>
      </div>

      {/* QnA Feed List */}
      {loading ? (
        <div className="bg-white rounded-[32px] p-10 text-center text-[#6F8377] text-xs font-medium shadow-sm">
          <Sparkles className="mx-auto mb-2 text-[#4A6B57] animate-spin" size={24} />
          성경 Q&A 히스토리를 불러오고 있습니다...
        </div>
      ) : filteredQnA.length === 0 ? (
        <div className="bg-white rounded-[32px] p-10 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-3xl bg-[#F5F5F5] text-[#4A6B57] flex items-center justify-center mx-auto">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0C3B2E]">등록된 성경 질문이 없습니다.</h4>
            <p className="text-xs text-[#6F8377] mt-1">
              궁금했던 성경 구절의 역사적 배경이나 의미를 첫 번째로 질문해보세요!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQnA.map((qa) => {
            const isLiked = qa.likes.includes(currentUser.id);
            const isCommentOpen = activeCommentId === qa.id;
            const isExpanded = expandedIds.has(qa.id);
            const isAdmin = currentUser.role === "admin";

            return (
              <motion.div
                key={qa.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-4 sm:p-5 transition hover:border-[#4A6B57]/40 space-y-3.5"
              >
                {/* Header Tag and Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-[#F5F5F5] text-[#0C3B2E]">
                      {qa.category || "성경 역사 & 배경"}
                    </span>
                    <span className="text-2xs text-[#6F8377] flex items-center gap-1">
                      🔒 익명의 탐구자 • {new Date(qa.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(qa.id)}
                    className="p-1.5 text-[#6F8377] hover:text-[#B3261E] rounded-xl transition cursor-pointer flex items-center gap-1 text-2xs"
                    title="질문 삭제"
                  >
                    <Trash2 size={14} />
                    <span className="text-2xs text-[#6F8377] hover:text-[#B3261E] font-semibold">삭제</span>
                  </button>
                </div>

                {/* Question */}
                <div className="bg-[#F5F5F5] p-3.5 rounded-3xl flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-xl bg-[#0C3B2E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    Q
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#0C3B2E] leading-relaxed pt-0.5">
                    {qa.question}
                  </p>
                </div>

                {/* AI Answer Toggle Button & Expandable Content */}
                {!isExpanded ? (
                  <button
                    onClick={() => toggleExpand(qa.id)}
                    className="w-full py-2.5 px-4 bg-[#F5F5F5] hover:bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl text-xs font-bold transition flex items-center justify-between cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-[#4A6B57] group-hover:scale-110 transition" />
                      <span>AI 성경 학자 & 역사 해설</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#0C3B2E] font-extrabold bg-white px-2.5 py-1 rounded-3xl shadow-2xs">
                      <span>답변 열기</span>
                      <ChevronDown size={15} className="text-[#4A6B57]" />
                    </div>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#F5F5F5] p-4 rounded-3xl space-y-3 relative shadow-inner"
                  >
                    {/* Answer Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E9E2] pb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C3B2E]">
                        <Sparkles size={15} className="text-[#4A6B57]" />
                        <span>AI 성경 학자 & 역사 해설</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-2xs bg-[#F5F5F5]/80 text-[#0C3B2E] px-2 py-0.5 rounded-lg font-semibold">
                          Gemini 3.6
                        </span>
                        <button
                          onClick={() => handleRegenerate(qa.id)}
                          disabled={regeneratingId === qa.id}
                          className="text-2xs bg-[#0C3B2E] hover:bg-[#072A20] text-white px-2 py-0.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="최신 Gemini 3.6 모델로 답변을 다시 생성합니다"
                        >
                          <Sparkles size={11} className={regeneratingId === qa.id ? "animate-spin text-[#FFFFFF]" : "text-[#FFFFFF]"} />
                          {regeneratingId === qa.id ? "생성중..." : "재작성"}
                        </button>
                        <button
                          onClick={() => toggleExpand(qa.id)}
                          className="text-xs bg-[#F5F5F5] hover:bg-[#E3E9E2] text-[#0C3B2E] px-2.5 py-1 rounded-3xl font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>답변 닫기</span>
                          <ChevronUp size={15} className="text-[#4A6B57]" />
                        </button>
                      </div>
                    </div>

                    {/* Full Markdown Answer Content */}
                    <div className="text-xs sm:text-sm text-[#14261E] leading-relaxed font-normal space-y-2">
                      <div className="markdown-body">
                        <Markdown>{qa.answer}</Markdown>
                      </div>
                    </div>

                    {/* Bottom Close Button */}
                    <div className="pt-2 border-t border-[#F5F5F5] flex justify-end">
                      <button
                        onClick={() => toggleExpand(qa.id)}
                        className="text-xs text-[#0C3B2E] hover:bg-[#F5F5F5] px-3 py-1.5 rounded-3xl font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>답변 닫기</span>
                        <ChevronUp size={15} className="text-[#4A6B57]" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Footer Controls (Likes, Comments Count) */}
                <div className="flex items-center justify-between pt-1 text-xs border-t border-[#F5F5F5]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(qa.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-3xl transition cursor-pointer font-bold ${
                        isLiked
                          ? "bg-[#FDF3F3] text-[#B3261E]"
                          : "text-[#6F8377] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <Heart size={14} className={isLiked ? "fill-[#B3261E] text-[#B3261E]" : ""} />
                      <span>도움돼요 {qa.likes.length}</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentId(isCommentOpen ? null : qa.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-3xl transition cursor-pointer font-semibold ${
                        isCommentOpen
                          ? "bg-[#4A6B57] text-white"
                          : "text-[#6F8377] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span>목회자/성도 코멘트 {qa.comments.length}</span>
                    </button>
                  </div>

                  <span className="text-2xs text-[#6F8377]">
                    {new Date(qa.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Expandable Pastoral / Member Comments Drawer */}
                <AnimatePresence>
                  {isCommentOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-[#E3E9E2] space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[#0C3B2E]">
                        <span>💬 목회자 및 성도 추가 코멘트</span>
                        <span className="text-2xs text-[#6F8377]">질문과 답변에 대해 의견을 나눌 수 있습니다</span>
                      </div>

                      {/* Comments List */}
                      {qa.comments.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {qa.comments.map((comment) => {
                            const canDeleteComment = comment.userId === currentUser.id || currentUser.role === "admin";
                            const isPastorOrAdmin = comment.userName.includes("목사") || comment.userName.includes("관리자");

                            return (
                              <div
                                key={comment.id}
                                className={`rounded-3xl p-2.5 text-xs flex justify-between items-start gap-2 ${
                                  isPastorOrAdmin
                                    ? "bg-[#F5F5F5]/80"
                                    : "bg-[#F5F5F5]/70"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`font-bold ${isPastorOrAdmin ? "text-[#0C3B2E]" : "text-[#0C3B2E]"}`}>
                                      {comment.userName}
                                    </span>
                                    {isPastorOrAdmin && (
                                      <span className="text-2xs bg-[#0C3B2E] text-white px-1.5 py-0.2 rounded font-bold">
                                        목양 코멘트
                                      </span>
                                    )}
                                    <span className="text-2xs text-[#6F8377]">
                                      {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[#4A6B57] leading-relaxed">{comment.content}</p>
                                </div>

                                {canDeleteComment && (
                                  <button
                                    onClick={() => handleDeleteComment(qa.id, comment.id)}
                                    className="text-[#6F8377] hover:text-[#B3261E] transition p-1 cursor-pointer shrink-0"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-2xs text-[#6F8377] text-center py-2 bg-[#F5F5F5]/50 rounded-3xl">
                          등록된 코멘트가 없습니다. 목사님이나 성도님의 나눔/보충 설명을 남겨보세요!
                        </p>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(qa.id);
                          }}
                          placeholder={`${currentUser.name}님으로 코멘트/목양 나눔 남기기...`}
                          className="flex-1 px-3 py-2 text-xs bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] bg-white text-[#14261E]"
                        />
                        <button
                          onClick={() => handleAddComment(qa.id)}
                          disabled={submittingComment || !commentInput.trim()}
                          className="p-2 bg-[#4A6B57] hover:bg-[#072A20] text-white rounded-3xl disabled:opacity-50 transition cursor-pointer"
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
