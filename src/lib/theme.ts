/**
 * 앱 색 꾸미기.
 *
 * 앱의 색은 화면 코드 곳곳에 `bg-[#EFF6E2]` 같은 값으로 박혀 있다(1,200 곳 남짓).
 * 그걸 하나하나 고치지 않고도 색을 바꿀 수 있게, **덮어쓰기 규칙**을 만들어 붙인다.
 *
 *   [class~="bg-[#EFF6E2]"] { background-color: var(--u-box) !important }
 *
 * 이렇게 하면 그 색을 쓰는 모든 자리가 한 번에 바뀐다.
 * 같은 뜻으로 쓰이던 비슷한 색들(연한 면 예닐곱 가지 등)은 한 갈래로 묶었다.
 *
 * 관리자가 저장하면 서버에 남아 **공동체 모두**의 앱이 같은 색이 된다.
 */

export interface ThemeGradient {
  from: string;
  to: string;
  /** 그라데이션이 흐르는 방향 (도) */
  angle: number;
}

export type ThemeFontKey = "sans" | "serif" | "myeongjo";

export interface AppTheme {
  /* 면 */
  page: string;
  card: string;
  box: string;
  soft: string;
  mint: string;
  line: string;
  /* 글씨 */
  title: string;
  body: string;
  muted: string;
  faint: string;
  scripture: string;
  /* 강조 */
  accent: string;
  accent2: string;
  point: string;
  ink: string;
  /* 그라데이션 */
  gradMain: ThemeGradient;
  gradSub: ThemeGradient;
  gradBar: ThemeGradient;
  /* 글꼴 */
  font: ThemeFontKey;
}

export const DEFAULT_THEME: AppTheme = {
  page: "#EEF3E6",
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
  gradBar: { from: "#0C342C", to: "#06231D", angle: 135 },

  font: "sans"
};

export type ThemeColorKey = Exclude<keyof AppTheme, "gradMain" | "gradSub" | "gradBar" | "font">;
export type ThemeGradientKey = "gradMain" | "gradSub" | "gradBar";

/**
 * 한 갈래가 실제로 덮어쓰는 색들.
 * 코드에 박혀 있는 값 그대로 적는다 — 여기 없는 색은 안 바뀐다.
 */
const ROLE_HEXES: Record<ThemeColorKey, string[]> = {
  page: ["#EEF3E6"],
  card: [], // 흰 카드는 .bg-white 로 따로 덮는다
  box: ["#EFF6E2", "#E4EFD1"],
  soft: ["#EEF5E1", "#F6FAEC", "#F5F9EA", "#ECF3DF", "#E9F1DC", "#ECF4DE", "#F2FACF", "#FFFDEE"],
  mint: ["#CFE0C2", "#C6DCB4", "#C2DAB0", "#E7F6D8", "#E2FBCE"],
  line: ["#E7EFDC", "#DEE9D2", "#DFE9D3", "#D9E4CE", "#D6E1CA"],

  title: ["#0C342C"],
  body: ["#0B2A20"],
  muted: ["#4E7568"],
  faint: ["#5E7F71", "#7C9A87", "#9DB49B", "#77857A"],
  scripture: ["#22302A"],

  accent: ["#076653"],
  accent2: ["#1E6B57", "#3E9174"],
  point: ["#E3EF26"],
  ink: ["#06231D", "#0A4A3E"]
};

