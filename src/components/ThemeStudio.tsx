import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, RotateCcw, Check, Palette, Loader, ChevronDown, ChevronUp } from "lucide-react";
import ModalPortal from "./ModalPortal";
import {
  AppTheme,
  COLOR_ROLES,
  DEFAULT_THEME,
  FONTS,
  GRADIENT_ROLES,
  ThemeColorKey,
  ThemeGradientKey,
  applyTheme,
  cacheTheme,
  gradientCss,
  isHex,
  normalizeTheme
} from "../lib/theme";

/**
 * 앱 색 꾸미기 창.
 *
 * 아래에서 올라오는 창이라 **뒤로 앱이 그대로 보인다** — 색을 고르면 그 자리에서
 * 앱 전체가 바뀌는 것을 눈으로 보며 고를 수 있다.
 * '저장' 을 눌러야 공동체 모두에게 적용된다. 저장 없이 닫으면 원래대로 돌아간다.
 *
 * 여기서 정하는 것은 **밝은 화면**의 색이다. 어두운 화면(다크)은 눈이 부시지 않게
 * 따로 짜 둔 색을 쓴다 — 그래서 어둡게 쓰는 분이 열면 잠시 밝은 화면으로 보여 드린다.
 */

/** 미리 만든 색 */
const PRESETS: { name: string; theme: AppTheme }[] = [
  { name: "기본 초록", theme: DEFAULT_THEME },
  {
    name: "라임 연둣빛",
    theme: {
      page: "#F6FBE9",
      card: "#FFFFFF",
      box: "#EFF6E2",
      soft: "#EEF5E1",
      mint: "#CFE0C2",
      line: "#E7EFDC",
      title: "#0C342C",
      body: "#0B2A20",
      muted: "#4E7568",
      faint: "#5E7F71",
      scripture: "#22302A",
      accent: "#076653",
      accent2: "#1E6B57",
      point: "#E3EF26",
      ink: "#06231D",
      gradMain: { from: "#0B7A62", to: "#06231D", angle: 135 },
      gradSub: { from: "#0F8F72", to: "#076653", angle: 135 },
      font: "sans"
    }
  },
  {
    name: "크림 · 먹초록",
    theme: {
      ...DEFAULT_THEME,
      page: "#FFFDEE",
      card: "#FFFEF7",
      box: "#F6F2DC",
      soft: "#FBF8E9",
      mint: "#E4E3BC",
      line: "#EDE8CE",
      title: "#0C342C",
      accent: "#076653",
      accent2: "#2C6B4F",
      point: "#D8B54A",
      gradMain: { from: "#0C342C", to: "#06231D", angle: 135 },
      gradSub: { from: "#3F7A5C", to: "#0C342C", angle: 135 }
    }
  },
  {
    name: "깊은 숲",
    theme: {
      ...DEFAULT_THEME,
      page: "#E7EEE8",
      box: "#EFF4F0",
      soft: "#E9F0EA",
      mint: "#C6DCC9",
      line: "#DDE7DE",
      title: "#06231D",
      accent: "#0B5C4B",
      accent2: "#1E6B57",
      point: "#C9E04A",
      gradMain: { from: "#076653", to: "#06231D", angle: 160 },
      gradSub: { from: "#2C8C74", to: "#076653", angle: 160 }
    }
  }
];

/* 꾸미기 창 자체의 색.
   앱 색이 어떻게 바뀌어도 이 창은 늘 읽혀야 하므로, 앱이 쓰지 않는 값으로만 짠다. */
const UI = {
  sheet: "bg-[#FEFEFE]",
  text: "text-[#12211C]",
  muted: "text-[#5A6E64]",
  row: "bg-[#F2F3EE]",
  line: "border-[#E3E5DE]"
};

function SwatchInput({
  value,
  onChange,
  size = 40
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  return (
    <label
      className="relative shrink-0 rounded-2xl cursor-pointer overflow-hidden block"
      style={{
        width: size,
        height: size,
        background: value,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.12)"
      }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="색 고르기"
      />
    </label>
  );
}

function HexField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      value={text}
      onChange={(e) => {
        let v = e.target.value.trim().toUpperCase();
        if (v && !v.startsWith("#")) v = "#" + v;
        setText(v);
        if (isHex(v)) onChange(v);
      }}
      onBlur={() => setText(value)}
      spellCheck={false}
      maxLength={7}
      className={`w-[86px] shrink-0 text-2xs font-mono font-bold px-2 py-1.5 rounded-lg ${UI.row} ${UI.text} text-center focus:outline-none`}
      aria-label="색 값 (예: #F9F9F9)"
    />
  );
}

