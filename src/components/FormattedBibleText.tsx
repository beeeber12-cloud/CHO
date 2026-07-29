import React from "react";

interface FormattedBibleTextProps {
  text: string;
  className?: string;
  highlightVerse?: number | null;
}

interface ParsedVerse {
  verseNum?: string;
  verseBody: string;
}

export default function FormattedBibleText({
  text,
  className = "",
  highlightVerse = null,
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
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {parsedVerses.map((v, idx) => (
        <div
          key={idx}
          data-verse={v.verseNum}
          className={`group scroll-mt-4 transition-colors duration-500 ${
            highlightVerse != null && v.verseNum != null && Number(v.verseNum) === highlightVerse
              ? "bg-[#F5F5F5] border-l-4 border-[#4A6B57] rounded-r-lg -ml-1 pl-3 pr-2 py-2"
              : ""
          }`}
        >
          <p
            className="text-sm sm:text-base md:text-lg leading-[1.8] text-[#333333] font-medium tracking-normal scripture-font [word-break:keep-all] [overflow-wrap:break-word]"
            style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}
          >
            {v.verseNum && (
              <span className="font-sans font-bold text-[#4A6B57] text-xs sm:text-sm mr-2 inline-block select-none">
                {v.verseNum}
              </span>
            )}
            {v.verseBody}
          </p>
        </div>
      ))}
    </div>
  );
}
