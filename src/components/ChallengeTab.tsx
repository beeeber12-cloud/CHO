import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Trophy, Users, CalendarDays, BookOpen, Plus, Check, Settings2, Flag, Trash2, PartyPopper
} from "lucide-react";
import { ReadingChallenge } from "../types";

/**
 * 성경읽기 챌린지 탭.
 *
 * 진행률은 따로 세지 않는다 — 성경통독에서 '읽음'을 누르면 여기에 바로 반영된다.
 * 그래서 두 곳의 숫자가 어긋날 일이 없다.
 */

interface Props {
  currentUser: { id: string; name: string; role: "admin" | "member" };
  /** 성경통독 탭으로 넘어가 그 장을 펴 준다 */
  onOpenBible?: (query: string) => void;
  /** 챌린지 상태가 바뀌면 탭 구성을 다시 계산하도록 알린다 */
  onChanged?: () => void;
}

interface Progress {
  userId: string;
  name: string;
  done: number;
  total: number;
  percent: number;
  finished: boolean;
  remaining: number[];
}

interface Current {
  challenge: ReadingChallenge | null;
  progress?: Progress[];
  daysLeft?: number;
}

interface BookInfo {
  name: string;
  testament: "OT" | "NT";
  totalChapters: number;
}

export default function ChallengeTab({ currentUser, onOpenBible, onChanged }: Props) {
  const [data, setData] = useState<Current | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [editMembers, setEditMembers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 만들기 화면 입력값
  const [book, setBook] = useState("");
  const [endDate, setEndDate] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [resetProgress, setResetProgress] = useState(true);

  const isAdmin = currentUser.role === "admin";

  const load = async () => {
    try {
      const [c, u, b] = await Promise.all([
        fetch("/api/challenges/current").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/auth/users").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/challenges/books").then((r) => (r.ok ? r.json() : []))
      ]);
      if (c) setData(c);
      if (Array.isArray(u)) setMembers(u);
      if (Array.isArray(b)) setBooks(b);
    } catch {
      // 화면은 그대로 두고 조용히 넘어간다
    }
  };

  useEffect(() => {
    load();
    // 통독에서 읽음을 누르고 돌아왔을 때 바로 반영되도록
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(load, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, []);

  const send = async (url: string, body?: any, method = "POST") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(out.error || "다시 시도해주세요.");
        return null;
      }
      await load();
      onChanged?.();
      return out;
    } finally {
      setBusy(false);
    }
  };

  const challenge = data?.challenge || null;
  const progress = data?.progress || [];
  const mine = progress.find((p) => p.userId === currentUser.id);
  const joined = !!mine;
  const finishedCount = progress.filter((p) => p.finished).length;

  // ── 챌린지가 없을 때 ──────────────────────────────────
  if (!challenge) {
    return (
      <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-6 text-center space-y-4">
        <Trophy className="mx-auto text-[#AFC0B2]" size={40} />
        <div>
          <h3 className="font-bold text-[#0C3B2E] text-lg">진행 중인 챌린지가 없습니다</h3>
          <p className="text-xs text-[#6F8377] mt-1">
            {isAdmin
              ? "성경 한 권과 목표일을 정해 함께 읽어보세요."
              : "관리자가 챌린지를 시작하면 여기에 표시됩니다."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setSetupOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#0C3B2E] text-white text-sm font-bold px-5 py-2.5 rounded-3xl cursor-pointer"
          >
            <Plus size={16} />
            챌린지 시작하기
          </button>
        )}
        {setupOpen && renderSetup()}
      </div>
    );
  }

  const done = challenge.status === "done";

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 머리 — 무엇을, 언제까지 */}
      <div
        className={`rounded-3xl sm:rounded-[32px] shadow-sm p-5 sm:p-6 ${
          done ? "bg-[#0C3B2E] text-white" : "bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {done ? <PartyPopper size={18} /> : <Trophy size={18} className="text-[#4A6B57]" />}
              <h3 className={`font-bold text-lg ${done ? "text-white" : "text-[#0C3B2E]"}`}>
                {challenge.title}
              </h3>
            </div>
            <p className={`text-xs mt-1 ${done ? "text-[#D2DDD3]" : "text-[#6F8377]"}`}>
              {done ? (
                "챌린지를 마쳤습니다. 내일부터 감사·칭찬 탭이 돌아옵니다."
              ) : (
                <>
                  {challenge.book} {challenge.totalChapters}장 · {challenge.endDate}까지
                  {typeof data?.daysLeft === "number" && (
                    <strong className="text-[#0C3B2E]"> (남은 {data.daysLeft}일)</strong>
                  )}
                </>
              )}
            </p>
          </div>
          {isAdmin && !done && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => {
                  setPicked(challenge.participantIds);
                  setEditMembers(true);
                }}
                className="p-2 rounded-2xl bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3] transition cursor-pointer"
                title="참가자 바꾸기"
              >
                <Settings2 size={16} />
              </button>
              <button
                onClick={() => {
                  if (confirm("챌린지를 마칠까요?\n내일부터 감사·칭찬 탭이 돌아옵니다.")) {
                    send(`/api/challenges/${challenge.id}/finish`);
                  }
                }}
                disabled={busy}
                className="p-2 rounded-2xl bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3] transition cursor-pointer"
                title="챌린지 마치기"
              >
                <Flag size={16} />
              </button>
            </div>
          )}
        </div>

        {/* 한눈에 보는 숫자 */}
        <div className={`grid grid-cols-3 gap-2 mt-4 ${done ? "" : ""}`}>
          {[
            { label: "참가", value: `${progress.length}명`, icon: Users },
            { label: "완주", value: `${finishedCount}명`, icon: Check },
            { label: "목표", value: `${challenge.totalChapters}장`, icon: BookOpen }
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl py-2.5 text-center ${done ? "bg-[#0F4A39]" : "bg-[#F5F5F5]"}`}
            >
              <div className={`text-base font-bold ${done ? "text-white" : "text-[#0C3B2E]"}`}>
                {s.value}
              </div>
              <div className={`text-2xs ${done ? "text-[#AFC0B2]" : "text-[#6F8377]"}`}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#8F1E17] bg-[#FDF3F3] rounded-2xl p-3">{error}</p>
      )}

      {/* 나 — 참가 중이면 이어읽기, 아니면 참가 버튼 */}
      {!done && (
        <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-5">
          {joined ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-bold text-[#0C3B2E]">내 진행률</span>
                <span className="text-sm font-bold text-[#4A6B57]">
                  {mine!.done} / {mine!.total}장 · {mine!.percent}%
                </span>
              </div>
              <div className="h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-[#4A6B57] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mine!.percent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {mine!.finished ? (
                <p className="text-xs text-[#4A6B57] font-semibold flex items-center gap-1">
                  <Check size={14} className="stroke-[3px]" />
                  다 읽으셨습니다. 고맙습니다!
                </p>
              ) : (
                <button
                  onClick={() => onOpenBible?.(`${challenge.book} ${mine!.remaining[0]}장`)}
                  className="w-full bg-[#0C3B2E] text-white text-sm font-bold py-3 rounded-3xl cursor-pointer"
                >
                  {challenge.book} {mine!.remaining[0]}장 읽으러 가기
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("챌린지에서 빠지시겠습니까?")) {
                    send(`/api/challenges/${challenge.id}/join`, { leave: true });
                  }
                }}
                disabled={busy}
                className="w-full text-2xs text-[#6F8377] hover:text-[#0C3B2E] mt-2 cursor-pointer"
              >
                그만두기
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#4A6B57] mb-3">
                아직 참가하지 않으셨습니다. 지금 들어오셔도 됩니다.
              </p>
              <button
                onClick={() => send(`/api/challenges/${challenge.id}/join`)}
                disabled={busy}
                className="w-full bg-[#FFBA00] text-[#0C3B2E] text-sm font-bold py-3 rounded-3xl cursor-pointer"
              >
                <Plus size={15} className="inline mr-1" />
                나도 참가하기
              </button>
            </>
          )}
        </div>
      )}

      {/* 지체별 진행률 */}
      <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-5 space-y-3">
        <h4 className="text-sm font-bold text-[#0C3B2E] flex items-center gap-1.5">
          <Users size={16} className="text-[#4A6B57]" />
          지체별 진행률
        </h4>

        {progress.length === 0 ? (
          <p className="text-xs text-[#6F8377]">아직 참가자가 없습니다.</p>
        ) : (
          <div className="space-y-2.5">
            {progress.map((p, i) => (
              <div key={p.userId}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-bold text-[#14261E] flex items-center gap-1">
                    {i === 0 && p.done > 0 && <span aria-hidden>🥇</span>}
                    {p.name}
                    {p.userId === currentUser.id && (
                      <span className="text-2xs text-[#6F8377] font-normal">(나)</span>
                    )}
                    {p.finished && <Check size={12} className="text-[#4A6B57] stroke-[3px]" />}
                  </span>
                  <span className="text-2xs text-[#6F8377]">
                    {p.done}/{p.total}장 · {p.percent}%
                  </span>
                </div>
                <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.finished ? "bg-[#0C3B2E]" : "bg-[#4A6B57]"}`}
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-2xs text-[#6F8377] leading-relaxed pt-1">
          성경통독에서 <strong className="text-[#4A6B57]">읽음</strong>을 누르시면 여기 진행률에 바로 반영됩니다.
        </p>
      </div>

      {editMembers && renderMemberPicker()}
    </div>
  );

  // ── 만들기 화면 ────────────────────────────────────────
  function renderSetup() {
    const nt = books.filter((b) => b.testament === "NT");
    const ot = books.filter((b) => b.testament === "OT");
    return (
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-5">
        <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto text-left">
          <h3 className="font-bold text-lg text-[#0C3B2E] mb-4">챌린지 시작하기</h3>

          <label className="block text-xs font-bold text-[#4A6B57] mb-1.5">읽을 성경</label>
          <select
            value={book}
            onChange={(e) => setBook(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#F5F5F5] rounded-2xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
          >
            <option value="">권을 골라주세요</option>
            <optgroup label="신약">
              {nt.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.totalChapters}장)
                </option>
              ))}
            </optgroup>
            <optgroup label="구약">
              {ot.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.totalChapters}장)
                </option>
              ))}
            </optgroup>
          </select>

          <label className="block text-xs font-bold text-[#4A6B57] mb-1.5">
            <CalendarDays size={13} className="inline mr-1" />
            목표일
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#F5F5F5] rounded-2xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#4A6B57]"
          />

          <label className="block text-xs font-bold text-[#4A6B57] mb-1.5">
            참가자 ({picked.length}명)
          </label>
          {renderMemberList()}

          <label className="flex items-start gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={resetProgress}
              onChange={(e) => setResetProgress(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-2xs text-[#4A6B57] leading-relaxed">
              모두 <strong>0장부터</strong> 시작합니다.
              <span className="text-[#6F8377]">
                {" "}
                (참가자가 이 권에 이미 남긴 읽음 표시를 지웁니다. 다른 권의 통독 기록은 그대로입니다)
              </span>
            </span>
          </label>

          {error && <p className="text-xs text-[#8F1E17] mt-3">{error}</p>}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setSetupOpen(false);
                setError("");
              }}
              className="flex-1 py-3 rounded-3xl bg-[#F5F5F5] text-[#4A6B57] text-sm font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={async () => {
                const out = await send("/api/challenges", {
                  book,
                  endDate,
                  participantIds: picked,
                  resetProgress
                });
                if (out) {
                  setSetupOpen(false);
                  setBook("");
                  setEndDate("");
                  setPicked([]);
                }
              }}
              disabled={busy || !book || !endDate}
              className="flex-1 py-3 rounded-3xl bg-[#0C3B2E] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMemberList() {
    return (
      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
        {members.map((m) => {
          const on = picked.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() =>
                setPicked(on ? picked.filter((id) => id !== m.id) : [...picked, m.id])
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                on
                  ? "bg-[#0C3B2E] text-white"
                  : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3]"
              }`}
            >
              {on && <Check size={12} className="stroke-[3px] shrink-0" />}
              <span className="truncate">{m.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderMemberPicker() {
    return (
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-5">
        <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
          <h3 className="font-bold text-lg text-[#0C3B2E] mb-1">참가자 바꾸기</h3>
          <p className="text-2xs text-[#6F8377] mb-4">
            중간에 들어오셔도 됩니다. 지금까지 읽은 장은 그대로 반영됩니다.
          </p>
          {renderMemberList()}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setEditMembers(false)}
              className="flex-1 py-3 rounded-3xl bg-[#F5F5F5] text-[#4A6B57] text-sm font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={async () => {
                const out = await send(`/api/challenges/${challenge!.id}/participants`, {
                  participantIds: picked
                });
                if (out) setEditMembers(false);
              }}
              disabled={busy}
              className="flex-1 py-3 rounded-3xl bg-[#0C3B2E] text-white text-sm font-bold cursor-pointer"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    );
  }
}
