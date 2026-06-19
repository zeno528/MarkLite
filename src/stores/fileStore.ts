/**
 * 文件夹/文件树状态（多文件夹工作区）
 *
 * 每个文件夹是一个 WorkspaceFolder 实体，自带 fileTree / expanded / selectedPath，
 * 切换 activeFolder 不影响其他文件夹的状态（per-folder 记忆）。
 * folders 元数据 + activeFolderPath 持久化到 localStorage（fileTree 不持久化，启动重读）。
 *
 * 性能优化：
 * - 文件树缓存：避免重复读取未变化的文件夹
 * - 并行读取：使用 Promise.all 并行处理多个文件夹
 * - 延迟加载：非激活文件夹延迟加载
 */
import { create } from "zustand";
import { FileService } from "@/lib/tauri/fs";
import { useEditorStore } from "@/stores/editorStore";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

/** 文件树缓存：path → { tree, timestamp } */
const treeCache = new Map<string, { tree: FileNode[]; timestamp: number }>();
const CACHE_TTL = 30_000; // 30秒缓存过期

/** 单个工作区文件夹（自带各自的展开/选中状态） */
export interface WorkspaceFolder {
  path: string;
  fileTree: FileNode[];
  expanded: string[];
  selectedPath: string | null;
}

interface FileState {
  folders: WorkspaceFolder[];
  activeFolderPath: string | null;

  /** 添加文件夹：已存在则仅切 active（并懒读树），否则读树后加入并设 active */
  addFolder: (path: string) => Promise<void>;
  /** 关闭文件夹：移出列表；若 active 被关则切首个或 null */
  removeFolder: (path: string) => void;
  /** 切换当前激活文件夹（不触碰任何 folder 的 expanded/selected） */
  setActiveFolder: (path: string) => void;
  /** 切换 activeFolder 内某目录的展开/折叠 */
  toggleExpand: (path: string) => void;
  /** 智能切换 activeFolder 全部目录的展开/收起：已全展开则收起，否则展开全部 */
  toggleExpandAll: () => void;
  /** 设置 activeFolder 内的选中项 */
  setSelected: (path: string | null) => void;
  /** 重新读 activeFolder 的文件树（刷新） */
  refreshActiveTree: () => Promise<void>;
  /** 重新读所有已添加文件夹的文件树 */
  refreshAllTrees: () => Promise<void>;
  /** 清除所有文件夹（恢复到全新状态） */
  clearAllFolders: () => void;
}

/** localStorage keys */
export const FOLDERS_KEY = "marklite:folders";
export const ACTIVE_FOLDER_KEY = "marklite:active-folder";

/** 持久化 folders 元数据（不含 fileTree）+ activeFolderPath */
function persist(folders: WorkspaceFolder[], activeFolderPath: string | null) {
  try {
    const meta = folders.map((f) => ({
      path: f.path,
      expanded: f.expanded,
      selectedPath: f.selectedPath,
    }));
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(meta));
    if (activeFolderPath) localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderPath);
    else localStorage.removeItem(ACTIVE_FOLDER_KEY);
  } catch {}
}

/** 更新某个 folder（按 path 匹配），返回新 folders 数组 */
function patchFolder(
  folders: WorkspaceFolder[],
  path: string,
  patch: (f: WorkspaceFolder) => WorkspaceFolder,
): WorkspaceFolder[] {
  return folders.map((f) => (f.path === path ? patch(f) : f));
}

/** 递归收集文件树中所有目录节点的 path（用于"展开全部"；用内部 walk 避免每层 concat 开销） */
export function collectDirPaths(nodes: FileNode[]): string[] {
  const result: string[] = [];
  const walk = (list: FileNode[]) => {
    for (const n of list) {
      if (n.isDir) {
        result.push(n.path);
        if (n.children) walk(n.children);
      }
    }
  };
  walk(nodes);
  return result;
}

/** 判断文件路径是否位于文件夹之下（含文件夹自身）— 跨平台分隔符 + 大小写不敏感 */
function isUnderFolder(filePath: string, folderPath: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const f = norm(filePath);
  const dir = norm(folderPath);
  return f === dir || f.startsWith(dir + "/");
}

/** 读取文件树（带缓存） */
async function readTreeWithCache(path: string): Promise<FileNode[]> {
  const cached = treeCache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tree;
  }
  const tree = await FileService.readFolderTree(path);
  treeCache.set(path, { tree, timestamp: Date.now() });
  return tree;
}

