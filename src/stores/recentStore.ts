/**
 * 最近使用文件 store
 *
 * 记录所有打开过的文件，支持固定（pin）和清空（clear unpinned）。
 * 固定的文件置顶且不受清空影响。
 * 持久化到 localStorage。
 */
import { create } from "zustand";

export interface RecentFile {
  path: string;
  title: string;
  pinned: boolean;
  lastOpened: number;
}

const STORAGE_KEY = "marklite:recent-files";
const MAX_RECENT = 30;

/** 持久化到 localStorage */
function persist(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {}
}

/** 从 localStorage 恢复 */
function restore(): RecentFile[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

interface RecentState {
  files: RecentFile[];
  /** 记录打开的文件（已存在则更新时间戳并移到顶部） */
  addRecent: (path: string, title: string) => void;
  /** 切换固定状态 */
  togglePin: (path: string) => void;
  /** 移除单条记录 */
  removeRecent: (path: string) => void;
  /** 清空所有未固定的记录 */
  clearUnpinned: () => void;
}

export const useRecentStore = create<RecentState>((set) => ({
  files: restore(),

  addRecent: (path, title) => {
    set((state) => {
      const existing = state.files.find((f) => f.path === path);
      const now = Date.now();

      let next: RecentFile[];
      if (existing) {
        // 已存在：更新标题和时间戳
        next = [
          { ...existing, title, lastOpened: now },
          ...state.files.filter((f) => f.path !== path),
        ];
      } else {
        // 新记录：插入顶部
        next = [{ path, title, pinned: false, lastOpened: now }, ...state.files];
      }

      // 按固定状态排序：pinned 在前（各自保持插入顺序），unpinned 在后
      const pinned = next.filter((f) => f.pinned);
      const unpinned = next.filter((f) => !f.pinned);
      // unpinned 只保留 MAX_RECENT 条
      const trimmed = [...pinned, ...unpinned.slice(0, MAX_RECENT)];
      persist(trimmed);
      return { files: trimmed };
    });
  },

  togglePin: (path) => {
    set((state) => {
      const next = state.files.map((f) =>
        f.path === path ? { ...f, pinned: !f.pinned } : f,
      );
      // 固定的移到前面
      const pinned = next.filter((f) => f.pinned);
      const unpinned = next.filter((f) => !f.pinned);
      const sorted = [...pinned, ...unpinned];
      persist(sorted);
      return { files: sorted };
    });
  },

  removeRecent: (path) => {
    set((state) => {
      const next = state.files.filter((f) => f.path !== path);
      persist(next);
      return { files: next };
    });
  },

  clearUnpinned: () => {
    set((state) => {
      const next = state.files.filter((f) => f.pinned);
      persist(next);
      return { files: next };
    });
  },
}));
