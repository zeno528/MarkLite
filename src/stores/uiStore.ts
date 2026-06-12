/**
 * UI 状态：主题、布局、侧边栏可见性、字体大小等
 */
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type LayoutMode = "split" | "editor-only" | "preview-only";

interface UIState {
  // 主题
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;

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

export const useUIStore = create<UIState>((set, get) => ({
  // 主题默认跟随系统
  theme: "system",
  resolvedTheme: "light",
  setTheme: (theme) => {
    set({ theme });
    // 立即应用
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (theme === "system") {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const resolved = mq.matches ? "dark" : "light";
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        set({ resolvedTheme: resolved });
      } else {
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        set({ resolvedTheme: theme });
      }
      // 持久化
      try {
        localStorage.setItem("marklite:theme", theme);
      } catch {}
    }
  },
  setResolvedTheme: (resolvedTheme) => {
    set({ resolvedTheme });
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    }
  },

  // 布局
  layout: "split",
  setLayout: (layout) => set({ layout }),
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
  setFontSize: (fontSize) => set({ fontSize }),
  fontFamily: "JetBrains Mono",
  setFontFamily: (fontFamily) => set({ fontFamily }),
}));

// 启动时从 localStorage 恢复主题
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("marklite:theme") as ThemeMode | null;
    if (saved) {
      useUIStore.getState().setTheme(saved);
    } else {
      // 应用系统主题
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const resolved = mq.matches ? "dark" : "light";
      useUIStore.getState().setResolvedTheme(resolved);
    }
  } catch {}
}
