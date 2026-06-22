/**
 * 顶栏（合并自 TitleBar + EditorToolbar，单层）
 * 左：品牌 + 面包屑（rootFolder › filename）   右：主操作（打开） + 药丸次要组（布局 | 侧栏 | 设置）
 * macOS: 留出红绿灯 78px 安全区，整栏可拖拽，按钮区 no-drag
 */
import { useEffect, useState } from "react";
import {
  FolderPlus,
  Save,
  Columns2,
  FileInput,
  PencilLine,
  BookOpen,
  Settings,
  PanelLeft,
  ChevronRight,
  House,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUIStore, type LayoutMode } from "@/stores/uiStore";
import { useEditorStore, editorViewRef, previewContainerRef } from "@/stores/editorStore";
import { useFileStore } from "@/stores/fileStore";
import { isMac } from "@/lib/utils/platform";
import { cn } from "@/lib/utils/cn";
import { openFileViaDialog, openFolderViaDialog, saveCurrentFile } from "@/lib/shortcuts/appShortcuts";

interface TopBarProps {
  onOpenSettings?: () => void;
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    isMac().then(setMac);
  }, []);

  const currentFile = useEditorStore((s) => s.currentFile);
  const rootFolder = useFileStore((s) => s.activeFolderPath);

  const layout = useUIStore((s) => s.layout);
  const setLayout = useUIStore((s) => s.setLayout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // rootFolder 末级名（路径最后一段），无目录时显示「未打开」
  const rootFolderName = rootFolder
    ? rootFolder.split(/[\\/]/).filter(Boolean).pop() ?? rootFolder
    : null;

  const layouts: { mode: LayoutMode; icon: React.ReactNode; label: string }[] = [
    { mode: "editor-only", icon: <PencilLine size={14} />, label: "编辑视图" },
    { mode: "split", icon: <Columns2 size={14} />, label: "分屏" },
    { mode: "preview-only", icon: <BookOpen size={14} />, label: "沉浸式阅读" },
  ];

  // 点击路径图标：编辑器和预览器同时回到顶部
  const handleScrollToTop = () => {
    const preview = previewContainerRef.current;
    if (preview) preview.scrollTo({ top: 0, behavior: "auto" });
    const view = editorViewRef.current;
    if (view) view.scrollDOM.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <header
      data-tauri-drag-region
      className="flex h-[50px] w-full shrink-0 items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-muted)] pr-4"
      style={{ paddingLeft: mac ? "78px" : "16px", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* 品牌 + 面包屑 */}
      <div
        className="flex min-w-0 flex-1 items-center gap-1.5 -ml-2 text-[13px]"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* 路径图标：lucide House（点击 → 编辑器 + 预览器回到顶部） */}
        <Tooltip content="回到顶部" placement="bottom" align="left">
          <button
            onClick={handleScrollToTop}
            aria-label="回到顶部"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <House size={22} strokeWidth={1.6} className="transition-transform duration-200 hover:scale-110" />
          </button>
        </Tooltip>

        {!currentFile && rootFolderName && (
          <>
            <ChevronRight size={12} className="mx-0.5 shrink-0 text-[var(--color-text-subtle)]" />
            <span
              className="truncate text-[var(--color-text-muted)] cursor-text select-text"
              style={{ maxWidth: "180px" }}
              title={rootFolder ?? ""}
            >
              {rootFolderName}
            </span>
          </>
        )}

        {currentFile && (
          <>
            <ChevronRight size={12} className="mx-0.5 shrink-0 text-[var(--color-text-subtle)]" />
            <span
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium text-[var(--color-text)] cursor-text select-text"
              title={currentFile.path}
            >
              <span className="truncate">{currentFile.path}</span>
              {currentFile.isDirty && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warning)]" />
              )}
            </span>
          </>
        )}
      </div>

      {/* 工具按钮组（不参与拖拽） */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* 主操作：打开文件 / 打开文件夹 */}
        <Tooltip content="打开文件 (Ctrl+O)" placement="bottom">
          <button
            className="btn-primary"
            onClick={openFileViaDialog}
          >
            <FileInput size={14} />
          </button>
        </Tooltip>
        <Tooltip content="打开文件夹 (Ctrl+Shift+N)" placement="bottom">
          <button
            className="btn-primary"
            onClick={openFolderViaDialog}
          >
            <FolderPlus size={14} />
          </button>
        </Tooltip>

        {/* 次操作 pill 组：保存 + 布局 */}
        <div className="tool-group">
          <Tooltip content={currentFile?.isDirty ? "保存 (Ctrl+S) — 有未保存的修改" : "保存 (Ctrl+S)"} placement="bottom">
            <button
              className={cn("tbtn", currentFile?.isDirty && "active")}
              onClick={saveCurrentFile}
              disabled={!currentFile || !currentFile.isDirty}
            >
              <Save size={14} />
            </button>
          </Tooltip>
        </div>

        <div className="tool-group">
          {layouts.map((l) => (
            <button
              key={l.mode}
              className={cn("tbtn", layout === l.mode && "active")}
              onClick={() => setLayout(l.mode)}
            >
              {l.icon}
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {/* 单图标按钮（侧栏 / 设置） */}
        <Tooltip content="切换侧栏 (Ctrl+\)" placement="bottom">
          <button
            className={cn("icon-btn", showSidebar && "active")}
            onClick={toggleSidebar}
            aria-label="切换侧栏"
          >
            <PanelLeft size={15} />
          </button>
        </Tooltip>

        {onOpenSettings && (
          <Tooltip content="设置 (Ctrl+,)" placement="bottom" align="right">
            <button
              className="icon-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              onClick={onOpenSettings}
              aria-label="设置"
            >
              <Settings size={15} />
            </button>
          </Tooltip>
        )}

      </div>
    </header>
  );
}
