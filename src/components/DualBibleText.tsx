import React from "react";

interface DualBibleTextProps {
  krvText: string;
  nivText?: string;
  mode: "krv" | "niv" | "both";
  className?: string;
  highlightVerse?: number | null;
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

export default function DualBibleText({ krvText, nivText = "", mode, className = "", highlightVerse = null }: DualBibleTextProps) {
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
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {baseVerses.map((v, idx) => {
        const niv = v.num ? nivMap.get(v.num) : nivVerses[idx]?.body;
        const isHighlighted = highlightVerse != null && v.num != null && Number(v.num) === highlightVerse;
        return (
          <div
            key={idx}
            data-verse={v.num}
            className={`group scroll-mt-4 transition-colors duration-500 ${
              isHighlighted
                ? "bg-amber-100 border-l-4 border-amber-500 rounded-r-lg -ml-1 pl-3 pr-2 py-2"
                : ""
            }`}
          >
            {/* 개역개정 (krv/both 모드) */}
            {!nivOnly && (
              <p
                className="text-sm sm:text-base md:text-lg leading-[1.8] text-[#2c3e2d] tracking-normal font-serif [word-break:keep-all] [overflow-wrap:break-word]"
                style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
              >
                {v.num && (
                  <span className="font-sans font-bold text-[#4a6d4a] text-xs sm:text-sm mr-2 inline-block select-none">
                    {v.num}
                  </span>
                )}
                {v.body}
              </p>
            )}

            {/* NIV (niv 단독, 또는 both 모드에서 개역개정 아래) */}
            {(nivOnly || (mode === "both" && niv)) && (
              <p
                className={`text-sm sm:text-base leading-[1.7] text-[#5a6b7a] font-serif italic [overflow-wrap:break-word] ${
                  mode === "both" ? "mt-1 pl-0.5" : ""
                }`}
                style={{ overflowWrap: "break-word" }}
              >
                {nivOnly && v.num && (
                  <span className="font-sans font-bold text-[#6d8a9a] text-xs sm:text-sm mr-2 inline-block select-none not-italic">
                    {v.num}
                  </span>
                )}
                {nivOnly ? v.body : niv}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