/** 꾸미기 창에 보이는 이름과 설명 */
export const COLOR_ROLES: { key: ThemeColorKey; name: string; desc: string; group: string }[] = [
  { key: "page", name: "바탕", desc: "화면 맨 뒤 색", group: "면" },
  { key: "card", name: "카드", desc: "흰 카드와 본문 시트", group: "면" },
  { key: "box", name: "상자", desc: "설정 줄 · 묵상 글 · 통독 상자", group: "면" },
  { key: "soft", name: "연한 면", desc: "입력칸 · 상자 안의 상자", group: "면" },
  { key: "mint", name: "연둣빛 면", desc: "아이콘 동그라미 · 작은 뱃지", group: "면" },
  { key: "line", name: "구분선", desc: "칸을 가르는 가는 줄", group: "면" },

  { key: "title", name: "제목", desc: "화면 이름 · 굵은 제목", group: "글씨" },
  { key: "body", name: "본문", desc: "읽는 글 대부분", group: "글씨" },
  { key: "muted", name: "설명 글씨", desc: "제목 밑 작은 설명", group: "글씨" },
  { key: "faint", name: "흐린 글씨", desc: "아직 안 읽은 날 · 옅은 안내", group: "글씨" },
  { key: "scripture", name: "성경 본문", desc: "성경 구절 글씨", group: "글씨" },

  { key: "accent", name: "강조", desc: "갈래 이름 · '이어서 읽기' 같은 강조", group: "포인트" },
  { key: "accent2", name: "보조 강조", desc: "아이콘 · 작은 버튼", group: "포인트" },
  { key: "point", name: "포인트", desc: "이름 동그라미 · 켜진 탭 · 뱃지", group: "포인트" },
  { key: "ink", name: "가장 진한 색", desc: "눌렸을 때 · 짙은 바탕", group: "포인트" }
];

export const GRADIENT_ROLES: { key: ThemeGradientKey; name: string; desc: string }[] = [
  { key: "gradMain", name: "머리말 · 기본 버튼", desc: "맨 위 띠와 초록 버튼" },
  { key: "gradSub", name: "보조 버튼", desc: "구약 버튼처럼 밝은 쪽" },
  { key: "gradBar", name: "하단 탭 막대", desc: "화면 아래 떠 있는 막대" }
];

