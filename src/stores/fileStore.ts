/**
 * 文件夹/文件树状态
 */
import { create } from "zustand";

/** 持久化上次打开的文件夹（localStorage key） */
export const ROOTFOLDER_KEY = "marklite:rootfolder";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface FileState {
  /** 根目录路径 */
  rootFolder: string | null;
  /** 文件树 */
  fileTree: FileNode[];
  /** 展开的目录 */
  expanded: Set<string>;
  /** 选中文件 */
  selectedPath: string | null;

  // === 操作 ===
  setRootFolder: (path: string | null) => void;
  setFileTree: (tree: FileNode[]) => void;
  toggleExpand: (path: string) => void;
  expandPath: (path: string) => void;
  setSelected: (path: string | null) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootFolder: null,
  fileTree: [],
  expanded: new Set(),
  selectedPath: null,

  setRootFolder: (rootFolder) => {
    set({ rootFolder, fileTree: [], expanded: new Set(), selectedPath: null });
    try {
      if (rootFolder) localStorage.setItem(ROOTFOLDER_KEY, rootFolder);
      else localStorage.removeItem(ROOTFOLDER_KEY);
    } catch {}
  },
  setFileTree: (fileTree) => set({ fileTree }),
  toggleExpand: (path) => {
    const expanded = new Set(get().expanded);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expanded });
  },
  expandPath: (path) => {
    const expanded = new Set(get().expanded);
    expanded.add(path);
    set({ expanded });
  },
  setSelected: (selectedPath) => set({ selectedPath }),
}));
