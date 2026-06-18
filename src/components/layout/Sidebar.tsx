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

/** 文件夹选择下拉组件 */
function FolderSelect() {
  const folders = useFileStore((s) => s.folders);
  const activeFolderPath = useFileStore((s) => s.activeFolderPath);
  const setActiveFolder = useFileStore((s) => s.setActiveFolder);
  const removeFolder = useFileStore((s) => s.removeFolder);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (folders.length === 0) return null;

  const activeName = activeFolderPath ? folderName(activeFolderPath) : "未打开文件夹";

  return (
    <div ref={ref} className="relative px-2 py-1.5">
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-1 rounded-lg border px-2.5 py-2 text-xs transition-colors",
          open
            ? "rounded-b-none border-[var(--color-accent)] bg-[var(--color-bg-muted)]"
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
            open && "rotate-180",
          )}
        />
      </button>

      {/* 下拉面板 - 绝对定位，不影响下方布局 */}
      {open && (
        <div className="absolute left-2 right-2 z-50 mt-0 overflow-auto rounded-b-lg border border-t-0 border-[var(--color-accent)] bg-[var(--color-bg-muted)] p-1 max-h-[40vh] shadow-md">
          {folders.map((f) => {
            const isActive = f.path === activeFolderPath;
            return (
              <div
                key={f.path}
                onClick={() => {
                  setActiveFolder(f.path);
                  setOpen(false);
                }}
                className={cn(
                  "group flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                  isActive
                    ? "font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15"
                    : "text-[var(--color-text)] hover:bg-[var(--color-accent)]/15",
                )}
                title={f.path}
              >
                <span className="flex-1 truncate">{folderName(f.path)}</span>
                {folders.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFolder(f.path);
                      setOpen(false);
                    }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-danger)]"
                    title="关闭文件夹"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);

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

        {/* 文件夹选择器 */}
        {sidebarTab === "files" && <FolderSelect />}

        {/* 内容区 */}
        <div className="min-h-0 flex-1 overflow-auto">
          {sidebarTab === "files" ? <FileTree /> : <Outline />}
        </div>
      </div>
    </aside>
  );
}
