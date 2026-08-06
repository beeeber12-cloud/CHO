import React from "react";

interface DualBibleTextProps {
  krvText: string;
  nivText?: string;
  mode: "krv" | "niv" | "both";
  className?: string;
  highlightVerse?: number | null;
  /** 사용자가 눌러서 고른 절 번호들 */
  selectedVerses?: Set<string>;
  /** 절을 누르면 호출 — 번호와 본문(개역개정)을 함께 넘긴다 */
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

export default function DualBibleText({ krvText, nivText = "", mode, className = "", highlightVerse = null, selectedVerses, onToggleVerse }: DualBibleTextProps) {
  const krvVerses = parseVerses(krvText);
  const nivVerses = parseVerses(nivText);

  // NIV 를 절번호로 빠르게 찾을 수 있게 맵 구성
  const nivMap = new Map<string, string>();
  nivVerses.forEach((v, i) => {
    nivMap.set(v.num || String(i + 1), v.body);
  });

  const krvOnly = mode === "krv";
  const nivOnly = mode === "niv";

  // NIV 단독 모드: NIV 절을 기준으로 렌더
  const baseVerses = nivOnly ? nivVerses : krvVerses;

  return (
    <div className={`space-y-[11px] ${className}`}>
      {baseVerses.map((v, idx) => {
        const niv = v.num ? nivMap.get(v.num) : nivVerses[idx]?.body;
        const isHighlighted = highlightVerse != null && v.num != null && Number(v.num) === highlightVerse;
        const isPicked = !!(v.num && selectedVerses?.has(v.num));
        const canPick = !!(onToggleVerse && v.num);
        return (
          <div
            key={idx}
            data-verse={v.num}
            onClick={canPick ? () => onToggleVerse!(v.num!, v.body) : undefined}
            className={`group scroll-mt-4 transition-colors duration-300 rounded-2xl px-1.5 py-[7px] ${
              canPick ? "cursor-pointer" : ""
            } ${
              // 고른 구절은 은은한 금빛 배경으로 표시
              isPicked
                ? "bg-[#FFF6DC]"
                : isHighlighted
                ? "bg-[#F5F5F5]"
                : canPick
                ? "hover:bg-[#FAFAFA]"
                : ""
            }`}
          >
            {/* 절 번호는 왼쪽 칸에 두고, 줄이 넘어가도 본문이 번호 아래로 내려오지 않게 한다.
                NIV 도 같은 칸에 맞춰 한글 본문과 왼쪽 선이 일치한다. */}
            <div className="flex gap-1.5">
              <span
                className={`font-sans font-normal text-xs sm:text-sm w-[18px] sm:w-6 shrink-0 text-right pt-[3px] select-none ${
                  isPicked ? "text-[#B07A00] font-bold" : "text-[#8B8B8B]"
                }`}
              >
                {v.num}
              </span>

              <div className="flex-1 min-w-0">
                {/* 개역개정 (krv/both 모드) */}
                {!nivOnly && (
                  <p
                    className="text-sm sm:text-base md:text-lg leading-[1.5] text-[#333333] font-medium scripture-font [word-break:keep-all] [overflow-wrap:break-word]"
                    style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
                  >
                    {v.body}
                  </p>
                )}

                {/* NIV (niv 단독, 또는 both 모드에서 개역개정 아래) */}
                {(nivOnly || (mode === "both" && niv)) && (
                  <p
                    className={`text-sm sm:text-base md:text-lg leading-[1.5] text-[#8A6642] font-medium scripture-font [overflow-wrap:break-word] ${
                      mode === "both" ? "mt-2.5" : ""
                    }`}
                    style={{ overflowWrap: "break-word" }}
                  >
                    {nivOnly ? v.body : niv}
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
