/**
 * 编辑器状态：当前文件、光标、滚动位置、字数
 */
import { create } from "zustand";
import type { EditorView } from "@codemirror/view";

/** 编辑器 view 引用（非响应式，供目录等组件直接访问） */
export const editorViewRef: { current: EditorView | null } = { current: null };

/** 预览滚动容器引用（非响应式，供编辑器滚动 handler 直接写预览 scrollTop，绕过 React 中转） */
export const previewContainerRef: { current: HTMLElement | null } = { current: null };

/** 预览块级元素缓存（非响应式，html 变化时重建）：{ el, line(源行号), top(相对容器内容顶的稳定偏移) }
 *  滚动同步从百分比升级为行号映射时，按 line 二分查找对应块 */
export const previewBlocksRef: { current: { el: HTMLElement; line: number; top: number }[] } = { current: [] };

/** localStorage key：上次打开的文件路径（重开自动恢复） */
export const ACTIVE_FILE_KEY = "marklite:active-file";

/** 增量持久化当前激活文件路径（仿 fileStore.persist；无关闭事件，故每次切换即写盘） */
function persistActiveFile(path: string | null) {
  try {
    if (path) localStorage.setItem(ACTIVE_FILE_KEY, path);
    else localStorage.removeItem(ACTIVE_FILE_KEY);
  } catch {}
}

/** 把换行符归一化为 LF（\r\n 和单独 \r → \n）。
 *  CodeMirror 内部强制 LF，store 的 content 必须与之保持一致，否则 CRLF 文件
 *  打开后 doc(LF) ≠ content(CRLF)，会被误判为已编辑（dirty）。
 *  仅在文件入口（openFile / reload）调用一次，不进打字热路径。 */
export function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n?/g, "\n");
}

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

  // === 选中文本 ===
  selection: { text: string; chars: number; words: number };
  setSelection: (selection: { text: string; chars: number; words: number }) => void;

  // === 滚动位置 ===
  scrollPercent: number;
  /** scrollPercent 对应的文件路径（用于区分「同文件模式切换→恢复」与「换文件→从顶部」） */
  scrollPercentPath: string | null;
  /** 滚动来源，用于双向同步防循环 */
  scrollSource: "editor" | "preview" | null;
  setScrollPercent: (p: number, source: "editor" | "preview") => void;

  // === 查找替换 ===
  searchVisible: boolean;
  setSearchVisible: (show: boolean) => void;

  // === 单标签模式 ===
  singleTabMode: boolean;
  toggleSingleTabMode: () => void;

  // === 待跳转行（纯预览模式下点击目录触发：先切 split，再由编辑器消费） ===
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
  selection: { text: "", chars: 0, words: 0 },
  scrollPercent: 0,
  scrollPercentPath: null,
  scrollSource: null,
  searchVisible: false,
  singleTabMode: false,
  pendingJumpLine: null,

  setCursor: (cursor) => set({ cursor }),
  setSelection: (selection) => set({ selection }),
  setScrollPercent: (scrollPercent, source) =>
    set({ scrollPercent, scrollSource: source, scrollPercentPath: get().activeFilePath }),
  setSearchVisible: (searchVisible) => set({ searchVisible }),
  toggleSingleTabMode: () => set((s) => ({ singleTabMode: !s.singleTabMode })),
  setPendingJumpLine: (pendingJumpLine) => set({ pendingJumpLine }),

  openFile: (path, title, content) => {
    // 记录到最近使用（延迟导入避免循环依赖）
    import("@/stores/recentStore").then(({ useRecentStore }) => {
      useRecentStore.getState().addRecent(path, title);
    });

    const { openFiles, singleTabMode } = get();
    const ext = path.split(".").pop()?.toLowerCase() ?? "md";
    const existing = openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFilePath: path, currentFile: existing });
      persistActiveFile(path);
      return;
    }
    // 归一化为 LF：与 CodeMirror 内部行表示保持一致，避免 CRLF 文件打开即被判为 dirty
    const normalized = normalizeLineEndings(content);
    const newFile: OpenFile = {
      path,
      title,
      content: normalized,
      savedContent: normalized,
      isDirty: false,
      ext,
    };
    if (singleTabMode && openFiles.length > 0) {
      // 单标签模式：替换当前标签
      const activeIdx = openFiles.findIndex((f) => f.path === get().activeFilePath);
      const idx = activeIdx >= 0 ? activeIdx : 0;
      const next = [...openFiles];
      next[idx] = newFile;
      set({ openFiles: next, activeFilePath: path, currentFile: newFile });
    } else {
      // 正常模式：追加新标签
      set({
        openFiles: [...openFiles, newFile],
        activeFilePath: path,
        currentFile: newFile,
      });
    }
    persistActiveFile(path);
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
    persistActiveFile(nextActive);
  },

  switchFile: (path) => {
    const file = get().openFiles.find((f) => f.path === path) ?? null;
    set({ activeFilePath: path, currentFile: file });
    persistActiveFile(path);
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

  closeAllFiles: () => {
    set({ openFiles: [], activeFilePath: null, currentFile: null });
    persistActiveFile(null);
  },
}));
