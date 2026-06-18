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
} from "lucide-react";
import logoSvg from "@/assets/logo.svg";
import { useUIStore, type LayoutMode } from "@/stores/uiStore";
import { useEditorStore } from "@/stores/editorStore";
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

  return (
    <header
      data-tauri-drag-region
      className="flex h-[50px] w-full shrink-0 items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] pr-4"
      style={{ paddingLeft: mac ? "78px" : "16px", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* 品牌 + 面包屑 */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
        <img src={logoSvg} alt="MarkLite" className="h-[22px] w-[22px] shrink-0" />
        <span className="shrink-0 text-[14.5px] font-bold tracking-tight">MarkLite</span>

        {!currentFile && rootFolderName && (
          <>
            <ChevronRight size={12} className="mx-0.5 shrink-0 text-[var(--color-text-subtle)]" />
            <span
              className="truncate text-[var(--color-text-muted)]"
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
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium text-[var(--color-text)]"
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
        <button
          className="btn-primary"
          onClick={openFileViaDialog}
          title="打开文件 (Ctrl+O)"
        >
          <FileInput size={14} />
          <span>打开</span>
        </button>
        <button
          className="btn-primary"
          onClick={openFolderViaDialog}
          title="添加文件夹"
        >
          <FolderPlus size={14} />
          <span>添加文件夹</span>
        </button>

        {/* 次操作 pill 组：保存 + 布局 */}
        <div className="tool-group">
          <button
            className={cn("tbtn", currentFile?.isDirty && "active")}
            onClick={saveCurrentFile}
            disabled={!currentFile || !currentFile.isDirty}
            title={currentFile?.isDirty ? "保存 (Ctrl+S) — 有未保存的修改" : "保存 (Ctrl+S)"}
          >
            <Save size={14} />
            <span>保存</span>
          </button>
        </div>

        <div className="tool-group">
          {layouts.map((l) => (
            <button
              key={l.mode}
              className={cn("tbtn", layout === l.mode && "active")}
              onClick={() => setLayout(l.mode)}
              title={l.label}
            >
              {l.icon}
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        {/* 单图标按钮（侧栏 / 设置） */}
        <button
          className={cn("icon-btn", showSidebar && "active")}
          onClick={toggleSidebar}
          title="主侧栏 (Ctrl+\\)"
          aria-label="切换侧栏"
        >
          <PanelLeft size={15} />
        </button>

        {onOpenSettings && (
          <button
            className="icon-btn"
            onClick={onOpenSettings}
            title="设置 (Ctrl+,)"
            aria-label="设置"
          >
            <Settings size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
