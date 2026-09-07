/**
 * 앱 색 꾸미기 · 밝게/어둡게.
 *
 * 앱의 색은 화면 코드 곳곳에 `bg-[#F9F9F9]` 같은 값으로 박혀 있다(1,200 곳 남짓).
 * 그걸 하나하나 고치지 않고도 색을 바꿀 수 있게, **덮어쓰기 규칙**을 만들어 붙인다.
 *
 *   [class~="bg-[#F9F9F9]"] { background-color: var(--u-box) !important }
 *
 * 이렇게 하면 그 색을 쓰는 모든 자리가 한 번에 바뀐다.
 * 같은 뜻으로 쓰이던 비슷한 색들(연한 면 예닐곱 가지 등)은 한 갈래로 묶었다.
 *
 * - 관리자가 저장한 색은 서버에 남아 **공동체 모두**의 앱에 적용된다 (밝은 화면).
 * - 어둡게(다크)는 **기기마다 각자** 고른다. 어둡게로 두면 아래 DARK_THEME 을 쓴다.
 *
 * ⚠️ 화면 코드의 색 값을 바꾸면 아래 ROLE_HEXES 도 함께 고쳐야 한다.
 *    안 그러면 그 색만 꾸미기·다크에서 안 바뀐다.
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
  /* 글꼴 */
  font: ThemeFontKey;
}

/** 지금 앱이 실제로 쓰고 있는 색 (화면 코드에 박혀 있는 값 그대로) */
export const DEFAULT_THEME: AppTheme = {
  page: "#EDF0EA",
  card: "#FFFFFF",
  box: "#F9F9F9",
  soft: "#F5F5F5",
  mint: "#D2DDD3",
  line: "#E3E9E2",

  title: "#0C3B2E",
  body: "#14261E",
  muted: "#6F8377",
  faint: "#A8B3A9",
  scripture: "#333333",

  accent: "#0F4A39",
  accent2: "#4A6B57",
  point: "#FFBA00",
  ink: "#072A20",

  gradMain: { from: "#2F7358", to: "#153A2B", angle: 135 },
  gradSub: { from: "#2B8577", to: "#195C50", angle: 135 },

  font: "sans"
};

/**
 * 어두운 화면.
 *
 * 같은 갈래가 글씨로도 쓰이고 바탕으로도 쓰이는 자리가 있어서
 * (예: accent2 는 아이콘 색이면서 '공유하기' 단추의 바탕이다),
 * 강조 초록은 **흰 글씨를 얹어도 읽히는 중간 밝기**로 잡았다.
 */
export const DARK_THEME: AppTheme = {
  page: "#0D1411",
  card: "#161E1A",
  box: "#1D2723",
  soft: "#232E29",
  mint: "#2B3A34",
  line: "#2A3630",

  title: "#EAF2EC",
  body: "#DDE7E1",
  muted: "#9FB2A8",
  faint: "#7B8D84",
  scripture: "#E2EAE5",

  accent: "#3FA07C",
  accent2: "#35906F",
  point: "#FFC533",
  ink: "#C6D6CE",

  gradMain: { from: "#17493A", to: "#0A1F18", angle: 135 },
  gradSub: { from: "#1B6455", to: "#0E3A30", angle: 135 },

  font: "sans"
};

/**
 * 어두운 화면에서 **바탕으로 쓰일 때만** 다른 색을 쓰는 갈래.
 *
 * 예: 진초록(#0C3B2E)은 밝은 화면에서 제목 글씨이면서 진초록 단추의 바탕이다.
 * 어둡게에서 글씨는 밝아져야 하지만, 단추 바탕까지 밝아지면 그 위의 흰 글씨가 사라진다.
 * 그래서 바탕에는 이 표의 색을 쓴다.
 */
const DARK_SURFACE: Partial<Record<ThemeColorKey, string>> = {
  title: "#24453A", // 진초록 단추 · 알림 띠
  ink: "#0A120F"    // 눌렸을 때 더 어두워지는 자리
};

export type ThemeColorKey = Exclude<keyof AppTheme, "gradMain" | "gradSub" | "font">;
export type ThemeGradientKey = "gradMain" | "gradSub";

