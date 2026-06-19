/**
 * 侧边栏 - Activity Bar + 面板布局
 * 左侧窄图标栏切换 面板（文件树/目录/搜索）
 * 拆分为 SidebarActivityBar（始终可见）+ SidebarPanel（可折叠）
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, List, Search, FolderOpen, Plus, ChevronDown, FoldVertical, UnfoldVertical, X, Trash2, XCircle } from "lucide-react";
import { FileTree } from "@/components/file/FileTree";
import { Outline } from "@/components/file/Outline";
import { SearchPanel } from "@/components/file/SearchPanel";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUIStore } from "@/stores/uiStore";
import { useFileStore, collectDirPaths } from "@/stores/fileStore";
import { useEditorStore, previewContainerRef } from "@/stores/editorStore";
import { openFolderViaDialog } from "@/lib/shortcuts/appShortcuts";
import { cn } from "@/lib/utils/cn";

/** 清除预览区域的搜索高亮和选区 */
function clearSearchHighlights() {
  window.getSelection()?.removeAllRanges();
  const container = previewContainerRef.current;
  if (!container) return;
  container.querySelectorAll(".search-highlight").forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ""), el);
      parent.normalize();
    }
  });
}

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
  onMouseDown,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip content={title} placement="right">
      <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** 文件夹选择下拉组件 */
function FolderSelect() {
  const folders = useFileStore((s) => s.folders);
  const activeFolderPath = useFileStore((s) => s.activeFolderPath);
  const setActiveFolder = useFileStore((s) => s.setActiveFolder);
  const removeFolder = useFileStore((s) => s.removeFolder);
  const clearAllFolders = useFileStore((s) => s.clearAllFolders);

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
            ? "rounded-b-none border-[var(--color-accent)] bg-[var(--color-bg-elevated)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)]",
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
        <div className="absolute left-2 right-2 z-50 mt-0 overflow-auto rounded-b-lg border border-t-0 border-[var(--color-accent)] bg-[var(--color-bg-elevated)] p-1 max-h-[40vh] shadow-[var(--shadow-lg)]">
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFolder(f.path);
                    setOpen(false);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-danger)]"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {folders.length > 1 && (
            <>
              <div className="mx-2 my-1 h-px bg-[var(--color-border)]" />
              <button
                onClick={async () => {
                  const { confirmDialog } = await import("@/lib/tauri/dialog");
                  const ok = await confirmDialog(
                    `确定清除所有 ${folders.length} 个文件夹？\n编辑器中已打开的文件也将被关闭。`,
                    "清除所有文件夹",
                    "清除",
                    "取消",
                    true,
                  );
                  if (ok) {
                    clearAllFolders();
                    setOpen(false);
                  }
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10"
              >
                <Trash2 size={12} />
                <span>清除所有文件夹</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarActivityBarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** 活动栏 - 始终可见的窄图标栏 */
export function SidebarActivityBar({ collapsed, onToggle }: SidebarActivityBarProps) {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const triggerSearchFocus = useUIStore((s) => s.triggerSearchFocus);

  const handleClick = (tab: "files" | "outline" | "search") => {
    clearSearchHighlights();
    if (collapsed) {
      // 收缩状态：展开并切换到目标标签
      setSidebarTab(tab);
      onToggle();
    } else if (sidebarTab === tab) {
      // 展开状态 + 点击当前标签：收缩
      onToggle();
    } else {
      // 展开状态 + 点击其他标签：切换标签
      setSidebarTab(tab);
    }
  };

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] py-3">
      <ActivityBarButton
        active={sidebarTab === "files" && !collapsed}
        onClick={() => handleClick("files")}
        title="文件资源管理器"
      >
        <FileText size={20} />
      </ActivityBarButton>
      <ActivityBarButton
        active={sidebarTab === "outline" && !collapsed}
        onClick={() => handleClick("outline")}
        title="目录"
      >
        <List size={20} />
      </ActivityBarButton>
      <ActivityBarButton
        active={sidebarTab === "search" && !collapsed}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          handleClick("search");
          triggerSearchFocus();
        }}
        title="搜索 (Ctrl+F)"
      >
        <Search size={20} />
      </ActivityBarButton>
    </div>
  );
}

/** 面板内容 - 可折叠的文件树/搜索/目录面板 */
export function SidebarPanel() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const openFiles = useEditorStore((s) => s.openFiles);
  const closeAllFiles = useEditorStore((s) => s.closeAllFiles);
  const toggleExpandAll = useFileStore((s) => s.toggleExpandAll);
  const activeFolder = useFileStore(
    (s) => s.folders.find((f) => f.path === s.activeFolderPath) ?? null,
  );
  const isAllExpanded = useMemo(() => {
    if (!activeFolder) return false;
    const allDirs = collectDirPaths(activeFolder.fileTree);
    return allDirs.length > 0 && allDirs.every((p) => activeFolder.expanded.includes(p));
  }, [activeFolder]);

  return (
    <div
      className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-muted)]"
      style={{ minWidth: "var(--sidebar-min-width)", maxWidth: "var(--sidebar-max-width)" }}
    >
      {/* 面板标题栏 */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3">
        <span className="text-[13px] font-semibold text-[var(--color-text)]">
          {sidebarTab === "files" ? "资源管理器" : sidebarTab === "search" ? "搜索" : "目录"}
        </span>
        {sidebarTab === "files" && (
          <div className="flex items-center gap-1">
            {openFiles.length > 1 && (
              <Tooltip content="关闭所有标签" placement="bottom">
                <button
                  onClick={closeAllFiles}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                >
                  <XCircle size={14} />
                </button>
              </Tooltip>
            )}
            <Tooltip content={isAllExpanded ? "收起全部" : "展开全部"} placement="bottom">
              <button
                onClick={toggleExpandAll}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              >
                {isAllExpanded ? <FoldVertical size={14} /> : <UnfoldVertical size={14} />}
              </button>
            </Tooltip>
            <Tooltip content="打开文件夹" placement="bottom">
              <button
                onClick={openFolderViaDialog}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              >
                <Plus size={14} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 文件夹选择器 */}
      {sidebarTab === "files" && <FolderSelect />}

      {/* 内容区 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {sidebarTab === "files" && <FileTree />}
        {sidebarTab === "search" && <SearchPanel />}
        {sidebarTab === "outline" && <Outline />}
      </div>
    </div>
  );
}
