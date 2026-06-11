/**
 * 侧边栏 - 包含文件树
 * - 可折叠
 * - 顶部显示根目录
 */
import { FolderOpen, RefreshCw } from "lucide-react";
import { FileTree } from "@/components/file/FileTree";
import { useFileStore } from "@/stores/fileStore";
import { FileService } from "@/lib/tauri/fs";

export function Sidebar() {
  const rootFolder = useFileStore((s) => s.rootFolder);
  const setFileTree = useFileStore((s) => s.setFileTree);

  const handleRefresh = async () => {
    if (!rootFolder) return;
    try {
      const tree = await FileService.readFolderTree(rootFolder);
      setFileTree(tree);
    } catch (e) {
      console.error("[Sidebar] refresh failed:", e);
    }
  };

  return (
    <aside
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      style={{ minWidth: "var(--sidebar-min-width)", maxWidth: "var(--sidebar-max-width)" }}
    >
      {rootFolder && (
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-2 text-xs">
          <div className="flex items-center gap-1 truncate">
            <FolderOpen size={12} />
            <span className="truncate text-[var(--color-text-muted)]">
              {rootFolder.split(/[/\\]/).pop()}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-bg-muted)]"
            title="刷新"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <FileTree />
      </div>
    </aside>
  );
}
