/**
 * 配色方案系统 — 方案元数据与解析函数的唯一事实来源
 *
 * 架构「配色即外观」(Typora 式)：每个方案是一套完整外观（自带明暗）。
 * - 具体 CSS 变量定义在 src/styles/globals.css 的 :root / :root[data-scheme="..."]
 * - 这里只维护方案的「身份信息」(id/name/desc/mode/色板)，供设置面板卡片、工具栏色点、派生 resolvedTheme 使用
 */

/** 具体配色方案 id（不含 system） */
export type SchemeId = "violet" | "paper" | "midnight";

/** 用户可选的配色方案（含跟随系统） */
export type ColorScheme = SchemeId | "system";

/** 方案明暗模式，用于派生 resolvedTheme（驱动 CodeMirror / Shiki） */
export type SchemeMode = "light" | "dark";

/** 方案元数据，驱动设置卡片 UI 与工具栏色点 */
export interface SchemeMeta {
  id: SchemeId;
  name: string;
  desc: string;
  mode: SchemeMode;
  /** 色板（hex，仅用于 UI 预览圆点，不参与实际配色） */
  swatch: { bg: string; surface: string; accent: string };
}

/** 全部配色方案 */
export const COLOR_SCHEMES: readonly SchemeMeta[] = [
  {
    id: "violet",
    name: "柔和紫",
    desc: "浅蓝灰底 · 紫色点缀",
    mode: "light",
    swatch: { bg: "#eef0f7", surface: "#ffffff", accent: "#7c6ff0" },
  },
  {
    id: "paper",
    name: "纯净纸白",
    desc: "暖白纸感 · 暖棕点缀",
    mode: "light",
    swatch: { bg: "#faf9f6", surface: "#ffffff", accent: "#b8865b" },
  },
  {
    id: "midnight",
    name: "深空蓝",
    desc: "深蓝夜色 · 青蓝点缀",
    mode: "dark",
    swatch: { bg: "#1b1f27", surface: "#232833", accent: "#38bdf8" },
  },
] as const;

/** 方案 → 明暗模式映射，用于派生 resolvedTheme */
export const SCHEME_MODE: Record<SchemeId, SchemeMode> = {
  violet: "light",
  paper: "light",
  midnight: "dark",
};

/** 跟随系统时：系统深色 → 深空蓝，系统浅色 → 柔和紫（默认浅色方案） */
export function resolveSystemScheme(isDark: boolean): SchemeId {
  return isDark ? "midnight" : "violet";
}

/** 把（可能为 system 的）配色方案解析为具体方案 id */
export function resolveScheme(scheme: ColorScheme, systemIsDark: boolean): SchemeId {
  return scheme === "system" ? resolveSystemScheme(systemIsDark) : scheme;
}

/** 按 id 取方案元数据，找不到时回退到首个（violet） */
export function getSchemeMeta(id: SchemeId): SchemeMeta {
  return COLOR_SCHEMES.find((s) => s.id === id) ?? COLOR_SCHEMES[0];
}
