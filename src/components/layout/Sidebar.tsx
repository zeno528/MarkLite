/**
 * 侧边栏 - 包含文件树
 * - 可折叠
 * - 顶部显示根目录
 */
import { FolderOpen, RefreshCw } from "lucide-react";
import { FileTree } from "@/components/file/FileTree";
import { useFileStore } from "@/stores/fileStore";
import { FileService } from "@/lib/tauri/fs";
import { pickFolder } from "@/lib/tauri/dialog";

export function Sidebar() {
  const rootFolder = useFileStore((s) => s.rootFolder);
  const setRootFolder = useFileStore((s) => s.setRootFolder);
  const setFileTree = useFileStore((s) => s.setFileTree);

  const handlePick = async () => {
    const folder = await pickFolder();
    if (!folder) return;
    setRootFolder(folder);
    try {
      const tree = await FileService.readFolderTree(folder);
      setFileTree(tree);
    } catch (e) {
      console.error("[Sidebar] read folder failed:", e);
    }
  };

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
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-2 text-xs">
        <div className="flex items-center gap-1 truncate">
          <FolderOpen size={12} />
          <span className="truncate text-[var(--color-text-muted)]">
            {rootFolder ? rootFolder.split(/[/\\]/).pop() : "无文件夹"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {rootFolder && (
            <button
              onClick={handleRefresh}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-bg-muted)]"
              title="刷新"
            >
              <RefreshCw size={11} />
            </button>
          )}
          <button
            onClick={handlePick}
            className="rounded px-1.5 py-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
            title="打开文件夹"
          >
            打开
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <FileTree />
      </div>
    </aside>
  );
}
