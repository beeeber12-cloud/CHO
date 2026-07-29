import React, { useState, useEffect, useRef } from "react";
import { Meditation, Comment, SokGroup } from "../types";
import { MessageSquare, Heart, Edit2, Trash2, Send, Plus, Search, BookOpen, Clock, PenTool, X, ShieldAlert, Bell, Radio, CheckCircle, Users, Globe, Settings, UserPlus, Check, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";


interface MeditationFeedProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
  allUsers: { id: string; name: string; role: string }[];
  prefilledVerse?: { title: string; text: string } | null;
  onClearPrefilledVerse?: () => void;
}

export default function MeditationFeed({ currentUser, allUsers, prefilledVerse, onClearPrefilledVerse }: MeditationFeedProps) {
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWriteForm, setShowWriteForm] = useState<boolean>(false);

  // Sok (Small Group) state
  const [sokGroups, setSokGroups] = useState<SokGroup[]>([]);
  const [selectedSokTab, setSelectedSokTab] = useState<string>("all");
  const [showSokManageModal, setShowSokManageModal] = useState<boolean>(false);
  const [sokIdForForm, setSokIdForForm] = useState<string | null>(null);

  // Sok Manage Modal Form States
  const [newSokName, setNewSokName] = useState<string>("");
  const [newSokDesc, setNewSokDesc] = useState<string>("");
  const [editingSokId, setEditingSokId] = useState<string | null>(null);
  const [editingSokName, setEditingSokName] = useState<string>("");
  const [editingSokDesc, setEditingSokDesc] = useState<string>("");
  const [activeSokMemberSettingsId, setActiveSokMemberSettingsId] = useState<string | null>(null);

  // Real-time toast alert state
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
  const [notiPermission, setNotiPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // Known item refs to compare for new posts/comments
  const knownMedIdsRef = useRef<Set<string>>(new Set());
  const knownCommentCountsRef = useRef<Record<string, number>>({});
  const isInitialLoadRef = useRef<boolean>(true);

  // Write Form states
  const [verseTitle, setVerseTitle] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [prayer, setPrayer] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Comments state - maps meditationId to its current comment input string
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Filter state
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  useEffect(() => {
    fetchMeditations(true);
    fetchSokGroups();

    // 4-second real-time polling interval
    const intervalId = setInterval(() => {
      fetchMeditations(false);
      fetchSokGroups();
    }, 4000);

    // Window focus instant sync listener
    const handleFocus = () => {
      fetchMeditations(false);
      fetchSokGroups();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchSokGroups = async () => {
    try {
      const res = await fetch("/api/soks");
      if (res.ok) {
        const data: SokGroup[] = await res.json();
        setSokGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch Sok groups:", err);
    }
  };

  // Handle prefilled verse from Bible Reader
  useEffect(() => {
    if (prefilledVerse) {
      setVerseTitle(prefilledVerse.title);
      // Generate automatic title template
      setTitle(`${prefilledVerse.title} 말씀을 묵상하며`);
      setContent(`${prefilledVerse.text}\n\n`);
      setShowWriteForm(true);
      setEditingId(null);
      if (onClearPrefilledVerse) {
        onClearPrefilledVerse();
      }
    }
  }, [prefilledVerse]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotiPermission(perm);
      if (perm === "granted") {
        setRealtimeToast("🔔 브라우저 및 스마트폰 알림이 성공적으로 허용되었습니다!");
        setTimeout(() => setRealtimeToast(null), 3000);
      }
    }
  };

  const triggerNotification = (title: string, body: string) => {
    // 1. In-app Toast Banner
    setRealtimeToast(body);
    setTimeout(() => {
      setRealtimeToast(null);
    }, 6000);

    // 2. Native System Push Notification (Mobile / Desktop)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.error("Browser notification display error:", err);
      }
    }
  };

  const fetchMeditations = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      const res = await fetch("/api/meditations");
      if (res.ok) {
        const data: Meditation[] = await res.json();
        
        // Detect new posts and comments for real-time alerts
        if (!isInitialLoadRef.current) {
          data.forEach((med) => {
            // Check if brand new meditation from another user
            if (!knownMedIdsRef.current.has(med.id) && med.userId !== currentUser.id) {
              triggerNotification(
                "📖 새 묵상 글이 공유되었습니다!",
                `[새 묵상] ${med.userName} 지체님이 새 글 '${med.title}'을 올리셨습니다.`
              );
            }

            // Check if new comments added by another user
            const prevCommentCount = knownCommentCountsRef.current[med.id] || 0;
            const currentCommentCount = med.comments ? med.comments.length : 0;
            if (currentCommentCount > prevCommentCount) {
              const latestComment = med.comments[med.comments.length - 1];
              if (latestComment && latestComment.userId !== currentUser.id) {
                triggerNotification(
                  "💬 묵상 글에 새 댓글이 달렸습니다!",
                  `[새 댓글] ${latestComment.userName}님이 '${med.title}' 글에 댓글을 남기셨습니다: "${latestComment.content}"`
                );
              }
            }
          });
        }

        // Update known tracking refs
        const newSet = new Set<string>();
        const newCounts: Record<string, number> = {};
        data.forEach(m => {
          newSet.add(m.id);
          newCounts[m.id] = m.comments ? m.comments.length : 0;
        });
        knownMedIdsRef.current = newSet;
        knownCommentCountsRef.current = newCounts;
        isInitialLoadRef.current = false;

        setMeditations(data);
      }
    } catch (err) {
      console.error("Failed to load meditations:", err);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  // Sok Group Handlers
  const handleCreateSok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSokName.trim()) return;
    try {
      const res = await fetch("/api/soks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSokName.trim(),
          description: newSokDesc.trim(),
          memberUserIds: []
        })
      });
      if (res.ok) {
        const created: SokGroup = await res.json();
        setSokGroups(prev => [...prev, created]);
        setNewSokName("");
        setNewSokDesc("");
      }
    } catch (err) {
      console.error("Failed to create Sok:", err);
    }
  };

  const handleRenameSok = async (sokId: string) => {
    if (!editingSokName.trim()) return;
    try {
      const res = await fetch(`/api/soks/${sokId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSokName.trim(),
          description: editingSokDesc.trim()
        })
      });
      if (res.ok) {
        const updated: SokGroup = await res.json();
        setSokGroups(prev => prev.map(s => s.id === sokId ? updated : s));
        setEditingSokId(null);
      }
    } catch (err) {
      console.error("Failed to rename Sok:", err);
    }
  };

  const handleDeleteSok = async (sokId: string) => {
    if (!confirm("이 속을 삭제하시겠습니까? (속에 작성되었던 글들은 전체 공유로 전환됩니다)")) return;
    try {
      const res = await fetch(`/api/soks/${sokId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSokGroups(prev => prev.filter(s => s.id !== sokId));
        if (selectedSokTab === sokId) setSelectedSokTab("all");
      }
    } catch (err) {
      console.error("Failed to delete Sok:", err);
    }
  };

  const handleToggleSokMember = async (sokId: string, targetUserId: string) => {
    const targetSok = sokGroups.find(s => s.id === sokId);
    if (!targetSok) return;

    const currentMembers = targetSok.memberUserIds || [];
    const exists = currentMembers.includes(targetUserId);
    const updatedMembers = exists
      ? currentMembers.filter(id => id !== targetUserId)
      : [...currentMembers, targetUserId];

    try {
      const res = await fetch(`/api/soks/${sokId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberUserIds: updatedMembers
        })
      });
      if (res.ok) {
        const updated: SokGroup = await res.json();
        setSokGroups(prev => prev.map(s => s.id === sokId ? updated : s));
      }
    } catch (err) {
      console.error("Failed to toggle Sok member:", err);
    }
  };

  // Accessible Soks for current user
  const accessibleSoks = sokGroups.filter(sok => {
    if (currentUser.role === 'admin') return true;
    return sok.memberUserIds && sok.memberUserIds.includes(currentUser.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verseTitle.trim() || !title.trim() || !content.trim()) {
      setFormError("말씀 구절, 제목, 묵상 내용을 모두 채워 주세요.");
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
          verseTitle: verseTitle.trim(),
          title: title.trim(),
          content: content.trim(),
          prayer: prayer.trim(),
          sokId: sokIdForForm,
          meditationId: editingId // Pass if updating
        })
      });

      if (res.ok) {
        // Clear form
        setVerseTitle("");
        setTitle("");
        setContent("");
        setPrayer("");
        setSokIdForForm(null);
        setEditingId(null);
        setShowWriteForm(false);
        // Refresh feed
        await fetchMeditations();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "작성에 실패했습니다.");
      }
    } catch (err) {
      setFormError("서버와의 통신이 원활하지 않습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (med: Meditation) => {
    setVerseTitle(med.verseTitle);
    setTitle(med.title);
    setContent(med.content);
    setPrayer(med.prayer);
    setSokIdForForm(med.sokId || null);
    setEditingId(med.id);
    setShowWriteForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("묵상 글을 삭제하시겠습니까?")) return;

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

  const handleLikeToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/meditations/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updatedMed = await res.json();
        setMeditations(meditations.map(m => m.id === id ? updatedMed : m));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleAddComment = async (medId: string) => {
    const text = commentInputs[medId] || "";
    if (!text.trim()) return;

    try {
      const res = await fetch(`/api/meditations/${medId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          content: text.trim()
        })
      });

      if (res.ok) {
        const updatedMed = await res.json();
        setMeditations(meditations.map(m => m.id === medId ? updatedMed : m));
        // Clear comment input
        setCommentInputs(prev => ({ ...prev, [medId]: "" }));
        // Expand comments list automatically
        setExpandedComments(prev => ({ ...prev, [medId]: true }));
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleDeleteComment = async (medId: string, commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/meditations/${medId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        const updatedMed = await res.json();
        setMeditations(meditations.map(m => m.id === medId ? updatedMed : m));
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const toggleCommentsExpanded = (medId: string) => {
    setExpandedComments(prev => ({ ...prev, [medId]: !prev[medId] }));
  };

  // Filtering Logic
  const filteredMeditations = meditations.filter(med => {
    // 1. Sok Filter
    if (selectedSokTab === "all") {
      if (med.sokId) return false; // Show public posts when on "all"
    } else {
      if (med.sokId !== selectedSokTab) return false;
    }

    const matchesUser = selectedUserFilter === "" || med.userId === selectedUserFilter;
    const matchesDate = selectedDateFilter === "" || med.date === selectedDateFilter;

    return matchesUser && matchesDate;
  });

  return (
    <div className="space-y-5">
      {/* Real-time Toast Popup Banner */}
      <AnimatePresence>
        {realtimeToast && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-[#00311F] text-white p-3.5 rounded-2xl shadow-xl border border-[#E7E5D8] flex items-center justify-between gap-3 relative z-30"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0B5C3C] rounded-2xl text-white animate-bounce shrink-0">
                <Bell size={16} />
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-100">
                {realtimeToast}
              </p>
            </div>
            <button
              onClick={() => setRealtimeToast(null)}
              className="p-1 hover:bg-[#004A2E] text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Status Indicator & Push Notification Enable Strip */}
      <div className="bg-[#F4F2E6] border border-[#E7E5D8] rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#00311F] font-bold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="text-2xs sm:text-xs">실시간 나눔 자동 반영 중</span>
          <span className="text-2xs text-[#8B8B82] font-normal hidden sm:inline">(지체들의 글과 댓글이 4초마다 자동 동기화됩니다)</span>
        </div>

        {notiPermission !== "granted" ? (
          <button
            onClick={requestNotificationPermission}
            className="flex items-center gap-1 text-2xs font-bold text-[#0B5C3C] bg-white hover:bg-[#E4F1E7]/50 border border-[#0B5C3C]/30 px-2.5 py-1 rounded-2xl transition cursor-pointer"
          >
            <Bell size={12} className="animate-pulse" />
            새 묵상 스마트폰/브라우저 알림 켜기
          </button>
        ) : (
          <span className="flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl">
            <CheckCircle size={11} />
            알림 수신 중
          </span>
        )}
      </div>

      {/* Sok Group Navigation Tabs & Manage Button */}
      <div className="bg-[#F4F2E6] p-2 rounded-2xl border border-[#E7E5D8] flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
          {/* Public All Tab */}
          <button
            onClick={() => setSelectedSokTab("all")}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedSokTab === "all"
                ? "bg-[#00311F] text-white shadow-xs"
                : "bg-white text-[#55554E] hover:bg-[#E7E5D8] border border-[#E7E5D8]"
            }`}
          >
            <Globe size={13} />
            <span>전체 공유</span>
          </button>

          {/* User's Soks */}
          {accessibleSoks.map((sok) => {
            const isSelected = selectedSokTab === sok.id;
            return (
              <button
                key={sok.id}
                onClick={() => setSelectedSokTab(sok.id)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#0B5C3C] text-white shadow-xs"
                    : "bg-white text-[#00311F] hover:bg-[#E4F1E7] border border-[#E7E5D8]"
                }`}
              >
                <Users size={13} />
                <span>{sok.name}</span>
                {sok.memberUserIds?.length > 0 && (
                  <span className={`text-2xs px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-[#F4F2E6] text-[#0B5C3C]"}`}>
                    {sok.memberUserIds.length}명
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Admin / Sok Manage Button */}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowSokManageModal(true)}
            className="px-3 py-1.5 bg-[#00311F] hover:bg-[#002517] text-white rounded-2xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
            title="속(소그룹) 추가, 이름 변경 및 구성원 관리"
          >
            <Settings size={13} />
            <span>속 관리</span>
          </button>
        )}
      </div>

      {/* Search and Write Button Controls */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E7E5D8] shadow-sm p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">

          {/* User selector filter */}
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="px-2.5 py-2 bg-[#F4F2E6] border border-[#E7E5D8] rounded-2xl focus:outline-none text-[#1A1A1A] text-xs font-semibold cursor-pointer"
          >
            <option value="">모든 식구 글 보기</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} 성도님</option>
            ))}
          </select>

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

        <button
          onClick={() => {
            setShowWriteForm(!showWriteForm);
            setEditingId(null);
            setFormError("");
          }}
          className="flex items-center justify-center gap-1.5 bg-[#0B5C3C] hover:bg-[#004A2E] text-white font-bold text-xs px-3.5 py-2 rounded-2xl shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
        >
          {showWriteForm ? <X size={14} /> : <Plus size={14} />}
          {showWriteForm ? "닫기" : "내 묵상 글 쓰기"}
        </button>
      </div>

      {/* Expandable Write/Edit Form */}
      <AnimatePresence>
        {showWriteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl border border-[#E7E5D8] shadow-sm p-3.5 sm:p-6 space-y-3.5">
              <h3 className="text-base font-bold text-[#00311F] flex items-center">
                <PenTool className="mr-1.5 text-[#0B5C3C]" size={18} />
                {editingId ? "내 묵상 글 수정하기" : "오늘의 묵상 글 작성"}
              </h3>

              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-2xl flex items-center">
                  <ShieldAlert className="mr-1.5" size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8B8B82] mb-1">묵상 말씀 구절</label>
                  <input
                    type="text"
                    required
                    value={verseTitle}
                    onChange={(e) => setVerseTitle(e.target.value)}
                    placeholder="예: 이사야 41:10 (또는 위 공지 클릭)"
                    className="w-full text-xs px-3 py-2.5 border border-[#E7E5D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8B8B82] mb-1">묵상 글 제목</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 두려움을 이기는 참된 위로"
                    className="w-full text-xs px-3 py-2.5 border border-[#E7E5D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8B8B82] mb-1">묵상 고백 및 나누고 싶은 내용</label>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="말씀을 묵상하며 깨달은 생각, 삶의 적용, 소그룹 식구들과 나누고픈 은혜를 정성스럽게 적어보세요..."
                  className="w-full text-xs px-3 py-2.5 border border-[#E7E5D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8B8B82] mb-1">오늘 나의 기도 제목 (선택)</label>
                <textarea
                  rows={2}
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder="소그룹 지체들과 함께 기도하고 싶은 주간 기도제목을 기입해주세요..."
                  className="w-full text-xs px-3 py-2.5 border border-[#E7E5D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8B8B82] mb-1">
                  나눔 범위 선택 (속 모임 / 전체 공유)
                </label>
                <select
                  value={sokIdForForm || ""}
                  onChange={(e) => setSokIdForForm(e.target.value || null)}
                  className="w-full text-xs px-3 py-2.5 border border-[#E7E5D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C] text-[#1A1A1A] font-bold bg-[#FFFFFF] cursor-pointer"
                >
                  <option value="">🌐 전체 공유 (교회 모든 식구와 나눔)</option>
                  {accessibleSoks.map((sok) => (
                    <option key={sok.id} value={sok.id}>
                      🏷️ {sok.name} 모임 식구들에게만 공유
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWriteForm(false);
                    setEditingId(null);
                    setFormError("");
                  }}
                  className="px-4 py-2 border border-[#E7E5D8] text-xs font-semibold rounded-2xl text-[#55554E] bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-2xl text-white bg-[#0B5C3C] hover:bg-[#004A2E] shadow-md transition cursor-pointer"
                >
                  {submitting ? "등록 중..." : editingId ? "묵상 수정 완료" : "내 묵상 공유하기"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meditations Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl border border-[#E7E5D8] p-12 text-center text-[#8B8B82]">
            <Clock className="animate-spin mx-auto text-[#0B5C3C] mb-2" size={24} />
            <p className="text-sm">묵상 나눔을 가져오고 있습니다...</p>
          </div>
        ) : filteredMeditations.length > 0 ? (
          filteredMeditations.map((med) => {
            const hasLiked = med.likes.includes(currentUser.id);
            const isMyMed = med.userId === currentUser.id;
            const commentsOpen = expandedComments[med.id] || false;

            return (
              <motion.div
                key={med.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#E7E5D8] shadow-sm p-5 space-y-4 hover:border-[#0B5C3C]/50 hover:shadow-md transition-all duration-300"
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E4F1E7] flex items-center justify-center font-bold text-[#00311F] border border-[#E7E5D8] text-sm">
                      {med.userName.slice(-2)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#F44A22] text-sm">{med.userName}</span>
                        <span className="text-2xs bg-[#F4F2E6] text-[#0B5C3C] px-2 py-0.5 rounded-full font-bold">
                          {med.verseTitle}
                        </span>
                        {med.sokId ? (
                          <span className="text-2xs bg-[#E9F5EC] text-[#00311F] border border-[#C9EAD6] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Users size={11} />
                            {sokGroups.find(s => s.id === med.sokId)?.name || "속 나눔"}
                          </span>
                        ) : (
                          <span className="text-2xs bg-[#F4F2E6] text-[#8B8B82] border border-[#E7E5D8] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Globe size={11} />
                            전체 공유
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-2xs text-[#8B8B82] font-medium">
                        <Clock size={10} />
                        <span>{new Date(med.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for owner */}
                  {isMyMed && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(med)}
                        className="p-1.5 text-[#8B8B82] hover:text-[#0B5C3C] hover:bg-[#F4F2E6] rounded-xl transition cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="p-1.5 text-[#8B8B82] hover:text-rose-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content body */}
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-[#00311F]">{med.title}</h4>

                  <p className="text-sm text-[#55554E] leading-relaxed whitespace-pre-line bg-[#FBFBEF] p-4 rounded-2xl border border-[#E7E5D8]">
                    {med.content}
                  </p>
                </div>


                {/* Optional Prayer target */}
                {med.prayer && (
                  <div className="bg-[#E4F1E7]/40 border border-[#E7E5D8] rounded-2xl p-4 text-xs">
                    <span className="font-bold text-[#00311F] block mb-1">🙏 이번 주 동역자 기도제목</span>
                    <p className="text-slate-700 leading-relaxed font-medium italic">
                      &quot;{med.prayer}&quot;
                    </p>
                  </div>
                )}

                {/* Footer Likes and Comments actions */}
                <div className="flex items-center justify-between border-t border-[#E7E5D8] pt-3">
                  <div className="flex items-center gap-4">
                    {/* Like button */}
                    <button
                      onClick={() => handleLikeToggle(med.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        hasLiked ? "text-rose-600" : "text-[#8B8B82] hover:text-rose-500"
                      }`}
                    >
                      <Heart size={16} className={hasLiked ? "fill-rose-600 text-rose-600" : ""} />
                      <span>좋아요 {med.likes.length > 0 ? med.likes.length : ""}</span>
                    </button>

                    {/* Comment expand button */}
                    <button
                      onClick={() => toggleCommentsExpanded(med.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        commentsOpen ? "text-[#00311F]" : "text-[#8B8B82] hover:text-[#00311F]"
                      }`}
                    >
                      <MessageSquare size={16} />
                      <span>댓글 {med.comments.length > 0 ? med.comments.length : ""}</span>
                    </button>
                  </div>

                  {/* Little avater indicator of who liked it */}
                  {med.likes.length > 0 && (
                    <div className="text-2xs text-[#8B8B82] font-medium">
                      {med.likes.length}명의 지체가 격려하고 있습니다
                    </div>
                  )}
                </div>

                {/* Comments Thread Section */}
                {commentsOpen && (
                  <div className="bg-[#F4F2E6]/60 border border-[#E7E5D8] rounded-2xl p-4 space-y-3 mt-2">
                    {/* List existing comments */}
                    {med.comments.length > 0 ? (
                      <div className="space-y-2.5">
                        {med.comments.map((comment) => {
                          const isMyComment = comment.userId === currentUser.id;
                          return (
                            <div key={comment.id} className="flex justify-between items-start gap-2 bg-white/80 p-3 rounded-2xl border border-[#E7E5D8]">
                              <div className="text-xs">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <strong className="font-bold text-[#F44A22]">{comment.userName}</strong>
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
                                  onClick={() => handleDeleteComment(med.id, comment.id)}
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
                        첫 댓글을 달아 묵상에 대한 은혜를 나눠보세요! 💬
                      </p>
                    )}

                    {/* New comment input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[med.id] || ""}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [med.id]: e.target.value }))}
                        placeholder="은혜로운 지지와 나눔의 말을 기입하세요..."
                        className="flex-1 text-xs px-3 py-2 border border-[#E7E5D8] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5C3C] text-[#1A1A1A]"
                      />
                      <button
                        onClick={() => handleAddComment(med.id)}
                        className="px-3 bg-[#0B5C3C] hover:bg-[#004A2E] text-white rounded-xl transition flex items-center justify-center cursor-pointer"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="bg-[#F4F2E6] rounded-3xl p-12 text-center border border-dashed border-[#E7E5D8] text-[#8B8B82]">
            <BookOpen className="mx-auto text-[#8B8B82] mb-2" size={32} />
            <p className="text-sm font-semibold text-[#55554E]">아직 조건에 맞는 묵상 나눔 글이 없습니다.</p>
            <p className="text-xs text-[#8B8B82] mt-1">지체 중 첫 번째로 묵상 고백을 올려보세요!</p>
          </div>
        )}
      </div>

      {/* Sok Management Modal */}
      <AnimatePresence>
        {showSokManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-[#E7E5D8]"
            >
              <div className="flex justify-between items-center border-b border-[#E7E5D8] pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#E4F1E7] text-[#00311F] rounded-2xl font-bold">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#00311F]">속(소그룹) 관리 및 구성원 설정</h2>
                    <p className="text-xs text-[#8B8B82]">속을 추가하고, 이름을 수정하며, 각 속의 모임 멤버를 관리할 수 있습니다.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSokManageModal(false)}
                  className="p-1.5 text-[#8B8B82] hover:text-[#55554E] rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Add New Sok Form */}
              <form onSubmit={handleCreateSok} className="bg-[#FBFBEF] border border-[#E7E5D8] p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-[#00311F] flex items-center gap-1">
                  <Plus size={14} className="text-[#0B5C3C]" />
                  새 속(소그룹) 추가
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="속 이름 (예: 1속, 청년1속, 사랑속)"
                    value={newSokName}
                    onChange={(e) => setNewSokName(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-[#E7E5D8] rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5C3C]"
                  />
                  <input
                    type="text"
                    placeholder="속 설명 (선택)"
                    value={newSokDesc}
                    onChange={(e) => setNewSokDesc(e.target.value)}
                    className="text-xs p-2.5 bg-white border border-[#E7E5D8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B5C3C]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0B5C3C] hover:bg-[#004A2E] text-white font-bold text-xs rounded-2xl shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} />
                    속 추가하기
                  </button>
                </div>
              </form>

              {/* Existing Soks List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#00311F]">개설된 속 목록 ({sokGroups.length}개)</h3>
                {sokGroups.length === 0 ? (
                  <p className="text-xs text-[#8B8B82] py-4 text-center border border-dashed border-[#E7E5D8] rounded-2xl">
                    아직 생성된 속이 없습니다. 위에서 속을 추가해 보세요!
                  </p>
                ) : (
                  sokGroups.map((sok) => {
                    const isEditing = editingSokId === sok.id;
                    const isMemberSettingsOpen = activeSokMemberSettingsId === sok.id;
                    const membersCount = sok.memberUserIds?.length || 0;

                    return (
                      <div key={sok.id} className="bg-white border border-[#E7E5D8] rounded-2xl p-4 space-y-3 shadow-xs">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingSokName}
                                onChange={(e) => setEditingSokName(e.target.value)}
                                className="text-xs p-2 border border-[#E7E5D8] rounded-xl font-bold flex-1"
                                placeholder="속 이름"
                              />
                              <input
                                type="text"
                                value={editingSokDesc}
                                onChange={(e) => setEditingSokDesc(e.target.value)}
                                className="text-xs p-2 border border-[#E7E5D8] rounded-xl flex-1"
                                placeholder="설명"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingSokId(null)}
                                className="px-3 py-1 text-xs border border-[#E7E5D8] rounded-xl cursor-pointer"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRenameSok(sok.id)}
                                className="px-3 py-1 text-xs bg-[#0B5C3C] text-white font-bold rounded-xl cursor-pointer"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#00311F]">{sok.name}</span>
                                <span className="text-2xs bg-[#E4F1E7] text-[#00311F] px-2 py-0.5 rounded-full font-semibold">
                                  구성원 {membersCount}명
                                </span>
                              </div>
                              {sok.description && (
                                <p className="text-xs text-[#8B8B82] mt-0.5">{sok.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setActiveSokMemberSettingsId(isMemberSettingsOpen ? null : sok.id);
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-2xl transition flex items-center gap-1 cursor-pointer ${
                                  isMemberSettingsOpen
                                    ? "bg-[#00311F] text-white"
                                    : "bg-[#F4F2E6] hover:bg-[#E4F1E7] text-[#00311F]"
                                }`}
                              >
                                <UserPlus size={13} />
                                <span>구성원 지정</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSokId(sok.id);
                                  setEditingSokName(sok.name);
                                  setEditingSokDesc(sok.description || "");
                                }}
                                className="p-1.5 text-[#8B8B82] hover:text-[#0B5C3C] hover:bg-[#F4F2E6] rounded-xl transition cursor-pointer"
                                title="이름 수정"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteSok(sok.id)}
                                className="p-1.5 text-[#8B8B82] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="속 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Member assignment dropdown panel */}
                        {isMemberSettingsOpen && (
                          <div className="bg-[#FBFBEF] border border-[#E7E5D8] rounded-2xl p-3 space-y-2.5 mt-2">
                            <div className="flex items-center justify-between text-xs font-bold text-[#00311F]">
                              <span>속 구성원 지정 ({sok.name})</span>
                              <span className="text-2xs text-[#8B8B82] font-normal">
                                체크된 지체만 이 속의 묵상 글을 읽고 올릴 수 있습니다.
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {allUsers.map((u) => {
                                const isMember = sok.memberUserIds?.includes(u.id);
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => handleToggleSokMember(sok.id, u.id)}
                                    className={`flex items-center gap-2 p-2 rounded-2xl text-xs font-semibold border cursor-pointer select-none transition ${
                                      isMember
                                        ? "bg-white border-[#0B5C3C] text-[#00311F] shadow-xs"
                                        : "bg-white/50 border-[#E7E5D8] text-[#8B8B82] hover:bg-white"
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                                        isMember ? "bg-[#0B5C3C] border-[#0B5C3C] text-white" : "border-slate-300"
                                      }`}
                                    >
                                      {isMember && <Check size={11} />}
                                    </div>
                                    <span className="truncate">{u.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-[#E7E5D8]">
                <button
                  onClick={() => setShowSokManageModal(false)}
                  className="px-5 py-2 bg-[#00311F] text-white font-bold text-xs rounded-2xl hover:bg-[#002517] transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
