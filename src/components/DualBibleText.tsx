import React from "react";
import { BibleVersionKey, BIBLE_VERSIONS } from "../lib/bibleVersions";

/** 화면에 실을 번역본 하나 (위에서부터 순서대로 쌓인다) */
export interface VersionPane {
  key: BibleVersionKey;
  text: string;
}

interface DualBibleTextProps {
  /** 1개면 단독, 2개면 대조 (그 이상은 앞의 두 개만 쓴다) */
  panes: VersionPane[];
  className?: string;
  highlightVerse?: number | null;
  /** 사용자가 눌러서 고른 절 번호들 */
  selectedVerses?: Set<string>;
  /** 절을 누르면 호출 — 번호와 본문(첫 번째 번역본)을 함께 넘긴다 */
  onToggleVerse?: (verseNum: string, verseBody: string) => void;
}

interface Verse {
  num?: string;
  body: string;
}

// "16 본문..." / "16 In the beginning..." 형태를 절 단위로 파싱
function parseVerses(raw: string): Verse[] {
  if (!raw) return [];
  let clean = raw.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1).trim();

  let lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  // 한 줄에 절번호가 여러 개 섞여있는 경우 분리
  if (lines.length === 1 && /\b\d{1,3}[\s절.:]/.test(lines[0])) {
    const parts = lines[0]
      .split(/(?=(?:^|\s)\d{1,3}(?:절|\.|\:|\s+)\s*)/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) lines = parts;
  }

  return lines.map((line) => {
    const m = line.match(/^(\d{1,3})(?:절|\.|\:|\s+)\s*(.*)/);
    return m ? { num: m[1], body: m[2].trim() } : { body: line };
  });
}

const colorOf = (key: BibleVersionKey) =>
  BIBLE_VERSIONS.find((v) => v.key === key)?.color || "#333333";

export default function DualBibleText({
  panes,
  className = "",
  highlightVerse = null,
  selectedVerses,
  onToggleVerse,
}: DualBibleTextProps) {
  const used = panes.filter((p) => p && p.text && p.text.trim()).slice(0, 2);
  if (used.length === 0) return null;

  const comparing = used.length === 2;

  // 첫 번째 번역본을 기준으로 절을 세우고, 두 번째는 절 번호로 맞춰 붙인다
  const baseVerses = parseVerses(used[0].text);
  const secondMap = new Map<string, string>();
  if (comparing) {
    parseVerses(used[1].text).forEach((v, i) => {
      secondMap.set(v.num || String(i + 1), v.body);
    });
  }

  return (
    <div className={`space-y-[11px] ${className}`}>
      {baseVerses.map((v, idx) => {
        const second = comparing && v.num ? secondMap.get(v.num) : undefined;
        const isHighlighted = highlightVerse != null && v.num != null && Number(v.num) === highlightVerse;
        const isPicked = !!(v.num && selectedVerses?.has(v.num));
        const canPick = !!(onToggleVerse && v.num);
        return (
          <div
            key={idx}
            data-verse={v.num}
            onClick={canPick ? () => onToggleVerse!(v.num!, v.body) : undefined}
            className={`group scroll-mt-4 transition-colors duration-300 rounded-2xl -mx-1.5 px-1.5 py-[7px] ${
              canPick ? "cursor-pointer" : ""
            } ${
              // 고른 구절은 은은한 금빛 배경으로 표시
              isPicked
                ? "bg-[#FFFBEE]"
                : isHighlighted
                ? "bg-[#F5F5F5]"
                : canPick
                ? "hover:bg-[#FAFAFA]"
                : ""
            }`}
          >
            {/* 절 번호는 왼쪽 칸에 두고, 줄이 넘어가도 본문이 번호 아래로 내려오지 않게 한다.
                대조할 때 두 번째 번역본도 같은 칸에 맞춰 왼쪽 선이 일치한다. */}
            <div className="flex gap-1.5">
              <span
                className={`font-sans font-normal text-xs sm:text-sm shrink-0 pt-[3px] select-none ${
                  isPicked ? "text-[#B07A00] font-bold" : "text-[#8B8B8B]"
                }`}
              >
                {v.num}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm sm:text-base md:text-lg leading-[1.5] font-medium scripture-font [word-break:keep-all] [overflow-wrap:break-word]"
                  style={{ color: colorOf(used[0].key), wordBreak: "keep-all", overflowWrap: "break-word" }}
                >
                  {v.body}
                </p>

                {/* 두 번째 번역본 — 대조할 때만 아래에 붙는다.
                    어느 번역본인지는 위쪽 선택 칩으로 알 수 있으므로 절마다 이름을 달지 않는다. */}
                {comparing && second && (
                  <p
                    className="mt-2.5 text-sm sm:text-base md:text-lg leading-[1.5] font-medium scripture-font [word-break:keep-all] [overflow-wrap:break-word]"
                    style={{ color: colorOf(used[1].key), wordBreak: "keep-all", overflowWrap: "break-word" }}
                  >
                    {second}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
