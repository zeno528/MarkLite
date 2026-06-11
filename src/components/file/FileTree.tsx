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
    setSelected(node.path);
    if (node.isDir) {
      toggleExpand(node.path);
    } else {
      try {
        const content = await readTextFile(node.path);
        const title = node.name.replace(/\.(md|markdown|mdx)$/i, "");
        openFile(node.path, title, content);
      } catch (e) {
        console.error("[FileTree] open file failed:", e);
      }
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex h-6 cursor-pointer items-center gap-1 rounded-sm px-1 text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]",
          isSelected && "bg-[var(--color-bg-muted)]",
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
            <FileIcon
              size={14}
              className={cn(
                "shrink-0",
                isMd ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
              )}
            />
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
