import React, { useState, useEffect, useRef } from "react";
import { Meditation, Comment, SokGroup } from "../types";
import { MessageSquare, Heart, Edit2, Trash2, Send, Plus, Search, BookOpen, Clock, PenTool, X, ShieldAlert, Bell, Radio, CheckCircle, Users, Globe, Settings, UserPlus, Check, Edit3, Lock } from "lucide-react";
import JournalModal from "./JournalModal";
import { possessiveTitle } from "../lib/koreanName";
import { motion, AnimatePresence } from "motion/react";
import { enablePush, isPushEnabled } from "../lib/push";
import ReactionBar from "./ReactionBar";
import CollapsibleText from "./CollapsibleText";
import MentionText from "./MentionText";
import MentionPicker from "./MentionPicker";
import { appendMention } from "../lib/mentions";
import { splitLeadingVerses } from "../lib/verseRef";
import { subscribeToDataChanges } from "../lib/revision";



/** "2026-09-02" 또는 ISO 시각 → "9월 2일" (시안의 .post-date 형식) */
const shortDate = (value: string): string => {
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${Number(ymd[2])}월 ${Number(ymd[3])}일`;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

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
  /** 나만 보는 영성일기 창 */
  const [showJournal, setShowJournal] = useState<boolean>(false);

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
  // "granted" = 이 기기가 실제로 푸시를 구독한 상태 (권한만 있고 구독이 없으면 버튼을 계속 보여줘야 한다)
  const [notiPermission, setNotiPermission] = useState<string>("default");

  useEffect(() => {
    isPushEnabled().then((on) => setNotiPermission(on ? "granted" : "default"));
  }, []);

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

  /**
   * 쓰다 만 글을 기기에 남겨 둔다.
   *
   * 묵상을 쓰다가 실수로 다른 탭으로 넘어가면 이 화면은 통째로 사라진다(React 가 지운다).
   * 그때 쓰던 글도 같이 날아가서, 처음부터 다시 쓰셔야 했다.
   * 이제는 글자를 칠 때마다 기기에 적어 두었다가, 다시 들어오면 그대로 되살린다.
   * 올리고 나면(또는 '취소'를 누르면) 지운다.
   */
  const DRAFT_KEY = `cho_med_draft_${currentUser.id}`;
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const draftReady = useRef<boolean>(false);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* 저장 공간이 막힌 기기 — 그냥 넘어간다 */
    }
    setHasDraft(false);
  };

  // 들어오자마자 쓰던 글이 있으면 되살린다 (창은 열지 않는다 — 누르면 그 안에 그대로 있다)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const filled = [d?.verseTitle, d?.content, d?.prayer].some(
          (v) => typeof v === "string" && v.trim()
        );
        if (filled) {
          setVerseTitle(d.verseTitle || "");
          setContent(d.content || "");
          setPrayer(d.prayer || "");
          setSokIdForForm(d.sokId ?? null);
          setEditingId(d.editingId ?? null);
          setHasDraft(true);
        }
      }
    } catch {
      /* 남은 글이 깨져 있으면 없는 셈 친다 */
    }
    draftReady.current = true;
  }, []);

  // 글자를 칠 때마다 기기에 적어 둔다
  useEffect(() => {
    if (!draftReady.current) return;
    const filled = [verseTitle, content, prayer].some((v) => v.trim());
    try {
      if (filled) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ verseTitle, content, prayer, sokId: sokIdForForm, editingId })
        );
        setHasDraft(true);
      } else {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      }
    } catch {
      /* 저장 공간이 막힌 기기 — 화면은 그대로 쓰신다 */
    }
  }, [verseTitle, content, prayer, sokIdForForm, editingId]);

  // Comments state - maps meditationId to its current comment input string
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // "@이름" 으로 부를 수 있는 지체들
  const memberNames = allUsers.map((u) => u.name);
  const otherMemberNames = allUsers.filter((u) => u.id !== currentUser.id).map((u) => u.name);

  // Filter state
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  useEffect(() => {
    fetchMeditations(true);
    fetchSokGroups();

    // 바뀐 게 있을 때만 다시 받아온다 (전에는 4초마다 목록 전체를 내려받았다)
    const unsubscribe = subscribeToDataChanges(() => {
      fetchMeditations(false);
      fetchSokGroups();
    });

    // Window focus instant sync listener
    const handleFocus = () => {
      fetchMeditations(false);
      fetchSokGroups();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
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
      setTitle(`${prefilledVerse.title} 말씀을 묵상하며`);
      // 고른 구절을 먼저 넣고 한 줄 띄워, 그 아래에 묵상을 이어 쓰게 한다.
      // (보여줄 때 앞머리의 구절만 굵게 표시한다)
      // 쓰다 만 글이 있으면 지우지 않고 그 위에 구절만 얹는다 — 쓴 글을 잃지 않도록.
      setContent((prev) => {
        const head = `${prefilledVerse.text}\n\n`;
        return prev.trim() ? head + prev : head;
      });
      setShowWriteForm(true);
      setEditingId(null);
      if (onClearPrefilledVerse) {
        onClearPrefilledVerse();
      }
    }
  }, [prefilledVerse]);

  const requestNotificationPermission = async () => {
    // 앱을 닫아둬도 오는 진짜 푸시로 등록한다.
    const res = await enablePush(currentUser.id);
    if (res.ok) {
      setNotiPermission("granted");
      setRealtimeToast("🔔 알림이 켜졌습니다. 이제 앱을 닫아두셔도 새 소식을 받아보실 수 있어요.");
      setTimeout(() => setRealtimeToast(null), 4000);
    } else {
      setRealtimeToast(res.message || "알림을 켜지 못했습니다.");
      setTimeout(() => setRealtimeToast(null), 7000);
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
    if (!verseTitle.trim() || !content.trim()) {
      setFormError("말씀 구절과 묵상 내용을 채워 주세요.");
      return;
    }
    // 제목 입력칸은 없앴다. 알림·목록 표기에 쓰이므로 구절명으로 자동 생성한다.
    const autoTitle = `${verseTitle.trim()} 묵상`;

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
          title: autoTitle,
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
        clearDraft(); // 올렸으니 기기에 남겨 둔 초안도 지운다
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
      {/* Page title — 다른 탭(오늘의 말씀·감사칭찬)과 같은 자리에 같은 형식으로 둔다 */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0C3B2E]">묵상 나눔</h2>
        <p className="text-xs sm:text-sm text-[#6F8377] mt-0.5">오늘 받은 은혜를 함께 나눠요</p>
      </div>

      {/* Real-time Toast Popup Banner */}
      <AnimatePresence>
        {realtimeToast && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-[#0C3B2E] text-white p-3.5 rounded-3xl shadow-xl flex items-center justify-between gap-3 relative z-30"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#4A6B57] rounded-3xl text-white animate-bounce shrink-0">
                <Bell size={16} />
              </div>
              <p className="text-xs font-semibold leading-relaxed text-[#F5F5F5]">
                {realtimeToast}
              </p>
            </div>
            <button
              onClick={() => setRealtimeToast(null)}
              className="p-1 hover:bg-[#072A20] text-[#AFC0B2] hover:text-white rounded-xl transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* '새 묵상 알림 켜기' 버튼은 뺐다 (2026-09-04) — 알림은 설정 → 알림에서 켠다 */}

      {/* 글쓰기 버튼 — 왼쪽은 공동체에 나누는 묵상(신약/진초록 톤), 오른쪽은 나만 보는 일기(구약/청록 톤).
          시안처럼 두 버튼이 같은 너비로 한 줄 전체를 나눠 쓴다 */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowWriteForm(!showWriteForm);
            setEditingId(null);
            setFormError("");
          }}
          className="grad-forest flex-1 flex items-center justify-center gap-1.5 text-white font-bold text-sm px-3.5 py-3 rounded-3xl transition cursor-pointer whitespace-nowrap hover:brightness-110"
        >
          {showWriteForm ? <X size={15} /> : <Plus size={15} />}
          {/* 쓰다 만 글이 남아 있으면 '이어쓰기'라고 알려 준다 */}
          {showWriteForm ? "닫기" : hasDraft ? "묵상 이어쓰기" : "묵상 나누기"}
        </button>
        <button
          onClick={() => setShowJournal(true)}
          className="grad-teal flex-1 flex items-center justify-center gap-1.5 text-white font-bold text-sm px-3.5 py-3 rounded-3xl transition cursor-pointer whitespace-nowrap hover:brightness-110"
        >
          <Lock size={15} />
          {possessiveTitle(currentUser.name, "영성일기")}
        </button>
      </div>

      {/* 방 고르기 — 시안의 .room-filter: 감싸는 상자 없이 작은 알약만 한 줄로 */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {/* Public All Tab */}
        <button
          onClick={() => setSelectedSokTab("all")}
          className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedSokTab === "all"
              ? "grad-forest text-white"
              : "bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0]"
          }`}
        >
          전체
        </button>

        {/* User's Soks */}
        {accessibleSoks.map((sok) => {
          const isSelected = selectedSokTab === sok.id;
          return (
            <button
              key={sok.id}
              onClick={() => setSelectedSokTab(sok.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "grad-forest text-white"
                  : "bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0]"
              }`}
            >
              {sok.name}
            </button>
          );
        })}

        {/* Admin / Sok Manage Button */}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowSokManageModal(true)}
            className="shrink-0 flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold text-[#6F8377] bg-[#F9F9F9] hover:bg-[#F0F0F0] transition cursor-pointer"
            title="속(소그룹) 추가, 이름 변경 및 구성원 관리"
          >
            <Settings size={12} />
            <span>속 관리</span>
          </button>
        )}
      </div>

      {showJournal && (
        <JournalModal currentUser={currentUser} onClose={() => setShowJournal(false)} />
      )}

      {/* Expandable Write/Edit Form */}
      <AnimatePresence>
        {showWriteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6 space-y-3.5">
              <h3 className="text-base font-bold text-[#0C3B2E] flex items-center">
                <PenTool className="mr-1.5 text-[#4A6B57]" size={18} />
                {editingId ? "내 묵상 글 수정하기" : "오늘의 묵상 글 작성"}
              </h3>

              {formError && (
                <div className="bg-[#FDF3F3] text-[#8F1E17] text-xs p-3 rounded-3xl flex items-center">
                  <ShieldAlert className="mr-1.5" size={16} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6F8377] mb-1">묵상 말씀 구절</label>
                  <input
                    type="text"
                    required
                    value={verseTitle}
                    onChange={(e) => setVerseTitle(e.target.value)}
                    placeholder="예: 이사야 41:10 (또는 위 공지 클릭)"
                    className="w-full text-sm px-3.5 py-3 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] font-semibold"
                  />
                </div>

              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F8377] mb-1">묵상 고백 및 나누고 싶은 내용</label>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="말씀을 묵상하며 깨달은 생각, 삶의 적용, 소그룹 식구들과 나누고픈 은혜를 정성스럽게 적어보세요..."
                  className="w-full text-sm px-3.5 py-3 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] leading-relaxed"
                />
                <MentionPicker
                  names={otherMemberNames}
                  onPick={(name) => setContent((prev) => appendMention(prev, name))}
                  compact
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F8377] mb-1">오늘 나의 기도 제목 (선택)</label>
                <textarea
                  rows={2}
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  placeholder="소그룹 지체들과 함께 기도하고 싶은 주간 기도제목을 기입해주세요..."
                  className="w-full text-sm px-3.5 py-3 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6F8377] mb-1">
                  나눔 범위 선택 (속 모임 / 전체 공유)
                </label>
                <select
                  value={sokIdForForm || ""}
                  onChange={(e) => setSokIdForForm(e.target.value || null)}
                  className="w-full text-sm px-3.5 py-3 bg-white border-2 border-[#0C3B2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57] text-[#14261E] font-bold cursor-pointer"
                >
                  <option value="">🌐 전체 공유 (우리 공동체 모두와 나눔)</option>
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
                    // '취소'는 쓰던 글을 버리겠다는 뜻이다 — 되돌릴 수 없으니 한 번 여쭙는다.
                    // (그냥 접어두고 싶으실 때는 위의 '닫기'를 누르시면 글이 그대로 남는다)
                    const filled = [verseTitle, content, prayer].some((v) => v.trim());
                    if (filled && !confirm("쓰시던 글을 지우고 닫을까요?\n(그냥 접어두시려면 위의 '닫기'를 눌러 주세요 — 글은 그대로 남습니다)")) {
                      return;
                    }
                    setVerseTitle("");
                    setContent("");
                    setPrayer("");
                    setSokIdForForm(null);
                    setShowWriteForm(false);
                    setEditingId(null);
                    setFormError("");
                    clearDraft();
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-3xl text-[#4A6B57] bg-white hover:bg-[#F5F5F5] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-bold rounded-3xl text-white bg-[#4A6B57] hover:bg-[#072A20] shadow-md transition cursor-pointer"
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
          <div className="bg-white rounded-[32px] p-12 text-center text-[#6F8377]">
            <Clock className="animate-spin mx-auto text-[#4A6B57] mb-2" size={24} />
            <p className="text-sm">묵상 나눔을 가져오고 있습니다...</p>
          </div>
        ) : filteredMeditations.length > 0 ? (
          filteredMeditations.map((med) => {
            const hasLiked = med.likes.includes(currentUser.id);
            const isMyMed = med.userId === currentUser.id;
            const commentsOpen = expandedComments[med.id] || false;
            // 앞머리의 골라 온 성경 구절만 갈라내어 굵게 보여준다 (상자는 하나 그대로)
            const { quote: medQuote, body: medBody } = splitLeadingVerses(med.content);

            return (
              <motion.div
                key={med.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#F9F9F9] rounded-[22px] p-5 space-y-3 transition-all duration-300"
              >
                {/* Header — 이름 / 날짜 · 방 배지 (시안의 .post-head) */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    {/* 이름은 카드에서 가장 먼저 읽히는 것 — 넉넉히 크게 */}
                    <span className="block text-[0.97rem] font-bold text-[#14261E] leading-[1.3]">
                      {med.userName}
                    </span>
                    <span className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-[#6F8377]">{shortDate(med.date || med.createdAt)}</span>
                      {med.sokId ? (
                        <span className="text-xs font-bold text-[#4A6B57] bg-[#D2DDD3] px-2 py-0.5 rounded-full">
                          {sokGroups.find(s => s.id === med.sokId)?.name || "속 나눔"}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#4A6B57] bg-[#D2DDD3] px-2 py-0.5 rounded-full">
                          전체
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions for owner */}
                  {isMyMed && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditClick(med)}
                        className="p-1.5 text-[#6F8377] hover:text-[#4A6B57] hover:bg-white rounded-xl transition cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="p-1.5 text-[#6F8377] hover:text-[#B3261E] hover:bg-white rounded-xl transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 성경 구절 — 시안의 .post-verse (본문 위에 한 줄로) */}
                {med.verseTitle && (
                  <p className="text-[0.88rem] font-bold text-[#4A6B57]">{med.verseTitle}</p>
                )}

                {/* Content body (제목 없이 본문만) — 앞머리의 골라 온 성경 구절만
                    굵고 진하게 해서 내 묵상과 구별한다. 카드 배경 위에 그대로 놓는다.
                    긴 글은 접어 둔다 — 안 그러면 다음 지체 묵상까지 한참 내려가야 한다. */}
                <CollapsibleText fadeColor="#F9F9F9">
                  {medQuote && (
                    <p className="text-[0.88rem] font-bold text-[#0C3B2E] leading-[1.6] whitespace-pre-line">
                      {medQuote}
                    </p>
                  )}
                  {medBody && (
                    <MentionText
                      text={medBody}
                      names={memberNames}
                      className={`text-[0.92rem] text-[#14261E] leading-[1.62] whitespace-pre-line ${
                        medQuote ? "mt-2" : ""
                      }`}
                    />
                  )}
                </CollapsibleText>


                {/* 기도제목 */}
                {med.prayer && (
                  <div className="bg-white rounded-3xl p-4 text-[0.88rem] space-y-2">
                    <span className="font-bold text-[#0C3B2E] block">기도제목</span>
                    <CollapsibleText collapsedHeight={110} fadeColor="#FFFFFF">
                      <MentionText
                        text={`"${med.prayer}"`}
                        names={memberNames}
                        className="text-[#4A6B57] leading-relaxed font-medium italic whitespace-pre-line"
                      />
                    </CollapsibleText>

                    {/* 글쓴이에게만: 몇 명이 함께 기도했는지 */}
                    {isMyMed && (med.reactions?.pray?.length || 0) > 0 && (
                      <p className="text-xs font-bold text-[#0C3B2E] bg-[#E8F0E9] ring-1 ring-[#C3D6C6] rounded-3xl px-3 py-2">
                        {med.reactions!.pray!.length}명이 당신을 위해 기도했습니다 🙏
                      </p>
                    )}
                  </div>
                )}

                {/* 반응 + 댓글 (같은 줄에 나란히) */}
                <div className="flex items-center gap-4 pt-1 flex-wrap">
                  <ReactionBar
                    reactions={med.reactions}
                    currentUserId={currentUser.id}
                    endpointBase={`/api/meditations/${med.id}`}
                    onUpdated={(updated) =>
                      setMeditations((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
                    }
                  />

                  <button
                    onClick={() => toggleCommentsExpanded(med.id)}
                    className={`flex items-center gap-1 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      commentsOpen ? "text-[#4A6B57]" : "text-[#6F8377] hover:text-[#4A6B57]"
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span>댓글</span>
                    {med.comments.length > 0 && (
                      <span className="tabular-nums">{med.comments.length}</span>
                    )}
                  </button>
                </div>

                {/* Comments Thread Section */}
                {commentsOpen && (
                  <div className="bg-white rounded-3xl p-4 space-y-3 mt-2">
                    {/* List existing comments */}
                    {med.comments.length > 0 ? (
                      <div className="space-y-2.5">
                        {med.comments.map((comment) => {
                          const isMyComment = comment.userId === currentUser.id;
                          return (
                            <div key={comment.id} className="flex justify-between items-start gap-2 bg-white/80 p-3 rounded-3xl">
                              <div className="text-[0.88rem]">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <strong className="font-bold text-[#0C3B2E]">{comment.userName}</strong>
                                  <span className="text-xs text-[#6F8377]">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <MentionText
                                  text={comment.content}
                                  names={memberNames}
                                  className="text-[#4A6B57] leading-relaxed font-medium whitespace-pre-line"
                                />
                              </div>

                              {isMyComment && (
                                <button
                                  onClick={() => handleDeleteComment(med.id, comment.id)}
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
                        첫 댓글을 달아 묵상에 대한 은혜를 나눠보세요! 💬
                      </p>
                    )}

                    {/* New comment input */}
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[med.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [med.id]: e.target.value }))}
                          placeholder="은혜로운 지지와 나눔의 말을 기입하세요..."
                          className="flex-1 text-sm px-3.5 py-2.5 bg-[#F5F5F5] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4A6B57] text-[#14261E]"
                        />
                        <button
                          onClick={() => handleAddComment(med.id)}
                          className="px-3 bg-[#4A6B57] hover:bg-[#072A20] text-white rounded-xl transition flex items-center justify-center cursor-pointer"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                      <MentionPicker
                        names={otherMemberNames}
                        onPick={(name) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [med.id]: appendMention(prev[med.id] || "", name)
                          }))
                        }
                        compact
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="bg-[#F5F5F5] rounded-[32px] p-12 text-center text-[#6F8377]">
            <BookOpen className="mx-auto text-[#6F8377] mb-2" size={32} />
            <p className="text-sm font-semibold text-[#4A6B57]">아직 조건에 맞는 묵상 나눔 글이 없습니다.</p>
            <p className="text-xs text-[#6F8377] mt-1">지체 중 첫 번째로 묵상 고백을 올려보세요!</p>
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
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl font-bold">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0C3B2E]">속(소그룹) 관리 및 구성원 설정</h2>
                    <p className="text-xs text-[#6F8377]">속을 추가하고, 이름을 수정하며, 각 속의 모임 멤버를 관리할 수 있습니다.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSokManageModal(false)}
                  className="p-1.5 text-[#6F8377] hover:text-[#4A6B57] rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Add New Sok Form */}
              <form onSubmit={handleCreateSok} className="bg-[#F0F0F0] p-4 rounded-3xl space-y-3">
                <h3 className="text-xs font-bold text-[#0C3B2E] flex items-center gap-1">
                  <Plus size={14} className="text-[#4A6B57]" />
                  새 속(소그룹) 추가
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="속 이름 (예: 1속, 청년1속, 사랑속)"
                    value={newSokName}
                    onChange={(e) => setNewSokName(e.target.value)}
                    className="text-xs p-2.5 bg-[#F5F5F5] rounded-3xl font-bold focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
                  />
                  <input
                    type="text"
                    placeholder="속 설명 (선택)"
                    value={newSokDesc}
                    onChange={(e) => setNewSokDesc(e.target.value)}
                    className="text-xs p-2.5 bg-[#F5F5F5] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4A6B57] hover:bg-[#072A20] text-white font-bold text-xs rounded-3xl shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} />
                    속 추가하기
                  </button>
                </div>
              </form>

              {/* Existing Soks List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#0C3B2E]">개설된 속 목록 ({sokGroups.length}개)</h3>
                {sokGroups.length === 0 ? (
                  <p className="text-xs text-[#6F8377] py-4 text-center bg-[#F5F5F5] rounded-3xl">
                    아직 생성된 속이 없습니다. 위에서 속을 추가해 보세요!
                  </p>
                ) : (
                  sokGroups.map((sok) => {
                    const isEditing = editingSokId === sok.id;
                    const isMemberSettingsOpen = activeSokMemberSettingsId === sok.id;
                    const membersCount = sok.memberUserIds?.length || 0;

                    return (
                      <div key={sok.id} className="bg-[#F5F5F5] rounded-3xl p-4 space-y-3 shadow-xs">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingSokName}
                                onChange={(e) => setEditingSokName(e.target.value)}
                                className="text-xs p-2 bg-[#F5F5F5] rounded-xl font-bold flex-1"
                                placeholder="속 이름"
                              />
                              <input
                                type="text"
                                value={editingSokDesc}
                                onChange={(e) => setEditingSokDesc(e.target.value)}
                                className="text-xs p-2 bg-[#F5F5F5] rounded-xl flex-1"
                                placeholder="설명"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingSokId(null)}
                                className="px-3 py-1 text-xs bg-[#F5F5F5] rounded-xl cursor-pointer"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRenameSok(sok.id)}
                                className="px-3 py-1 text-xs bg-[#4A6B57] text-white font-bold rounded-xl cursor-pointer"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#0C3B2E]">{sok.name}</span>
                                <span className="text-2xs bg-[#F5F5F5] text-[#0C3B2E] px-2 py-0.5 rounded-full font-semibold">
                                  구성원 {membersCount}명
                                </span>
                              </div>
                              {sok.description && (
                                <p className="text-xs text-[#6F8377] mt-0.5">{sok.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setActiveSokMemberSettingsId(isMemberSettingsOpen ? null : sok.id);
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-3xl transition flex items-center gap-1 cursor-pointer ${
                                  isMemberSettingsOpen
                                    ? "bg-[#0C3B2E] text-white"
                                    : "bg-[#F5F5F5] hover:bg-[#F5F5F5] text-[#0C3B2E]"
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
                                className="p-1.5 text-[#6F8377] hover:text-[#4A6B57] hover:bg-[#F5F5F5] rounded-xl transition cursor-pointer"
                                title="이름 수정"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteSok(sok.id)}
                                className="p-1.5 text-[#6F8377] hover:text-[#B3261E] hover:bg-[#FDF3F3] rounded-xl transition cursor-pointer"
                                title="속 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Member assignment dropdown panel */}
                        {isMemberSettingsOpen && (
                          <div className="bg-[#F5F5F5] rounded-3xl p-3 space-y-2.5 mt-2">
                            <div className="flex items-center justify-between text-xs font-bold text-[#0C3B2E]">
                              <span>속 구성원 지정 ({sok.name})</span>
                              <span className="text-2xs text-[#6F8377] font-normal">
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
                                    className={`flex items-center gap-2 p-2 rounded-3xl text-xs font-semibold cursor-pointer select-none transition ${
                                      isMember
                                        ? "bg-white text-[#0C3B2E] shadow-xs"
                                        : "bg-white/50 text-[#6F8377] hover:bg-white"
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded-lg flex items-center justify-center border transition ${
                                        isMember ? "bg-[#4A6B57] border-[#4A6B57] text-white" : "border-[#AFC0B2]"
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

              <div className="flex justify-end pt-2 border-t border-[#E3E9E2]">
                <button
                  onClick={() => setShowSokManageModal(false)}
                  className="px-5 py-2 bg-[#0C3B2E] text-white font-bold text-xs rounded-3xl hover:bg-[#072A20] transition cursor-pointer"
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
