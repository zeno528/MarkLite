/**
 * Tauri 文件服务
 *
 * 跨平台文件操作封装：
 * - 路径处理用 @tauri-apps/api/path（绝对不要手动拼字符串）
 * - macOS / Windows 自动处理 / vs \ 差异
 * - 文件夹/文件读取用 Tauri fs 插件
 */
import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  readDir,
  remove,
  rename,
} from "@tauri-apps/plugin-fs";
import { join, basename, dirname, sep } from "@tauri-apps/api/path";
import { getDefaultPath, rememberPath } from "@/lib/tauri/dialog";
import type { FileNode } from "@/stores/fileStore";

/** 提取标题（文件名去后缀） */
function titleFromPath(path: string): string {
  const name = path.split(/[/\\]/).pop() ?? path;
  return name.replace(/\.(md|markdown|mdx)$/i, "");
}

/** 提取扩展名 */
function extFromPath(path: string): string {
  const m = path.match(/\.([^./\\]+)$/);
  return m ? m[1].toLowerCase() : "";
}

export const FileService = {
  /**
   * 打开 Markdown 文件
   * @returns 文件信息（path/title/content/ext），取消返回 null
   */
  async openFile(): Promise<{
    path: string;
    title: string;
    content: string;
    ext: string;
  } | null> {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const defaultPath = await getDefaultPath();
    const selected = await open({
      multiple: false,
      directory: false,
      defaultPath,
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!selected || typeof selected !== "string") return null;
    await rememberPath(selected, false);

    const content = await readTextFile(selected);
    return {
      path: selected,
      title: titleFromPath(selected),
      content,
      ext: extFromPath(selected) || "md",
    };
  },

  /**
   * 另存为新文件
   * @returns 保存后的 path，取消返回 null
   */
  async saveAsFile(
    content: string,
    defaultName = "untitled.md",
  ): Promise<string | null> {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const defaultPath = await getDefaultPath();
    const target = await save({
      defaultPath: await join(defaultPath, defaultName),
      filters: [
        { name: "Markdown", extensions: ["md", "markdown"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!target) return null;
    await rememberPath(target, false);
    await writeTextFile(target, content);
    return target;
  },

  /** 保存到指定路径 */
  async saveFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content);
  },

  /** 检查文件是否存在 */
  async fileExists(path: string): Promise<boolean> {
    try {
      return await exists(path);
    } catch {
      return false;
    }
  },

  /** 创建目录（递归） */
  async createDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },

  /**
   * 读取文件夹并构建文件树（深度优先，优化版）
   * @param rootPath 根目录路径
   * @param maxDepth 最大深度（默认 5）
   */
  async readFolderTree(rootPath: string, maxDepth = 5): Promise<FileNode[]> {
    return await this.buildTree(rootPath, rootPath, 0, maxDepth);
  },

  async buildTree(
    root: string,
    dir: string,
    depth: number,
    maxDepth: number,
  ): Promise<FileNode[]> {
    if (depth > maxDepth) return [];
    let entries: import("@tauri-apps/plugin-fs").DirEntry[] = [];
    try {
      entries = await readDir(dir);
    } catch (e) {
      console.error("[fs] readDir failed:", dir, e);
      return [];
    }

    // 过滤有效条目（跳过 .git、node_modules、target）
    const validEntries = entries.filter((entry) => {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "target") return false;
      return true;
    });

    // 并行处理所有条目
    const nodePromises = validEntries.map(async (entry) => {
      const fullPath = await join(dir, entry.name);
      const isDir = entry.isDirectory;
      // markdown 编辑器：只收录 .md/.markdown/.mdx 文件 + 目录，其他文件不进树
      if (!isDir && !/\.(md|markdown|mdx)$/i.test(entry.name ?? "")) return null;

      const node: FileNode = {
        name: entry.name ?? "",
        path: fullPath,
        isDir,
      };

      if (isDir) {
        node.children = await this.buildTree(root, fullPath, depth + 1, maxDepth);
      }
      return node;
    });

    const results = await Promise.all(nodePromises);
    const nodes = results.filter((n): n is FileNode => n !== null);

    // 排序：目录在前，按名称
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  },

  /** 路径分隔符（跨平台） */
  async pathSep(): Promise<string> {
    return await sep();
  },

  /** 父目录 */
  async parentDir(path: string): Promise<string> {
    return await dirname(path);
  },

  /** 文件名 */
  async fileName(path: string): Promise<string> {
    return await basename(path);
  },

  /** 删除文件 */
  async removeFile(path: string): Promise<void> {
    await remove(path);
  },

  /** 重命名/移动文件 */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await rename(oldPath, newPath);
  },

  /** 在系统文件管理器中显示该文件（选中） */
  async revealFile(path: string): Promise<void> {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(path);
  },
};
