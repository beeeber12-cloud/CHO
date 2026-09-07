import React from "react";
import { Sun, Moon, Smartphone } from "lucide-react";
import { SectionLabel } from "./SettingsUI";
import { ThemeMode } from "../lib/theme";

/**
 * 밝게 / 어둡게 / 기기 설정 따름.
 *
 * 이건 **이 기기에서만** 쓰는 설정이다 (공동체 전체 색과 달리 각자 고른다).
 * 밤에 성경을 읽으시는 분들을 위해 어두운 화면을 따로 짜 두었다.
 */

const CHOICES: { key: ThemeMode; label: string; sub: string; icon: typeof Sun }[] = [
  { key: "light", label: "밝게", sub: "기본", icon: Sun },
  { key: "dark", label: "어둡게", sub: "밤에 편한", icon: Moon },
  { key: "system", label: "기기 설정", sub: "따라감", icon: Smartphone }
];

export default function ScreenModeSetting({
  mode,
  onChange
}: {
  mode: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  return (
    <div>
      <SectionLabel>화면</SectionLabel>
      <div className="bg-[#F9F9F9] rounded-[18px] p-2.5">
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((c) => {
            const on = mode === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onChange(c.key)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl transition cursor-pointer ${
                  on ? "grad-forest text-white" : "bg-white text-[#4A6B57] hover:bg-[#F0F0F0]"
                }`}
              >
                <c.icon size={18} />
                <span className="text-xs font-bold">{c.label}</span>
                <span className={`text-2xs ${on ? "text-white/75" : "text-[#6F8377]"}`}>{c.sub}</span>
              </button>
            );
          })}
        </div>
        <p className="text-2xs text-[#6F8377] mt-2.5 px-1 leading-relaxed">
          이 기기에서만 바뀝니다. 어두운 화면은 밤에 성경을 읽으실 때 눈이 덜 부십니다.
        </p>
      </div>
    </div>
  );
}
