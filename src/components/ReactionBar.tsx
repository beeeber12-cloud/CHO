import React, { useState } from "react";
import { Reactions, ReactionType } from "../types";

/**
 * 글에 남기는 가벼운 반응.
 * 글쓰기는 부담스러워도 버튼은 누른다 — 참여의 문턱을 가장 낮추는 장치다.
 */
const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "좋아요" },
  { type: "pray", emoji: "🙏", label: "기도할게요" }
];

interface ReactionBarProps {
  reactions?: Reactions;
  currentUserId: string;
  /** "/api/meditations/{id}" 또는 "/api/gratitudes/{id}" */
  endpointBase: string;
  onUpdated: (updated: any) => void;
}

export default function ReactionBar({
  reactions,
  currentUserId,
  endpointBase,
  onUpdated
}: ReactionBarProps) {
  const [busy, setBusy] = useState<ReactionType | null>(null);

  const handleClick = async (type: ReactionType) => {
    if (busy) return;
    setBusy(type);
    try {
      const res = await fetch(`${endpointBase}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, type })
      });
      if (res.ok) onUpdated(await res.json());
    } catch (err) {
      console.error("reaction failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTIONS.map((r) => {
        const list = reactions?.[r.type] || [];
        const mine = list.includes(currentUserId);
        const count = list.length;

        return (
          <button
            key={r.type}
            type="button"
            onClick={() => handleClick(r.type)}
            disabled={busy !== null}
            title={r.label}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-3xl text-2xs font-bold transition cursor-pointer disabled:opacity-60 whitespace-nowrap ${
              mine
                ? "bg-[#FFBA00] text-[#0C3B2E]"
                : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#E8E8E8]"
            }`}
          >
            <span className="text-xs leading-none">{r.emoji}</span>
            <span>{r.label}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