/** 색 하나를 고르는 줄 */
function ColorRow({
  name,
  desc,
  value,
  onChange
}: {
  name: string;
  desc: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <SwatchInput value={value} onChange={onChange} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${UI.text} truncate`}>{name}</p>
        <p className={`text-2xs ${UI.muted} truncate`}>{desc}</p>
      </div>
      <HexField value={value} onChange={onChange} />
    </div>
  );
}

export default function ThemeStudio({
  open,
  saved,
  dark,
  onClose,
  onSaved
}: {
  open: boolean;
  /** 지금 저장되어 있는 색 (닫을 때 이 색으로 되돌린다) */
  saved: AppTheme;
  /** 이 기기가 지금 어두운 화면을 쓰는 중인지 (닫을 때 그대로 되돌리기 위해) */
  dark: boolean;
  onClose: () => void;
  onSaved: (t: AppTheme) => void;
}) {
  const [draft, setDraft] = useState<AppTheme>(saved);
  /** 창을 아래로 접어 두고 앱을 둘러보는 중 (고르던 색은 그대로 입혀져 있다) */
  const [minimized, setMinimized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const darkRef = useRef(dark);
  darkRef.current = dark;

  // 창을 열 때마다 지금 색에서 시작한다
  useEffect(() => {
    if (open) {
      setDraft(saved);
      setMessage("");
      setMinimized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 고르는 즉시 앱 전체에 입힌다 (창 뒤로 바뀌는 것이 보인다).
  // 어둡게 쓰는 중이어도 여기서는 밝은 화면으로 보여 드린다 — 정하는 색이 그 색이므로.
  useEffect(() => {
    if (open) applyTheme(draft, false);
  }, [draft, open]);

  const setColor = (key: ThemeColorKey, hex: string) => setDraft((d) => ({ ...d, [key]: hex }));
  const setGrad = (key: ThemeGradientKey, part: "from" | "to" | "angle", v: string | number) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [part]: v } }));

  const groups = useMemo(() => {
    const map = new Map<string, typeof COLOR_ROLES>();
    for (const r of COLOR_ROLES) {
      const list = map.get(r.group) || [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }, []);

  const close = () => {
    applyTheme(savedRef.current, darkRef.current); // 저장 안 한 것은 되돌린다
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장하지 못했습니다.");
      }
      const applied = normalizeTheme(await res.json());
      cacheTheme(applied);
      onSaved(applied);
      applyTheme(applied, false);
      setMessage("공동체 모두에게 적용되었습니다.");
    } catch (e: any) {
      setMessage(e?.message || "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[80] flex items-end justify-center ${
              minimized ? "pointer-events-none" : ""
            }`}
          >
            {/* 뒤가 보여야 색이 바뀌는 걸 확인할 수 있으므로 아주 옅게만 덮는다.
                눌러도 닫지 않고 **접는다** — 고르던 색을 잃지 않고 앱을 둘러볼 수 있게 */}
            {!minimized && (
              <div className="absolute inset-0 bg-black/10" onClick={() => setMinimized(true)} />
            )}

            {/* 접었을 때 — 앱을 그대로 만지며 색을 확인하고, 여기서 다시 펼치거나 저장한다 */}
            {minimized && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] ${UI.sheet} rounded-3xl shadow-2xl flex items-center gap-1.5 px-2.5 py-2`}
              >
                <button
                  type="button"
                  onClick={() => setMinimized(false)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl ${UI.row} ${UI.text} text-xs font-bold cursor-pointer`}
                >
                  <ChevronUp size={15} />
                  <span className="whitespace-nowrap">이어서 고르기</span>
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#14584A] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader size={14} className="animate-spin" /> : <Check size={15} />} 저장
                </button>
                <button
                  type="button"
                  onClick={close}
                  className={`w-8 h-8 rounded-full ${UI.row} flex items-center justify-center ${UI.muted} cursor-pointer`}
                  aria-label="되돌리고 닫기"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: minimized ? "100%" : 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
              className={`relative w-full sm:max-w-lg ${UI.sheet} rounded-t-[26px] shadow-2xl flex flex-col max-h-[74vh] ${
                minimized ? "pointer-events-none" : "pointer-events-auto"
              }`}
            >
              {/* 손잡이 — 눌러서 접는다 */}
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-pointer"
                aria-label="접고 앱 둘러보기"
              >
                <span className="w-10 h-1 rounded-full bg-[#D9DCD4]" />
              </button>

              <div className="px-5 pb-3 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h4 className={`font-bold text-base ${UI.text} flex items-center gap-1.5`}>
                    <Palette size={17} /> 앱 색 꾸미기
                  </h4>
                  <p className={`text-2xs ${UI.muted} mt-0.5`}>
                    {dark
                      ? "어두운 화면은 따로 짜 둔 색을 씁니다 — 지금은 밝은 화면으로 보여 드립니다"
                      : "고르는 즉시 뒤 화면이 바뀝니다 · 저장해야 모두에게 적용됩니다"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    className={`flex items-center gap-1 px-2.5 h-8 rounded-full ${UI.row} ${UI.text} text-2xs font-bold cursor-pointer`}
                    title="창을 접고 앱을 둘러봅니다"
                  >
                    <ChevronDown size={15} /> 앱 보기
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className={`w-8 h-8 rounded-full ${UI.row} flex items-center justify-center ${UI.muted} cursor-pointer`}
                    aria-label="되돌리고 닫기"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-4 overflow-y-auto scrollbar-thin">
                {/* 미리 만든 색 */}
                <p className={`text-2xs font-black tracking-[0.1em] ${UI.muted} mb-2`}>미리 만든 색</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setDraft(p.theme)}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl ${UI.row} cursor-pointer text-left`}
                    >
                      <span
                        className="w-9 h-9 rounded-xl shrink-0"
                        style={{ backgroundImage: gradientCss(p.theme.gradMain) }}
                      />
                      <span className="min-w-0">
                        <span className={`block text-xs font-bold ${UI.text} truncate`}>{p.name}</span>
                        <span className="flex gap-1 mt-1">
                          {[p.theme.box, p.theme.mint, p.theme.point, p.theme.accent].map((c, i) => (
                            <span key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                          ))}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {/* 색 갈래별 */}
                {groups.map(([group, roles]) => (
                  <div key={group} className="mb-4">
                    <p className={`text-2xs font-black tracking-[0.1em] ${UI.muted} mb-1`}>{group}</p>
                    <div className={`divide-y ${UI.line}`}>
                      {roles.map((r) => (
                        <ColorRow
                          key={r.key}
                          name={r.name}
                          desc={r.desc}
                          value={draft[r.key]}
                          onChange={(hex) => setColor(r.key, hex)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* 그라데이션 */}
                <p className={`text-2xs font-black tracking-[0.1em] ${UI.muted} mb-2`}>그라데이션</p>
                <div className="space-y-3 mb-4">
                  {GRADIENT_ROLES.map((g) => (
                    <div key={g.key} className={`${UI.row} rounded-2xl p-3`}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-12 h-12 rounded-xl shrink-0"
                          style={{ backgroundImage: gradientCss(draft[g.key]) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold ${UI.text} truncate`}>{g.name}</p>
                          <p className={`text-2xs ${UI.muted} truncate`}>{g.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <SwatchInput
                          size={32}
                          value={draft[g.key].from}
                          onChange={(hex) => setGrad(g.key, "from", hex)}
                        />
                        <HexField value={draft[g.key].from} onChange={(hex) => setGrad(g.key, "from", hex)} />
                        <span className={`text-2xs ${UI.muted}`}>→</span>
                        <SwatchInput
                          size={32}
                          value={draft[g.key].to}
                          onChange={(hex) => setGrad(g.key, "to", hex)}
                        />
                        <HexField value={draft[g.key].to} onChange={(hex) => setGrad(g.key, "to", hex)} />
                      </div>

                      <div className="flex items-center gap-2.5 mt-2.5">
                        <span className={`text-2xs font-bold ${UI.muted} shrink-0`}>방향 {draft[g.key].angle}°</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={5}
                          value={draft[g.key].angle}
                          onChange={(e) => setGrad(g.key, "angle", Number(e.target.value))}
                          className="flex-1 accent-[#14584A] cursor-pointer"
                          aria-label={`${g.name} 그라데이션 방향`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 글꼴 */}
                <p className={`text-2xs font-black tracking-[0.1em] ${UI.muted} mb-2`}>글꼴</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, font: f.key }))}
                      style={{ fontFamily: f.stack }}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold cursor-pointer ${
                        draft.font === f.key ? "bg-[#14584A] text-white" : `${UI.row} ${UI.text}`
                      }`}
                    >
                      <span className="block text-base">가나다</span>
                      <span className="block text-2xs font-semibold mt-0.5 opacity-80">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 아래 고정 단추 */}
              <div
                className={`shrink-0 border-t ${UI.line} px-5 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] flex items-center gap-2`}
              >
                <button
                  type="button"
                  onClick={() => setDraft(DEFAULT_THEME)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl ${UI.row} ${UI.text} text-xs font-bold cursor-pointer shrink-0`}
                >
                  <RotateCcw size={15} /> 기본색
                </button>
                {message && (
                  <span className={`text-2xs font-bold ${UI.muted} flex-1 min-w-0 truncate`}>{message}</span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={`${message ? "" : "flex-1"} flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-[#14584A] text-white text-sm font-bold cursor-pointer disabled:opacity-60`}
                >
                  {saving ? <Loader size={15} className="animate-spin" /> : <Check size={16} />}
                  {saving ? "저장 중" : "저장"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
