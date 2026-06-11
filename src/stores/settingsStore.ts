/**
 * 持久化设置（用 Tauri Store 插件保存到磁盘）
 */
import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";

interface SettingsState {
  // === 编辑器 ===
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  /** 自动保存 */
  autoSave: boolean;
  autoSaveDelay: number; // ms

  // === Markdown ===
  /** 同步滚动 */
  scrollSync: boolean;

  // === 状态 ===
  loaded: boolean;
  store: Store | null;

  // === 操作 ===
  init: () => Promise<void>;
  update: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => Promise<void>;
  save: () => Promise<void>;
}

const DEFAULTS = {
  tabSize: 2,
  wordWrap: true,
  lineNumbers: false,
  autoSave: true,
  autoSaveDelay: 2000,
  scrollSync: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  store: null,

  init: async () => {
    // 仅在 Tauri 运行时初始化（浏览器调试时跳过）
    if (typeof window === "undefined" || !(window as any).__TAURI_INTERNALS__) {
      set({ loaded: true });
      return;
    }
    try {
      const store = await load("settings.json", { autoSave: true } as Parameters<typeof load>[1] & { autoSave: boolean });
      const keys = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[];
      const loaded: Record<string, unknown> = {};
      for (const key of keys) {
        const v = await store.get<unknown>(key);
        if (v !== null && v !== undefined) loaded[key] = v;
      }
      set({ ...loaded, store, loaded: true });
    } catch (e) {
      console.error("[settings] init failed:", e);
      set({ loaded: true });
    }
  },

  update: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    const { store } = get();
    if (store) {
      try {
        await store.set(key, value);
      } catch (e) {
        console.error("[settings] update failed:", e);
      }
    }
  },

  save: async () => {
    const { store } = get();
    if (store) await store.save();
  },
}));