export const useFileStore = create<FileState>((set, get) => ({
  folders: [],
  activeFolderPath: null,

  addFolder: async (path) => {
    const { folders } = get();
    const existing = folders.find((f) => f.path === path);
    if (existing) {
      // 已存在：仅切 active；若树未缓存则懒读
      set({ activeFolderPath: path });
      if (existing.fileTree.length === 0) {
        try {
          const tree = await readTreeWithCache(path);
          set({ folders: patchFolder(get().folders, path, (f) => ({ ...f, fileTree: tree })) });
        } catch (e) {
          console.error("[fileStore] addFolder read failed:", e);
        }
      }
      persist(get().folders, path);
      return;
    }
    // 新文件夹：读树后加入并设 active
    let tree: FileNode[] = [];
    try {
      tree = await readTreeWithCache(path);
    } catch (e) {
      console.error("[fileStore] addFolder read failed:", e);
    }
    const folder: WorkspaceFolder = { path, fileTree: tree, expanded: [], selectedPath: null };
    const next = [...get().folders, folder];
    set({ folders: next, activeFolderPath: path });
    persist(next, path);
  },

  removeFolder: (path) => {
    const folders = get().folders.filter((f) => f.path !== path);
    let activeFolderPath = get().activeFolderPath;
    if (activeFolderPath === path) {
      activeFolderPath = folders[0]?.path ?? null;
    }
    set({ folders, activeFolderPath });
    persist(folders, activeFolderPath);

    // 清理编辑器：移除所有位于该文件夹下的已打开文件，否则关闭文件夹后编辑区/预览区仍残留旧文件
    const editor = useEditorStore.getState();
    for (const file of editor.openFiles) {
      if (isUnderFolder(file.path, path)) editor.closeFile(file.path);
    }
  },

  setActiveFolder: (path) => {
    set({ activeFolderPath: path });
    persist(get().folders, path);
  },

  toggleExpand: (path) => {
    const active = get().activeFolderPath;
    if (!active) return;
    set({
      folders: patchFolder(get().folders, active, (f) => ({
        ...f,
        expanded: f.expanded.includes(path)
          ? f.expanded.filter((p) => p !== path)
          : [...f.expanded, path],
      })),
    });
    persist(get().folders, active);
  },

  toggleExpandAll: () => {
    const active = get().activeFolderPath;
    if (!active) return;
    set({
      folders: patchFolder(get().folders, active, (f) => {
        // 已全部展开 → 收起；否则（空或部分展开）→ 展开全部
        const allDirs = collectDirPaths(f.fileTree);
        const isAllExpanded =
          allDirs.length > 0 && allDirs.every((p) => f.expanded.includes(p));
        return { ...f, expanded: isAllExpanded ? [] : allDirs };
      }),
    });
    persist(get().folders, active);
  },

  setSelected: (selectedPath) => {
    const active = get().activeFolderPath;
    if (!active) return;
    set({
      folders: patchFolder(get().folders, active, (f) => ({ ...f, selectedPath })),
    });
    persist(get().folders, active);
  },

  refreshActiveTree: async () => {
    const active = get().activeFolderPath;
    if (!active) return;
    try {
      // 清除缓存，强制刷新
      treeCache.delete(active);
      const tree = await readTreeWithCache(active);
      set({ folders: patchFolder(get().folders, active, (f) => ({ ...f, fileTree: tree })) });
    } catch (e) {
      console.error("[fileStore] refresh failed:", e);
    }
  },

  refreshAllTrees: async () => {
    const { folders } = get();
    if (folders.length === 0) return;

    try {
      // 清除所有缓存，强制刷新
      folders.forEach((f) => treeCache.delete(f.path));

      // 并发读树，结果按 path 收集（不携带会过期的 folder 引用）
      const treeByPath = new Map<string, FileNode[]>();
      await Promise.all(
        folders.map(async (folder) => {
          try {
            treeByPath.set(folder.path, await readTreeWithCache(folder.path));
          } catch (e) {
            console.error("[fileStore] refreshAllTrees failed for:", folder.path, e);
          }
        }),
      );

      // 函数式更新 + 按 path 合并：只更新当前 state 中【仍存在】的 folder，
      // 这样飞行期间 removeFolder 删掉的 folder 不会被陈旧快照复活（竞态修复）
      set((state) => ({
        folders: state.folders.map((f) =>
          treeByPath.has(f.path) ? { ...f, fileTree: treeByPath.get(f.path)! } : f,
        ),
      }));
    } catch (e) {
      console.error("[fileStore] refreshAllTrees failed:", e);
    }
  },

  clearAllFolders: () => {
    // 清除缓存
    treeCache.clear();
    // 清空状态
    set({ folders: [], activeFolderPath: null });
    persist([], null);
    // 清理编辑器：关闭所有已打开的文件
    const editor = useEditorStore.getState();
    for (const file of editor.openFiles) {
      editor.closeFile(file.path);
    }
  },
}));
