/**
 * 侧边栏 - 文件树 / 文档大纲
 * 圆角浮起卡片 + 药丸 tabs（柔和文档风）
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
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col p-3"
      style={{ minWidth: "var(--sidebar-min-width)", maxWidth: "var(--sidebar-max-width)" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 shadow-[var(--shadow-sm)]">
        {/* Tab 切换（药丸 - iOS 风格：背景层 + 高亮浮起卡） */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--color-bg-muted)] p-1">
          <button
            onClick={() => setSidebarTab("files")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              sidebarTab === "files"
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <FileText size={13} /> 文件
          </button>
          <button
            onClick={() => setSidebarTab("outline")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              sidebarTab === "outline"
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <List size={13} /> 大纲
          </button>
          {rootFolder && sidebarTab === "files" && (
            <button
              onClick={handleRefresh}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]"
              title="刷新"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
        {/* 内容 */}
        <div className="mt-1 flex-1 overflow-hidden px-1 pb-2">
          {sidebarTab === "files" ? <FileTree /> : <Outline />}
        </div>
      </div>
    </aside>
  );
}