/** 밝게 / 어둡게 / 기기 설정 따름 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 한 갈래가 실제로 덮어쓰는 색들.
 * 화면 코드에 박혀 있는 값 그대로 적는다 — 여기 없는 색은 안 바뀐다.
 */
const ROLE_HEXES: Record<ThemeColorKey, string[]> = {
  page: ["#EDF0EA"],
  card: [], // 흰 카드는 .bg-white 로 따로 덮는다
  box: ["#F9F9F9", "#F0F0F0", "#FBFBFB", "#FAFAFA"],
  // #F2F6F3 은 면이 아니라 **진초록 머리말 위의 글씨색** 이라 여기 넣지 않는다
  soft: ["#F5F5F5", "#F4F4F4", "#F2F2F2", "#F1F4EE", "#EDF2EE", "#E8F0E9", "#FFFBEE", "#FFF6DC", "#FFF7E0", "#FFF4DC"],
  mint: ["#D2DDD3", "#C7D8C9", "#C3D6C6", "#D8DED9"],
  line: ["#E3E9E2", "#EDEDED", "#EAEAEA", "#E8E8E8", "#E4E4E4", "#DEE3E6"],

  title: ["#0C3B2E"],
  body: ["#14261E"],
  muted: ["#6F8377"],
  faint: ["#A8B3A9", "#AFC0B2", "#C7CFC8", "#8B8B8B", "#85888F"],
  scripture: ["#333333"],

  accent: ["#0F4A39", "#226347"],
  accent2: ["#4A6B57", "#6D9773"],
  point: ["#FFBA00"],
  ink: ["#072A20"]
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
  { key: "faint", name: "흐린 글씨", desc: "옅은 안내 · 지난 날짜", group: "글씨" },
  { key: "scripture", name: "성경 본문", desc: "성경 구절 글씨", group: "글씨" },

  { key: "accent", name: "강조", desc: "강조 글씨 · 진한 단추", group: "포인트" },
  { key: "accent2", name: "보조 강조", desc: "아이콘 · 초록 단추", group: "포인트" },
  { key: "point", name: "포인트", desc: "이름 동그라미 · 좋아요 · 뱃지", group: "포인트" },
  { key: "ink", name: "가장 진한 색", desc: "눌렸을 때 · 짙은 바탕", group: "포인트" }
];

export const GRADIENT_ROLES: { key: ThemeGradientKey; name: string; desc: string }[] = [
  { key: "gradMain", name: "머리말 · 기본 버튼", desc: "맨 위 띠와 진초록 버튼" },
  { key: "gradSub", name: "보조 버튼", desc: "구약 버튼처럼 밝은 쪽" }
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
export function normalizeTheme(raw: unknown, base: AppTheme = DEFAULT_THEME): AppTheme {
  const t = { ...base };
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
        from: isHex(gg.from) ? gg.from.toUpperCase() : base[key].from,
        to: isHex(gg.to) ? gg.to.toUpperCase() : base[key].to,
        angle: Number.isFinite(angle) ? Math.min(360, Math.max(0, Math.round(angle))) : base[key].angle
      };
    }
  }
  if (FONTS.some((f) => f.key === src.font)) t.font = src.font as ThemeFontKey;
  return t;
}

export function gradientCss(g: ThemeGradient): string {
  return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
}

/* ── 덮어쓰기 규칙 만들기 ─────────────────────────────────── */

/** 한 색이 쓰일 수 있는 자리들 (Tailwind 로 적어 둔 그대로) */
function rulesForHex(hex: string, varName: string): string[] {
  const v = `var(${varName})`;
  // 바탕은 따로 — 어두운 화면에서 글씨와 바탕이 서로 반대여야 하는 갈래가 있다
  const bg = `var(${varName}-bg)`;
  return [
    `[class~="bg-[${hex}]"]{background-color:${bg} !important}`,
    `[class~="hover:bg-[${hex}]"]:hover{background-color:${bg} !important}`,
    `[class~="text-[${hex}]"]{color:${v} !important}`,
    `[class~="hover:text-[${hex}]"]:hover{color:${v} !important}`,
    `[class~="border-[${hex}]"]{border-color:${v} !important}`,
    `[class~="ring-[${hex}]"]{--tw-ring-color:${v} !important}`,
    `[class~="fill-[${hex}]"]{fill:${v} !important}`,
    `[class~="focus:ring-[${hex}]"]:focus{--tw-ring-color:${v} !important}`,
    `[class~="disabled:bg-[${hex}]"]:disabled{background-color:${bg} !important}`
  ];
}