export const FONTS: { key: ThemeFontKey; name: string; stack: string }[] = [
  { key: "sans", name: "기본 (프리텐다드)", stack: '"Pretendard", "Inter", ui-sans-serif, system-ui, sans-serif' },
  { key: "serif", name: "노토 세리프", stack: '"Noto Serif KR", Georgia, serif' },
  { key: "myeongjo", name: "나눔명조", stack: '"Nanum Myeongjo", "Noto Serif KR", Georgia, serif' }
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

/** 서버·기기에서 온 값을 믿지 않고 한 번 걸러 낸다 (색이 아닌 것이 끼면 화면이 깨진다) */
export function normalizeTheme(raw: unknown): AppTheme {
  const t = { ...DEFAULT_THEME };
  if (!raw || typeof raw !== "object") return t;
  const src = raw as Record<string, unknown>;

  for (const { key } of COLOR_ROLES) {
    const v = src[key];
    if (isHex(v)) t[key] = v.toUpperCase();
  }
  for (const { key } of GRADIENT_ROLES) {
    const g = src[key];
    if (g && typeof g === "object") {
      const gg = g as Record<string, unknown>;
      const angle = Number(gg.angle);
      t[key] = {
        from: isHex(gg.from) ? gg.from.toUpperCase() : DEFAULT_THEME[key].from,
        to: isHex(gg.to) ? gg.to.toUpperCase() : DEFAULT_THEME[key].to,
        angle: Number.isFinite(angle) ? Math.min(360, Math.max(0, Math.round(angle))) : DEFAULT_THEME[key].angle
      };
    }
  }
  if (FONTS.some((f) => f.key === src.font)) t.font = src.font as ThemeFontKey;
  return t;
}

export function isDefaultTheme(t: AppTheme): boolean {
  return JSON.stringify(t) === JSON.stringify(DEFAULT_THEME);
}

export function gradientCss(g: ThemeGradient): string {
  return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
}

/* ── 덮어쓰기 규칙 만들기 ─────────────────────────────────── */

/** 한 색이 쓰일 수 있는 자리들 (Tailwind 로 적어 둔 그대로) */
function rulesForHex(hex: string, varName: string): string[] {
  const v = `var(${varName})`;
  return [
    `[class~="bg-[${hex}]"]{background-color:${v} !important}`,
    `[class~="hover:bg-[${hex}]"]:hover{background-color:${v} !important}`,
    `[class~="text-[${hex}]"]{color:${v} !important}`,
    `[class~="hover:text-[${hex}]"]:hover{color:${v} !important}`,
    `[class~="border-[${hex}]"]{border-color:${v} !important}`,
    `[class~="ring-[${hex}]"]{--tw-ring-color:${v} !important}`,
    `[class~="fill-[${hex}]"]{fill:${v} !important}`,
    `[class~="focus:ring-[${hex}]"]:focus{--tw-ring-color:${v} !important}`,
    `[class~="disabled:bg-[${hex}]"]:disabled{background-color:${v} !important}`
  ];
}

export function buildThemeCss(t: AppTheme): string {
  const out: string[] = [];

  for (const { key } of COLOR_ROLES) {
    if (t[key] === DEFAULT_THEME[key]) continue; // 안 바꾼 색은 건드리지 않는다
    for (const hex of ROLE_HEXES[key]) out.push(...rulesForHex(hex, `--u-${key}`));
  }

  if (t.page !== DEFAULT_THEME.page) out.push(`body{background-color:var(--u-page) !important}`);
  if (t.card !== DEFAULT_THEME.card) {
    out.push(`[class~="bg-white"]{background-color:var(--u-card) !important}`);
    out.push(`[class~="hover:bg-white"]:hover{background-color:var(--u-card) !important}`);
  }

  // 진행률 막대는 두 색을 이어 쓴다 — 한 규칙으로 통째로 다시 그린다
  if (t.accent2 !== DEFAULT_THEME.accent2 || t.point !== DEFAULT_THEME.point) {
    out.push(
      `[class~="from-[#3E9174]"][class~="to-[#E3EF26]"]{background-image:linear-gradient(90deg,var(--u-accent2),var(--u-point)) !important}`
    );
  }

  // 그라데이션 세 벌
  out.push(`.grad-forest,.grad-forest-sheen{background-image:var(--u-grad-main) !important}`);
  out.push(`.grad-teal{background-image:var(--u-grad-sub) !important}`);
  out.push(`.grad-ink,.tabbar-float{background-image:var(--u-grad-bar) !important}`);

  if (t.font !== DEFAULT_THEME.font) {
    out.push(`body,.scripture-font{font-family:var(--u-font) !important}`);
  }

  return out.join("\n");
}

const STYLE_ID = "cho-user-theme";

/** 지금 앱에 이 색을 입힌다 (화면을 새로 그리지 않고 즉시 바뀐다) */
export function applyTheme(t: AppTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const { key } of COLOR_ROLES) root.style.setProperty(`--u-${key}`, t[key]);
  root.style.setProperty("--u-grad-main", gradientCss(t.gradMain));
  root.style.setProperty("--u-grad-sub", gradientCss(t.gradSub));
  root.style.setProperty("--u-grad-bar", gradientCss(t.gradBar));
  root.style.setProperty("--u-font", FONTS.find((f) => f.key === t.font)?.stack || FONTS[0].stack);

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildThemeCss(t);
}

/* ── 기기에 기억해 두기 ───────────────────────────────────── */

const CACHE_KEY = "bible_med_theme";

export function cachedTheme(): AppTheme | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? normalizeTheme(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function cacheTheme(t: AppTheme | null): void {
  try {
    if (t) localStorage.setItem(CACHE_KEY, JSON.stringify(t));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // 저장이 막힌 기기 — 이번 접속에만 적용된다
  }
}

/**
 * 앱이 뜨자마자 기억해 둔 색을 먼저 입힌다.
 * (서버 값을 기다렸다 입히면 기본색이 한 번 번쩍이고 바뀐다)
 */
export function bootTheme(): void {
  const t = cachedTheme();
  if (t) applyTheme(t);
}
