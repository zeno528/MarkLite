/**
 * 文件树组件
 * - 递归渲染 FileNode
 * - 目录可展开/折叠
 * - 点击文件 → 打开
 * - Markdown 文件用 .md 标识
 */
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen } from "lucide-react";
import { useFileStore, type FileNode } from "@/stores/fileStore";
import { useEditorStore } from "@/stores/editorStore";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { cn } from "@/lib/utils/cn";
import { MdFileIcon } from "@/components/file/MdFileIcon";

export function FileTree() {
  const fileTree = useFileStore((s) => s.fileTree);
  const rootFolder = useFileStore((s) => s.rootFolder);

  if (!rootFolder) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-subtle)]">
        未打开文件夹
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto py-1 text-sm">
      {fileTree.map((node) => (
        <FileTreeItem key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}

function FileTreeItem({ node, depth }: { node: FileNode; depth: number }) {
  const expanded = useFileStore((s) => s.expanded);
  const toggleExpand = useFileStore((s) => s.toggleExpand);
  const setSelected = useFileStore((s) => s.setSelected);
  const selected = useFileStore((s) => s.selectedPath);
  const openFile = useEditorStore((s) => s.openFile);

  const isOpen = expanded.has(node.path);
  const isSelected = selected === node.path;
  const isMd = /\.(md|markdown|mdx)$/i.test(node.name);

  const handleClick = async () => {
    if (node.isDir) {
      setSelected(node.path);
      toggleExpand(node.path);
      return;
    }
    // 非 Markdown 文件不打开：readTextFile 读取二进制/大文件会返回超大乱码字符串，
    // 塞给 CodeMirror 渲染会卡死主线程
    if (!isMd) return;
    setSelected(node.path);
    try {
      const content = await readTextFile(node.path);
      const title = node.name.replace(/\.(md|markdown|mdx)$/i, "");
      openFile(node.path, title, content);
    } catch (e) {
      console.error("[FileTree] open file failed:", e);
    }
  };

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        className={cn(
          "relative flex h-7 my-0.5 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[var(--color-text)] transition-colors",
          "hover:bg-[var(--color-bg-muted)]",
          isSelected && [
            "bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)]",
            "text-[var(--color-accent)] font-medium",
            "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--color-accent)]",
          ],
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        title={node.path}
      >
        {node.isDir ? (
          <>
            {isOpen ? (
              <ChevronDown size={12} className="shrink-0 text-[var(--color-text-subtle)]" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-[var(--color-text-subtle)]" />
            )}
            {isOpen ? (
              <FolderOpen size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            ) : (
              <Folder size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {isMd ? (
              <MdFileIcon size={14} className="shrink-0 text-[var(--color-accent)]" />
            ) : (
              <FileIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
