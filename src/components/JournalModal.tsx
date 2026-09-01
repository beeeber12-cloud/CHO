import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Lock, Plus, X, Pencil, Trash2, Heart, HandHeart, ArrowLeft
} from "lucide-react";
import { JournalEntry } from "../types";
import { possessiveTitle } from "../lib/koreanName";

/**
 * 개인 영성일기.
 *
 * 묵상 나눔과 생김새는 같지만 **아무에게도 공유되지 않는다.**
 * 서버도 로그인한 본인 것만 돌려주므로, 남의 일기는 애초에 내려오지 않는다.
 */

interface Props {
  currentUser: { id: string; name: string };
  onClose: () => void;
}

const empty = { id: "", date: "", verseTitle: "", title: "", content: "", prayer: "" };

export default function JournalModal({ currentUser, onClose }: Props) {
  const [list, setList] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/journals");
      if (res.ok) setList(await res.json());
    } catch {
      // 화면은 그대로 두고 조용히 넘어간다
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const today = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

  const openNew = () => {
    setForm({ ...empty, date: today() });
    setError("");
    setWriting(true);
  };

  const openEdit = (j: JournalEntry) => {
    setForm({
      id: j.id,
      date: j.date,
      verseTitle: j.verseTitle || "",
      title: j.title || "",
      content: j.content || "",
      prayer: j.prayer || ""
    });
    setError("");
    setWriting(true);
  };

  const save = async () => {
    if (!form.content.trim()) {
      setError("내용을 적어주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(form.id ? `/api/journals/${form.id}` : "/api/journals", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장하지 못했습니다.");
        return;
      }
      await load();
      setWriting(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (j: JournalEntry) => {
    if (!confirm("이 일기를 지울까요?\n지우면 되돌릴 수 없습니다.")) return;
    setBusy(true);
    try {
      await fetch(`/api/journals/${j.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleMark = async (j: JournalEntry, type: "like" | "pray") => {
    try {
      const res = await fetch(`/api/journals/${j.id}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        const updated: JournalEntry = await res.json();
        setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
    } catch {
      // 무시
    }
  };

  const marked = (j: JournalEntry, type: "like" | "pray") =>
    (j.marks?.[type] || []).includes(currentUser.id);

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F0F0F0] w-full sm:max-w-2xl rounded-[32px] mx-2 sm:mx-0 mb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:mb-0 max-h-[76vh] sm:max-h-[86vh] flex flex-col overflow-hidden"
      >
        {/* 머리 */}
        <div className="bg-white px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-2xl shrink-0">
                <Lock size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#0C3B2E] text-lg leading-tight">
                  {possessiveTitle(currentUser.name, "영성일기")}
                </h3>
                <p className="text-2xs text-[#6F8377]">나만 보는 방입니다</p>
              </div>
            </div>
            <button
              onClick={writing ? () => setWriting(false) : onClose}
              className="p-2 rounded-2xl text-[#6F8377] hover:bg-[#F5F5F5] transition cursor-pointer shrink-0"
            >
              {writing ? <ArrowLeft size={18} /> : <X size={18} />}
            </button>
          </div>

          {!writing && (
            <p className="text-xs text-[#4A6B57] leading-relaxed mt-3 bg-[#F5F5F5] rounded-2xl p-3">
              하나님이 주신 마음과 은혜의 순간을 기록하는
              <br />
              <strong className="text-[#0C3B2E]">오직 나만 볼 수 있는 공간</strong>입니다.
              <br />
              하나님과의 친밀함을 하나씩 채워가 보세요.
            </p>
          )}
        </div>

        {/* 몸통 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {writing ? (
            <div className="bg-white rounded-3xl p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#4A6B57] mb-1">날짜</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5F5F5] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A6B57] mb-1">내용</label>
                <textarea
                  rows={14}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="성령님이 주신 마음, 느낌, 꿈, 하나님과 나눈 것들을 자유롭게 적어보세요."
                  className="w-full px-3 py-2.5 bg-[#F5F5F5] rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
                />
              </div>

              {error && <p className="text-xs text-[#8F1E17]">{error}</p>}
            </div>
          ) : loading ? (
            <p className="text-center text-xs text-[#6F8377] py-8">불러오는 중...</p>
          ) : list.length === 0 ? (
            <div className="text-center py-10">
              <Lock className="mx-auto text-[#AFC0B2] mb-3" size={34} />
              <p className="text-sm text-[#4A6B57] font-semibold">아직 적어둔 일기가 없습니다</p>
              <p className="text-xs text-[#6F8377] mt-1">
                오늘 받은 마음 한 줄부터 시작해 보세요.
              </p>
            </div>
          ) : (
            list.map((j) => (
              <div key={j.id} className="bg-white rounded-3xl p-5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <span className="text-2xs text-[#6F8377]">
                      {j.date}
                      {j.updatedAt && " · 수정함"}
                    </span>
                    {j.title && (
                      <h4 className="font-bold text-[#0C3B2E] leading-snug">{j.title}</h4>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => openEdit(j)}
                      className="p-2 rounded-2xl text-[#6F8377] hover:bg-[#F5F5F5] transition cursor-pointer"
                      title="고치기"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(j)}
                      disabled={busy}
                      className="p-2 rounded-2xl text-[#AFC0B2] hover:text-[#8F1E17] hover:bg-[#FDF3F3] transition cursor-pointer"
                      title="지우기"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {j.verseTitle && (
                  <p className="text-xs font-bold text-[#4A6B57] mb-2">📖 {j.verseTitle}</p>
                )}

                {j.content && (
                  <p className="text-sm text-[#14261E] leading-relaxed whitespace-pre-line">
                    {j.content}
                  </p>
                )}

                {j.prayer && (
                  <div className="mt-3 bg-[#F5F5F5] rounded-2xl p-3">
                    <span className="block text-2xs font-bold text-[#6F8377] mb-1">기도제목</span>
                    <p className="text-xs text-[#4A6B57] leading-relaxed whitespace-pre-line">
                      {j.prayer}
                    </p>
                  </div>
                )}

                {/* 나만 보는 표시 */}
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#F0F0F0]">
                  <button
                    onClick={() => toggleMark(j, "like")}
                    className={`flex items-center gap-1 text-2xs font-bold px-3 py-1.5 rounded-3xl transition cursor-pointer ${
                      marked(j, "like")
                        ? "bg-[#0C3B2E] text-white"
                        : "bg-[#F5F5F5] text-[#6F8377] hover:bg-[#D2DDD3]"
                    }`}
                  >
                    <Heart size={12} className={marked(j, "like") ? "fill-current" : ""} />
                    좋아요
                  </button>
                  <button
                    onClick={() => toggleMark(j, "pray")}
                    className={`flex items-center gap-1 text-2xs font-bold px-3 py-1.5 rounded-3xl transition cursor-pointer ${
                      marked(j, "pray")
                        ? "bg-[#0C3B2E] text-white"
                        : "bg-[#F5F5F5] text-[#6F8377] hover:bg-[#D2DDD3]"
                    }`}
                  >
                    <HandHeart size={12} />
                    기도할게요
                  </button>
                  <span className="text-2xs text-[#AFC0B2] self-center ml-1">나만 보는 표시</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 아래 버튼 — 늘 보이도록 고정 */}
        <div className="shrink-0 bg-white px-5 py-4 border-t border-[#E3E9E2] flex gap-2">
          {writing ? (
            <>
              <button
                onClick={() => setWriting(false)}
                className="flex-1 py-3 rounded-3xl bg-[#F5F5F5] text-[#4A6B57] text-sm font-bold cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 py-3 rounded-3xl bg-[#0C3B2E] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
              >
                {busy ? "저장 중..." : form.id ? "고쳐 저장" : "저장"}
              </button>
            </>
          ) : (
            <button
              onClick={openNew}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-3xl bg-[#0C3B2E] text-white text-sm font-bold cursor-pointer"
            >
              <Plus size={16} />
              오늘의 일기 쓰기
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
