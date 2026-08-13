import React, { useState } from "react";
import { AtSign, X } from "lucide-react";

interface MentionPickerProps {
  /** 부를 수 있는 지체들 (보통 본인은 뺀다) */
  names: string[];
  onPick: (name: string) => void;
  /** 버튼만 작게 쓰고 싶을 때 */
  compact?: boolean;
}

/**
 * "@지체 부르기" — 이름을 눌러 넣는 방식.
 *
 * 글자를 치다가 뜨는 자동완성보다 이 편이 어르신들께 훨씬 쉽다.
 * 직접 "@이름" 을 쳐도 알림은 똑같이 간다.
 */
export default function MentionPicker({ names, onPick, compact = false }: MentionPickerProps) {
  const [open, setOpen] = useState(false);

  if (names.length === 0) return null;

  return (
    <div className={compact ? "" : "space-y-1.5"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-3xl font-bold transition cursor-pointer ${
          compact ? "px-2 py-1.5 text-2xs" : "px-2.5 py-1.5 text-2xs"
        } ${open ? "bg-[#0C3B2E] text-white" : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#E8E8E8]"}`}
      >
        {open ? <X size={12} /> : <AtSign size={12} />}
        지체 부르기
      </button>

      {open && (
        <div className="flex flex-wrap gap-1.5 bg-[#F5F5F5] rounded-3xl p-2.5">
          {names.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onPick(name);
                setOpen(false);
              }}
              className="px-2.5 py-1.5 rounded-3xl bg-white text-2xs font-bold text-[#0C3B2E] hover:bg-[#E8F0E9] ring-1 ring-[#E3E9E2] transition cursor-pointer"
            >
              @{name}
            </button>
          ))}
          <p className="basis-full text-2xs text-[#6F8377] px-1 pt-0.5">
            이름을 누르면 글에 들어가고, 그 지체에게 알림이 갑니다.
          </p>
        </div>
      )}
    </div>
  );
}
