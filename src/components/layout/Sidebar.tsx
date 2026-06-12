/**
 * 侧边栏 - 文件树 / 文档大纲
 * - tab 切换两种视图
 */
import { RefreshCw, FileText, List } from "lucide-react";
import { FileTree } from "@/components/file/FileTree";
import { Outline } from "@/components/file/Outline";
import { useFileStore } from "@/stores/fileStore";
import { useUIStore } from "@/stores/uiStore";
import { FileService } from "@/lib/tauri/fs";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const rootFolder = useFileStore((s) => s.rootFolder);
  const setFileTree = useFileStore((s) => s.setFileTree);
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);

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
      {/* Tab 切换 */}
      <div className="flex h-8 shrink-0 items-center border-b border-[var(--color-border)] text-xs">
        <button
          onClick={() => setSidebarTab("files")}
          className={cn(
            "flex h-full flex-1 items-center justify-center gap-1",
            sidebarTab === "files"
              ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          <FileText size={12} />
          文件
        </button>
        <button
          onClick={() => setSidebarTab("outline")}
          className={cn(
            "flex h-full flex-1 items-center justify-center gap-1",
            sidebarTab === "outline"
              ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          <List size={12} />
          大纲
        </button>
        {rootFolder && sidebarTab === "files" && (
          <button
            onClick={handleRefresh}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-bg-muted)]"
            title="刷新"
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>
      {/* 内容 */}
      <div className="flex-1 overflow-hidden">
        {sidebarTab === "files" ? <FileTree /> : <Outline />}
      </div>
    </aside>
  );
}
