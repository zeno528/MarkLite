/**
 * UI 状态：配色方案、写作模式、布局、侧边栏可见性、字体大小等
 *
 * 配色架构「配色即外观」(Typola 式)：
 * - colorScheme 决定 <html data-scheme>，驱动全部 CSS 变量（编辑器/预览/组件全联动）
 * - resolvedTheme 从方案 mode 派生，供 CodeMirror / Shiki 选择亮/暗渲染
 */
import { create } from "zustand";
import {
  type ColorScheme,
  type SchemeId,
  SCHEME_MODE,
  resolveScheme,
  resolveSystemScheme,
} from "@/lib/theme/colorSchemes";

export type ResolvedTheme = "light" | "dark";
export type LayoutMode = "split" | "editor-only" | "preview-only";

const STORAGE_KEY = "marklite:colorscheme";
const LEGACY_KEY = "marklite:theme";
const FONT_SIZE_KEY = "marklite:fontsize";
const FONT_FAMILY_KEY = "marklite:fontfamily";
const LAYOUT_KEY = "marklite:layout";

interface UIState {
  // 配色方案
  colorScheme: ColorScheme; // 用户选择（含 "system"）
  resolvedScheme: SchemeId; // 实际生效方案
  resolvedTheme: ResolvedTheme; // 派生明暗（供 CodeMirror / Shiki）
  setColorScheme: (scheme: ColorScheme) => void;
  /** 系统明暗变化时调用，仅当 colorScheme==="system" 时生效 */
  applySystemScheme: (isDark: boolean) => void;

  // 布局
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;
  toggleLayout: () => void;

  // 侧边栏
  showSidebar: boolean;
  toggleSidebar: () => void;
  setShowSidebar: (show: boolean) => void;
  sidebarTab: "files" | "outline";
  setSidebarTab: (tab: "files" | "outline") => void;

  // 状态栏
  showStatusBar: boolean;
  toggleStatusBar: () => void;

  // 字体大小
  fontSize: number; // px
  setFontSize: (size: number) => void;

  // 字体族
  fontFamily: string;
  setFontFamily: (family: string) => void;
}

/** 把具体方案应用到 <html data-scheme>，返回其明暗模式 */
function applyScheme(root: HTMLElement, scheme: SchemeId): ResolvedTheme {
  root.setAttribute("data-scheme", scheme);
  return SCHEME_MODE[scheme];
}

export const useUIStore = create<UIState>((set, get) => ({
  // 配色默认跟随系统
  colorScheme: "system",
  resolvedScheme: "violet",
  resolvedTheme: "light",

  setColorScheme: (colorScheme) => {
    set({ colorScheme });
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = resolveScheme(colorScheme, systemIsDark);
    const mode = applyScheme(root, resolved);
    set({ resolvedScheme: resolved, resolvedTheme: mode });
    try {
      localStorage.setItem(STORAGE_KEY, colorScheme);
    } catch {}
  },

  applySystemScheme: (isDark) => {
    // 仅当用户选择「跟随系统」时才响应系统明暗变化
    if (get().colorScheme !== "system") return;
    const root = document.documentElement;
    const resolved = resolveSystemScheme(isDark);
    const mode = applyScheme(root, resolved);
    set({ resolvedScheme: resolved, resolvedTheme: mode });
  },

  // 布局
  layout: "editor-only",
  setLayout: (layout) => {
    set({ layout });
    try { localStorage.setItem(LAYOUT_KEY, layout); } catch {}
  },
  toggleLayout: () => {
    const cur = get().layout;
    const next: LayoutMode =
      cur === "split" ? "editor-only" : cur === "editor-only" ? "preview-only" : "split";
    set({ layout: next });
  },

  // 侧边栏
  showSidebar: true,
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setShowSidebar: (showSidebar) => set({ showSidebar }),
  sidebarTab: "files",
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  // 状态栏
  showStatusBar: true,
  toggleStatusBar: () => set((s) => ({ showStatusBar: !s.showStatusBar })),

  // 字体
  fontSize: 14,
  setFontSize: (fontSize) => {
    set({ fontSize });
    try { localStorage.setItem(FONT_SIZE_KEY, String(fontSize)); } catch {}
  },
  fontFamily: "JetBrains Mono",
  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    try { localStorage.setItem(FONT_FAMILY_KEY, fontFamily); } catch {}
  },
}));

// 启动时恢复配色方案（含旧 marklite:theme 迁移）
// setColorScheme 在模块导入时同步执行，早于 React 首帧，配合 Tauri win.show() rAF 闸门防闪烁
if (typeof window !== "undefined") {
  try {
    let saved = localStorage.getItem(STORAGE_KEY) as ColorScheme | null;
    // 兼容迁移旧 marklite:theme（light/dark/system）
    if (!saved) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === "light") saved = "violet";
      else if (legacy === "dark") saved = "midnight";
      else if (legacy === "system") saved = "system";
      if (saved) {
        localStorage.setItem(STORAGE_KEY, saved);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    useUIStore.getState().setColorScheme(saved ?? "system");

    // 恢复字体设置（fontSize / fontFamily）
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
    if (savedFontSize && Number.isFinite(+savedFontSize)) {
      useUIStore.setState({ fontSize: +savedFontSize });
    }
    const savedFontFamily = localStorage.getItem(FONT_FAMILY_KEY);
    if (savedFontFamily) useUIStore.setState({ fontFamily: savedFontFamily });

    // 恢复布局（layout）
    const savedLayout = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null;
    if (savedLayout) useUIStore.setState({ layout: savedLayout });
  } catch {}
}
