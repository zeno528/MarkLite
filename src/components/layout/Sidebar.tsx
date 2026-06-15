/**
 * 侧边栏 - 文件树 / 文档大纲
 * 圆角浮起卡片 + 药丸 tabs + 文件夹下拉选择器（多文件夹管理）
 */
import { useState } from "react";
import { FileText, List, ChevronDown, Plus, X, Check } from "lucide-react";
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

export function Sidebar() {
  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const folders = useFileStore((s) => s.folders);
  const activeFolderPath = useFileStore((s) => s.activeFolderPath);
  const setActiveFolder = useFileStore((s) => s.setActiveFolder);
  const removeFolder = useFileStore((s) => s.removeFolder);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const activeName = activeFolderPath ? folderName(activeFolderPath) : "未打开文件夹";

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
        </div>

        {/* 文件夹下拉选择器：切换 / 关闭 / 添加（仅文件 tab） */}
        {sidebarTab === "files" && (
          <div className="mt-1.5 shrink-0 px-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFolderMenuOpen((v) => !v)}
                disabled={folders.length === 0}
                className={cn(
                  "flex flex-1 items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                  folderMenuOpen
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                  folders.length === 0 && "cursor-default opacity-60",
                )}
              >
                <span className="truncate text-[var(--color-text)]">{activeName}</span>
                <ChevronDown
                  size={13}
                  className={cn(
                    "shrink-0 text-[var(--color-text-subtle)] transition-transform",
                    folderMenuOpen && "rotate-180",
                  )}
                />
              </button>
              <button
                onClick={() => openFolderViaDialog()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                title="添加文件夹"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* 下拉列表（inline，展开时显示） */}
            {folderMenuOpen && folders.length > 0 && (
              <div className="mt-1 max-h-[40vh] overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 shadow-[var(--shadow-md)]">
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
                        "group flex cursor-pointer select-none items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                        isActive
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                      )}
                      title={f.path}
                    >
                      {isActive ? (
                        <Check size={12} className="shrink-0" />
                      ) : (
                        <span className="w-3 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{folderName(f.path)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFolder(f.path);
                        }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-text-subtle)] opacity-0 hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] group-hover:opacity-100"
                        title="关闭文件夹"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 内容 */}
        <div className="mt-1 min-h-0 flex-1 overflow-hidden px-1 pb-2">
          {sidebarTab === "files" ? <FileTree /> : <Outline />}
        </div>
      </div>
    </aside>
  );
}
