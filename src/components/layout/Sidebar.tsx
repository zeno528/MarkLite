/**
 * 侧边栏 - Activity Bar + 面板布局
 * 左侧窄图标栏切换 面板（文件树/大纲）
 */
import { useState, useEffect, useRef } from "react";
import { FileText, List, FolderOpen, Plus, ChevronDown, X } from "lucide-react";
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

  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!folderMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFolderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [folderMenuOpen]);

  const activeName = activeFolderPath ? folderName(activeFolderPath) : "未打开文件夹";

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
          {sidebarTab === "files" && (
            <button
              onClick={openFolderViaDialog}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              title="打开文件夹"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* 文件夹选择器（仅文件 tab） */}
        {sidebarTab === "files" && folders.length > 0 && (
          <div ref={menuRef} className="relative border-b border-[var(--color-border)] px-2 py-1.5">
            <button
              onClick={() => setFolderMenuOpen((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between gap-1 rounded-lg border px-2.5 py-2 text-xs transition-all",
                folderMenuOpen
                  ? "border-[var(--color-accent)] bg-[var(--color-bg-muted)] shadow-sm"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)]",
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderOpen size={14} className="shrink-0 text-[var(--color-text-subtle)]" />
                <span className="truncate font-medium text-[var(--color-text)]">{activeName}</span>
              </div>
              <ChevronDown
                size={14}
                className={cn(
                  "shrink-0 text-[var(--color-text-subtle)] transition-transform duration-200",
                  folderMenuOpen && "rotate-180",
                )}
              />
            </button>

            {/* 下拉列表 */}
            {folderMenuOpen && folders.length > 0 && (
              <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-[40vh] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 shadow-[var(--shadow-md)]">
                {folders.map((f) => {
                  const isActive = f.path === activeFolderPath;
                  return (
                    <div
                      key={f.path}
                      onClick={() => {
                        setActiveFolder(f.path);
                        setFolderMenuOpen(false);
                      }}
                      className={cn(
                        "group flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                        isActive
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                      )}
                      title={f.path}
                    >
                      <span className="flex-1 truncate">{folderName(f.path)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFolder(f.path);
                          setFolderMenuOpen(false);
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-subtle)] opacity-0 transition-opacity hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-danger)] group-hover:opacity-100"
                        title="关闭文件夹"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
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
