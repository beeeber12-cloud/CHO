import React, { useState } from "react";
import { Heart, HandHeart } from "lucide-react";
import { Reactions, ReactionType } from "../types";

/**
 * 글에 남기는 가벼운 반응.
 * 글쓰기는 부담스러워도 버튼은 누른다 — 참여의 문턱을 가장 낮추는 장치다.
 * 그림문자(👍🙏) 대신 선 아이콘을 쓴다 — 시안처럼 글 사이에서 튀지 않게.
 */
const REACTIONS: {
  type: ReactionType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}[] = [
  { type: "like", icon: Heart, label: "좋아요" },
  { type: "pray", icon: HandHeart, label: "기도할게요" }
];

interface ReactionBarProps {
  reactions?: Reactions;
  currentUserId: string;
  /** "/api/meditations/{id}" 또는 "/api/gratitudes/{id}" */
  endpointBase: string;
  /** 노출할 반응 종류. 생략하면 전부. (예: 감사칭찬 탭은 ["like"] 만) */
  only?: ReactionType[];
  onUpdated: (updated: any) => void;
}

export default function ReactionBar({
  reactions,
  currentUserId,
  endpointBase,
  only,
  onUpdated
}: ReactionBarProps) {
  const [busy, setBusy] = useState<ReactionType | null>(null);
  const visible = only ? REACTIONS.filter((r) => only.includes(r.type)) : REACTIONS;

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
    <div className="flex items-center gap-4 flex-wrap">
      {visible.map((r) => {
        const list = reactions?.[r.type] || [];
        const mine = list.includes(currentUserId);
        const count = list.length;
        const Icon = r.icon;

        return (
          <button
            key={r.type}
            type="button"
            onClick={() => handleClick(r.type)}
            disabled={busy !== null}
            title={r.label}
            // 시안의 .reaction — 알약 배경 없이 아이콘+글자만. 누르면 초록으로 물든다.
            className={`flex items-center gap-1 text-2xs font-semibold transition cursor-pointer disabled:opacity-60 whitespace-nowrap ${
              mine ? "text-[#4A6B57]" : "text-[#6F8377] hover:text-[#4A6B57]"
            }`}
          >
            <Icon size={14} className={mine ? "fill-[#4A6B57]" : ""} />
            <span>{r.label}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
