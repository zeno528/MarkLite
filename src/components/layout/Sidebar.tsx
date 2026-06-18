/**
 * 侧边栏 - 文件树 / 文档大纲
 * 圆角浮起卡片 + 药丸 tabs + 文件夹下拉选择器（多文件夹管理）
 */
import { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  // 滑动指示器：tabs 容器 / 两个 button ref / 当前位置
  const tabsRef = useRef<HTMLDivElement>(null);
  const filesBtnRef = useRef<HTMLButtonElement>(null);
  const outlineBtnRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const sidebarTabRef = useRef(sidebarTab);
  useLayoutEffect(() => {
    sidebarTabRef.current = sidebarTab;
  }, [sidebarTab]);

  // 切换 tab 时测量激活按钮位置（useLayoutEffect 同步，避免首帧错位）
  useLayoutEffect(() => {
    const activeBtn = sidebarTab === "files" ? filesBtnRef.current : outlineBtnRef.current;
    const container = tabsRef.current;
    if (!activeBtn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    const x = bRect.left - cRect.left;
    const w = bRect.width;
    setIndicator((prev) =>
      prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.w - w) < 0.5 ? prev : { x, w },
    );
  }, [sidebarTab]);

  // 容器尺寸变化时重测（窗口 resize、字体加载等引起 tab 位置/宽度变化）
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const measure = () => {
      const activeBtn =
        sidebarTabRef.current === "files" ? filesBtnRef.current : outlineBtnRef.current;
      if (!activeBtn) return;
      const cRect = container.getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      const x = bRect.left - cRect.left;
      const w = bRect.width;
      setIndicator((prev) =>
        prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.w - w) < 0.5 ? prev : { x, w },
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // 下拉展开时，点击外部自动关闭
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
    <aside
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col p-3"
      style={{ minWidth: "var(--sidebar-min-width)", maxWidth: "var(--sidebar-max-width)" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 shadow-[var(--shadow-sm)]">
        {/* Tab 切换（药丸 - iOS 风格：高亮指示器在两个 tab 之间滑动） */}
        <div
          ref={tabsRef}
          className="relative flex shrink-0 items-center gap-1 rounded-lg bg-[var(--color-bg-muted)] p-1"
        >
          {/* 滑动指示器（指针穿透；按钮在 DOM 顺序中靠后，自然盖在指示器之上） */}
          {indicator && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 rounded-md bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)]"
              style={{
                transform: `translateX(${indicator.x}px)`,
                width: indicator.w,
                transition:
                  "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), width 220ms cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            />
          )}
          <button
            ref={filesBtnRef}
            onClick={() => setSidebarTab("files")}
            className={cn(
              "relative z-1 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              sidebarTab === "files"
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <FileText size={13} /> 文件
          </button>
          <button
            ref={outlineBtnRef}
            onClick={() => setSidebarTab("outline")}
            className={cn(
              "relative z-1 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              sidebarTab === "outline"
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <List size={13} /> 大纲
          </button>
        </div>

        {/* 文件夹下拉选择器：切换 / 关闭 / 添加（仅文件 tab） */}
        {sidebarTab === "files" && (
          <div ref={menuRef} className="relative mt-1.5 shrink-0 px-1">
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
              <div className="absolute left-1 right-1 top-full z-50 mt-1 max-h-[40vh] overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 shadow-[var(--shadow-md)]">
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
                          setFolderMenuOpen(false);
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
