import React from "react";
import { useFontSize, FontScale } from "../context/FontSizeContext";

/**
 * 글씨 크기 — 미끄러지는 알약 세그먼트.
 * 누른 칸으로 흰 알약이 옮겨 간다. 버튼의 '가' 는 실제 크기 차이로 보여준다.
 *
 * 설정 화면과 첫 실행 안내가 **같은 것**을 쓴다. 두 군데에 따로 그려 두면
 * 한쪽만 고쳐져 어긋난다.
 */
export default function FontSizeSegment() {
  const { fontScale, setFontScale } = useFontSize();

  const scales: { key: FontScale; label: string; sample: string }[] = [
    { key: "small", label: "작게", sample: "text-2xs" },
    { key: "normal", label: "보통", sample: "text-xs" },
    { key: "large", label: "크게", sample: "text-sm" },
    { key: "xlarge", label: "아주크게", sample: "text-base" },
  ];
  const index = Math.max(0, scales.findIndex((s) => s.key === fontScale));

  return (
    <div className="relative grid grid-cols-4 bg-[#F9F9F9] rounded-2xl p-1">
      {/* 미끄러지는 흰 알약 — 한 칸 폭만큼(=자기 폭의 100%) 옮겨 간다 */}
      <div
        className="absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(25%-2px)] bg-white rounded-xl shadow-[0_2px_6px_rgba(47,115,88,0.14)] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {scales.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => setFontScale(s.key)}
          className={`relative z-10 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors cursor-pointer ${
            fontScale === s.key ? "text-[#14261E]" : "text-[#6F8377]"
          }`}
        >
          <span className={`${s.sample} font-bold leading-none`}>가</span>
          <span className="text-2xs font-bold whitespace-nowrap">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
