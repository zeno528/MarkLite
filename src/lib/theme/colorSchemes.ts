import type { I18n } from "@lingui/core";

/**
 * 配色方案系统 — 方案元数据与解析函数的唯一事实来源
 *
 * 架构「配色即外观」(Typora 式)：每个方案是一套完整外观（自带明暗）。
 * - 具体 CSS 变量定义在 src/styles/globals.css 的 :root / :root[data-scheme="..."]
 * - 这里只维护方案的「身份信息」(id/name/desc/mode/色板)，供设置面板卡片、工具栏色点、派生 resolvedTheme 使用
 */

/** 具体配色方案 id（不含 system） */
export type SchemeId = "violet" | "paper" | "amber" | "midnight" | "ember" | "notion" | "github" | "ink";

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
    id: "paper",
    name: "纸白",
    desc: "暖白纸感",
    mode: "light",
    swatch: { bg: "#faf9f6", surface: "#ffffff", accent: "#b8865b" },
  },
  {
    id: "violet",
    name: "薰衣草",
    desc: "淡紫柔和",
    mode: "light",
    swatch: { bg: "#eef0f7", surface: "#ffffff", accent: "#7c6ff0" },
  },
  {
    id: "amber",
    name: "琥珀",
    desc: "暖橙活力",
    mode: "light",
    swatch: { bg: "#f8f5ef", surface: "#ffffff", accent: "#D97706" },
  },
  {
    id: "notion",
    name: "Notion",
    desc: "简洁纯净",
    mode: "light",
    swatch: { bg: "#ffffff", surface: "#ffffff", accent: "#2eaadc" },
  },
  {
    id: "github",
    name: "GitHub",
    desc: "开发者风格",
    mode: "light",
    swatch: { bg: "#f6f8fa", surface: "#ffffff", accent: "#0969da" },
  },
  {
    id: "midnight",
    name: "子夜",
    desc: "深蓝夜色",
    mode: "dark",
    swatch: { bg: "#1b1f27", surface: "#232833", accent: "#38bdf8" },
  },
  {
    id: "ember",
    name: "余烬",
    desc: "暖橙深邃",
    mode: "dark",
    swatch: { bg: "#241e18", surface: "#2e2720", accent: "#FFA344" },
  },
  {
    id: "ink",
    name: "墨黑",
    desc: "纯黑护眼",
    mode: "dark",
    swatch: { bg: "#0d1117", surface: "#161b22", accent: "#58a6ff" },
  },
] as const;

/** 方案 → 明暗模式映射，用于派生 resolvedTheme */
export const SCHEME_MODE: Record<SchemeId, SchemeMode> = {
  violet: "light",
  paper: "light",
  amber: "light",
  notion: "light",
  github: "light",
  midnight: "dark",
  ember: "dark",
  ink: "dark",
};

/** 跟随系统时：系统深色 → 子夜，系统浅色 → 纸白（默认浅色方案） */
export function resolveSystemScheme(isDark: boolean): SchemeId {
  return isDark ? "midnight" : "paper";
}

/** 把（可能为 system 的）配色方案解析为具体方案 id */
export function resolveScheme(scheme: ColorScheme, systemIsDark: boolean): SchemeId {
  return scheme === "system" ? resolveSystemScheme(systemIsDark) : scheme;
}

/** 方案 id → i18n 源 msgid（中文是源语言；po 文件里有英文翻译条目） */
const SCHEME_NAME_MSGID: Record<SchemeId, string> = {
  paper: "纸白",
  violet: "薰衣草",
  amber: "琥珀",
  notion: "Notion",
  github: "GitHub",
  midnight: "子夜",
  ember: "余烬",
  ink: "墨黑",
};

/**
 * 获取方案当前 locale 的显示名。
 * - 传 i18n：按当前 locale 翻译（中文返回 "纸白"，英文返回 "Paper"）
 * - 不传 i18n：fallback 到源 msgid（用于非 React 上下文）
 */
export function getSchemeName(scheme: SchemeId, i18n?: I18n): string {
  const msgid = SCHEME_NAME_MSGID[scheme];
  if (!i18n) return msgid;
  return i18n.t(msgid);
}