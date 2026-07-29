import React, { useState } from "react";
import { useFontSize, FontScale } from "../context/FontSizeContext";
import { Type, Check, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function FontSizeControl() {
  const { fontScale, setFontScale, scaleLabel } = useFontSize();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const scales: { key: FontScale; label: string; desc: string }[] = [
    { key: "small", label: "작게", desc: "11px 아담하고 작고 깔끔한 폰트" },
    { key: "normal", label: "보통 크기", desc: "기본 폰트 크기 유지" },
    { key: "large", label: "크게", desc: "20px 시원하고 읽기 편함" },
    { key: "xlarge", label: "아주 크게", desc: "28px 선명한 대형 폰트" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EDEEF0] hover:bg-[#DCDEE1] border border-[#DCDEE1] rounded-2xl text-xs font-bold text-[#2C2F36] transition cursor-pointer shadow-xs whitespace-nowrap"
        title="글씨 크기 조절"
      >
        <Type size={14} className="text-[#4B4E55]" />
        <span>글씨크기</span>
        <span className="text-2xs bg-[#2C2F36] text-white px-1.5 py-0.5 rounded-md font-semibold">
          {fontScale === "small"
            ? "작게"
            : fontScale === "normal"
            ? "보통"
            : fontScale === "large"
            ? "크게"
            : "특대"}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 sm:translate-x-0 w-[90vw] max-w-xs sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-64 bg-white border border-[#E3E4E7] rounded-2xl shadow-xl z-50 p-3 space-y-1 text-[#1A1C21]"
            >
              <div className="flex justify-between items-center px-2 py-1 border-b border-[#E3E4E7] mb-1">
                <span className="text-xs font-bold text-[#2C2F36] flex items-center gap-1">
                  <Type size={14} className="text-[#4B4E55]" /> 화면 글씨 크기 설정
                </span>
                <span className="text-2xs text-[#85888F]">선택 시 즉시 적용</span>
              </div>

              {scales.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setFontScale(s.key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-2xl text-left transition cursor-pointer ${
                    fontScale === s.key
                      ? "bg-[#EDEEF0] text-[#2C2F36] font-bold"
                      : "hover:bg-[#F4F5F7] text-[#4B4E55]"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-2xs text-[#85888F]">{s.desc}</div>
                  </div>
                  {fontScale === s.key && <Check size={16} className="text-[#2C2F36]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
