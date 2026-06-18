/**
 * 侧边栏 - Activity Bar + 面板布局
 * 左侧窄图标栏切换 面板（文件树/大纲）
 */
import { FileText, List, FolderOpen, Plus } from "lucide-react";
import { FileTree } from "@/components/file/FileTree";
import { Outline } from "@/components/file/Outline";
import { useUIStore } from "@/stores/uiStore";
import { useFileStore } from "@/stores/fileStore";
import { openFolderViaDialog } from "@/lib/shortcuts/appShortcuts";
import { cn } from "@/lib/utils/cn";

/** 取路径末级目录名（显示用） */
function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** Activity Bar 图标按钮 */
function ActivityBarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-accent)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

export function Sidebar() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const folders = useFileStore((s) => s.folders);
  const activeFolderPath = useFileStore((s) => s.activeFolderPath);
  const setActiveFolder = useFileStore((s) => s.setActiveFolder);
  const removeFolder = useFileStore((s) => s.removeFolder);

  return (
    <aside className="flex h-full shrink-0">
      {/* Activity Bar - 窄图标栏 */}
      <div className="flex w-11 flex-col items-center gap-1 border-r border-[var(--color-border)] bg-[var(--color-bg)] py-2">
        <ActivityBarButton
          active={sidebarTab === "files"}
          onClick={() => setSidebarTab("files")}
          title="文件资源管理器"
        >
          <FileText size={18} />
        </ActivityBarButton>
        <ActivityBarButton
          active={sidebarTab === "outline"}
          onClick={() => setSidebarTab("outline")}
          title="文档大纲"
        >
          <List size={18} />
        </ActivityBarButton>

        {/* 底部操作按钮 */}
        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => openFolderViaDialog()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="打开文件夹"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* 面板内容 */}
      <div
        className="flex w-[var(--sidebar-width)] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)]"
        style={{ minWidth: "var(--sidebar-min-width)", maxWidth: "var(--sidebar-max-width)" }}
      >
        {/* 面板标题栏 */}
        <div className="flex h-10 items-center justify-between border-b border-[var(--color-border)] px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            {sidebarTab === "files" ? "资源管理器" : "大纲"}
          </span>
        </div>

        {/* 文件夹选择器（仅文件 tab） */}
        {sidebarTab === "files" && folders.length > 0 && (
          <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-2 py-1.5">
            <FolderOpen size={13} className="shrink-0 text-[var(--color-text-subtle)]" />
            <select
              value={activeFolderPath ?? ""}
              onChange={(e) => setActiveFolder(e.target.value)}
              className="min-w-0 flex-1 truncate bg-transparent text-xs text-[var(--color-text)] outline-none"
            >
              {folders.map((f) => (
                <option key={f.path} value={f.path}>
                  {folderName(f.path)}
                </option>
              ))}
            </select>
            {folders.length > 1 && (
              <button
                onClick={() => {
                  if (activeFolderPath) removeFolder(activeFolderPath);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-subtle)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                title="关闭当前文件夹"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* 内容区 */}
        <div className="min-h-0 flex-1 overflow-auto">
          {sidebarTab === "files" ? <FileTree /> : <Outline />}
        </div>
      </div>
    </aside>
  );
}