export function buildThemeCss(t: AppTheme, dark: boolean): string {
  const out: string[] = [];
  const base = dark ? DARK_THEME : DEFAULT_THEME;

  for (const { key } of COLOR_ROLES) {
    // 어두운 화면에서는 갈래를 전부 덮어야 한다 (기본색과 같은 값이 하나도 없다)
    if (!dark && t[key] === DEFAULT_THEME[key]) continue;
    for (const hex of ROLE_HEXES[key]) out.push(...rulesForHex(hex, `--u-${key}`));
  }

  if (dark || t.page !== DEFAULT_THEME.page) out.push(`body{background-color:var(--u-page) !important}`);
  if (dark || t.card !== DEFAULT_THEME.card) {
    out.push(`[class~="bg-white"],[class~="bg-[#FFFFFF]"]{background-color:var(--u-card-bg) !important}`);
    out.push(`[class~="hover:bg-white"]:hover{background-color:var(--u-card-bg) !important}`);
  }

  // 진행률 막대는 두 색을 이어 쓴다 — 한 규칙으로 통째로 다시 그린다
  if (dark || t.accent2 !== DEFAULT_THEME.accent2 || t.point !== DEFAULT_THEME.point) {
    out.push(
      `[class~="from-[#6D9773]"][class~="to-[#FFBA00]"]{background-image:linear-gradient(90deg,var(--u-accent2),var(--u-point)) !important}`
    );
  }

  out.push(`.grad-forest,.grad-forest-sheen{background-image:var(--u-grad-main) !important}`);
  out.push(`.grad-teal{background-image:var(--u-grad-sub) !important}`);

  if (t.font !== base.font) {
    out.push(`body,.scripture-font{font-family:var(--u-font) !important}`);
  }

  return out.join("\n");
}

const STYLE_ID = "cho-user-theme";

/** 지금 앱에 이 색을 입힌다 (화면을 새로 그리지 않고 즉시 바뀐다) */
export function applyTheme(t: AppTheme, dark = false): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const { key } of COLOR_ROLES) {
    root.style.setProperty(`--u-${key}`, t[key]);
    // 바탕으로 쓰일 때의 색 (어두운 화면에서만 갈라진다)
    root.style.setProperty(`--u-${key}-bg`, (dark && DARK_SURFACE[key]) || t[key]);
  }
  root.style.setProperty("--u-grad-main", gradientCss(t.gradMain));
  root.style.setProperty("--u-grad-sub", gradientCss(t.gradSub));
  root.style.setProperty("--u-font", FONTS.find((f) => f.key === t.font)?.stack || FONTS[0].stack);

  // 어두운 화면에서만 손봐야 하는 것들(그림자·붉은 알림 상자 등)은 CSS 쪽에서 이 표시를 본다
  root.setAttribute("data-theme", dark ? "dark" : "light");

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildThemeCss(t, dark);
}

/* ── 기기에 기억해 두기 ───────────────────────────────────── */

const CACHE_KEY = "bible_med_theme";
const MODE_KEY = "bible_med_theme_mode";

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

export function savedMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === "dark" || v === "light" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

export function saveMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // 무시
  }
}

/** 기기 설정을 따를 때, 지금 이 기기가 어두운 화면인지 */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function isDarkNow(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemPrefersDark());
}

/** 지금 화면에 입힐 색 한 벌 (어두우면 공동체 색 대신 어두운 색을 쓴다) */
export function effectiveTheme(community: AppTheme, mode: ThemeMode): AppTheme {
  return isDarkNow(mode) ? DARK_THEME : community;
}

/**
 * 앱이 뜨자마자 기억해 둔 색을 먼저 입힌다.
 * (서버 값을 기다렸다 입히면 기본색이 한 번 번쩍이고 바뀐다)
 */
export function bootTheme(): void {
  const mode = savedMode();
  const dark = isDarkNow(mode);
  const t = dark ? DARK_THEME : cachedTheme();
  if (t) applyTheme(t, dark);
}
