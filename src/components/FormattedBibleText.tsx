import React from "react";

interface FormattedBibleTextProps {
  text: string;
  className?: string;
  highlightVerse?: number | null;
  /** 사용자가 눌러서 고른 절 번호들 */
  selectedVerses?: Set<string>;
  /** 절을 누르면 호출 — 번호와 본문을 함께 넘긴다 */
  onToggleVerse?: (verseNum: string, verseBody: string) => void;
}

interface ParsedVerse {
  verseNum?: string;
  verseBody: string;
}

export default function FormattedBibleText({
  text,
  className = "",
  highlightVerse = null,
  selectedVerses,
  onToggleVerse,
}: FormattedBibleTextProps) {
  if (!text) return null;

  // Clean quotes if wrapped
  let cleanKRV = text.trim();
  if (cleanKRV.startsWith('"') && cleanKRV.endsWith('"')) {
    cleanKRV = cleanKRV.slice(1, -1).trim();
  }

  const parseLines = (rawText: string) => {
    let rawLines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

    // If inline verse numbers exist in a single line
    if (rawLines.length === 1 && /\b\d{1,3}[\s절.:]/.test(rawLines[0])) {
      const matches = rawLines[0]
        .split(/(?=(?:^|\s)\d{1,3}(?:절|\.|\:|\s+)\s*)/g)
        .map((s) => s.trim())
        .filter(Boolean);
      if (matches.length > 1) {
        rawLines = matches;
      }
    }
    return rawLines;
  };

  const krvLines = parseLines(cleanKRV);
  const parsedVerses: ParsedVerse[] = [];

  for (let i = 0; i < krvLines.length; i++) {
    const line = krvLines[i];
    const match = line.match(/^(\d{1,3})(?:절|\.|\:|\s+)\s*(.*)/);

    if (match) {
      parsedVerses.push({
        verseNum: match[1],
        verseBody: match[2].trim(),
      });
    } else {
      parsedVerses.push({
        verseBody: line,
      });
    }
  }

  return (
    <div className={`space-y-[11px] ${className}`}>
      {parsedVerses.map((v, idx) => {
        const isNavHighlight =
          highlightVerse != null && v.verseNum != null && Number(v.verseNum) === highlightVerse;
        const isPicked = !!(v.verseNum && selectedVerses?.has(v.verseNum));
        const canPick = !!(onToggleVerse && v.verseNum);

        return (
          <div
            key={idx}
            data-verse={v.verseNum}
            onClick={canPick ? () => onToggleVerse!(v.verseNum!, v.verseBody) : undefined}
            className={`group scroll-mt-4 transition-colors duration-300 rounded-2xl -mx-1.5 px-1.5 py-[7px] ${
              canPick ? "cursor-pointer" : ""
            } ${
              // 고른 구절은 은은한 금빛 배경으로 표시
              isPicked
                ? "bg-[#FFF6DC]"
                : isNavHighlight
                ? "bg-[#F5F5F5]"
                : canPick
                ? "hover:bg-[#FAFAFA]"
                : ""
            }`}
          >
            {/* 절 번호는 왼쪽 칸에 두고, 줄이 넘어가도 본문이 번호 아래로 내려오지 않게 한다 */}
            <div className="flex gap-1.5">
              <span
                className={`font-sans font-normal text-xs sm:text-sm w-[18px] sm:w-6 shrink-0 text-right pt-[3px] select-none ${
                  isPicked ? "text-[#B07A00] font-bold" : "text-[#8B8B8B]"
                }`}
              >
                {v.verseNum}
              </span>
              <p
                className="flex-1 min-w-0 text-sm sm:text-base md:text-lg leading-[1.5] text-[#333333] font-medium scripture-font [word-break:keep-all] [overflow-wrap:break-word]"
                style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
              >
                {v.verseBody}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
