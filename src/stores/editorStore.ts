/**
 * 编辑器状态：当前文件、光标、滚动位置、字数
 */
import { create } from "zustand";
import type { EditorView } from "@codemirror/view";

/** 编辑器 view 引用（非响应式，供大纲等组件直接访问） */
export const editorViewRef: { current: EditorView | null } = { current: null };

interface OpenFile {
  path: string;
  title: string;
  content: string;
  /** 原始内容（用于检测 dirty） */
  savedContent: string;
  isDirty: boolean;
  /** 文件扩展名 */
  ext: string;
}

interface EditorState {
  /** 当前打开的文件列表 */
  openFiles: OpenFile[];
  /** 当前激活文件路径 */
  activeFilePath: string | null;

  // === 当前文件快捷访问 ===
  currentFile: OpenFile | null;

  // === 光标位置 ===
  cursor: { line: number; ch: number };
  setCursor: (cursor: { line: number; ch: number }) => void;

  // === 滚动位置 ===
  scrollPercent: number;
  /** 滚动来源，用于双向同步防循环 */
  scrollSource: "editor" | "preview" | null;
  setScrollPercent: (p: number, source: "editor" | "preview") => void;

  // === 查找替换 ===
  searchVisible: boolean;
  setSearchVisible: (show: boolean) => void;

  // === 待跳转行（纯预览模式下点击大纲触发：先切 split，再由编辑器消费） ===
  pendingJumpLine: number | null;
  setPendingJumpLine: (line: number | null) => void;

  // === 操作 ===
  openFile: (path: string, title: string, content: string) => void;
  closeFile: (path: string) => void;
  switchFile: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  closeAllFiles: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFilePath: null,
  currentFile: null,
  cursor: { line: 1, ch: 0 },
  scrollPercent: 0,
  scrollSource: null,
  searchVisible: false,
  pendingJumpLine: null,

  setCursor: (cursor) => set({ cursor }),
  setScrollPercent: (scrollPercent, source) => set({ scrollPercent, scrollSource: source }),
  setSearchVisible: (searchVisible) => set({ searchVisible }),
  setPendingJumpLine: (pendingJumpLine) => set({ pendingJumpLine }),

  openFile: (path, title, content) => {
    const { openFiles } = get();
    const ext = path.split(".").pop()?.toLowerCase() ?? "md";
    const existing = openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFilePath: path, currentFile: existing });
      return;
    }
    const newFile: OpenFile = {
      path,
      title,
      content,
      savedContent: content,
      isDirty: false,
      ext,
    };
    set({
      openFiles: [...openFiles, newFile],
      activeFilePath: path,
      currentFile: newFile,
    });
  },

  closeFile: (path) => {
    const { openFiles, activeFilePath } = get();
    const next = openFiles.filter((f) => f.path !== path);
    let nextActive = activeFilePath;
    let nextCurrent = get().currentFile;
    if (activeFilePath === path) {
      const idx = openFiles.findIndex((f) => f.path === path);
      const fallback = next[idx] ?? next[idx - 1] ?? null;
      nextActive = fallback?.path ?? null;
      nextCurrent = fallback;
    }
    set({
      openFiles: next,
      activeFilePath: nextActive,
      currentFile: nextCurrent,
    });
  },

  switchFile: (path) => {
    const file = get().openFiles.find((f) => f.path === path) ?? null;
    set({ activeFilePath: path, currentFile: file });
  },

  updateContent: (path, content) => {
    const { openFiles } = get();
    const next = openFiles.map((f) =>
      f.path === path
        ? { ...f, content, isDirty: content !== f.savedContent }
        : f,
    );
    const cur = next.find((f) => f.path === get().activeFilePath) ?? null;
    set({ openFiles: next, currentFile: cur });
  },

  markSaved: (path) => {
    const { openFiles } = get();
    const next = openFiles.map((f) =>
      f.path === path ? { ...f, savedContent: f.content, isDirty: false } : f,
    );
    const cur = next.find((f) => f.path === get().activeFilePath) ?? null;
    set({ openFiles: next, currentFile: cur });
  },

  closeAllFiles: () => set({ openFiles: [], activeFilePath: null, currentFile: null }),
}));
