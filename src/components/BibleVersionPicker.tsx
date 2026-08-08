import React from "react";
import { BIBLE_VERSIONS, BibleVersionKey, MAX_COMPARE, toggleVersion } from "../lib/bibleVersions";

interface Props {
  selected: BibleVersionKey[];
  onChange: (next: BibleVersionKey[]) => void;
}

/**
 * 번역본 고르기 — 최대 두 개까지.
 * 하나면 그 번역본만, 두 개면 대조해서 본다.
 */
export default function BibleVersionPicker({ selected, onChange }: Props) {
  const comparing = selected.length === MAX_COMPARE;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-3xl w-fit">
        {BIBLE_VERSIONS.map((v) => {
          const on = selected.includes(v.key);
          const order = selected.indexOf(v.key);
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onChange(toggleVersion(selected, v.key))}
              aria-pressed={on}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                on ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#4A6B57] hover:bg-[#D2DDD3]"
              }`}
            >
              {/* 두 개를 대조 중일 때만 위·아래 순서를 숫자로 알려준다 */}
              {on && comparing && (
                <span className="text-2xs bg-white/25 w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {order + 1}
                </span>
              )}
              {v.label}
            </button>
          );
        })}
      </div>
      <span className="text-2xs text-[#6F8377] font-semibold">
        {comparing ? "두 개를 나란히 보는 중" : "두 개까지 골라 대조할 수 있어요"}
      </span>
    </div>
  );
}
