/**
 * 顶栏（合并自 TitleBar + EditorToolbar，单层）
 * 左：品牌 + 文件名(dirty)   右：药丸工具组（打开/保存 | 布局 | 配色 | 主侧栏 | 设置）
 * macOS: 留出红绿灯 78px 安全区，整栏可拖拽，按钮区 no-drag
 */
import { useEffect, useState } from "react";
import { FolderOpen, FileText, Save, Columns2, File as FileIcon, Eye, Settings, PanelLeft } from "lucide-react";
import logoSvg from "@/assets/logo.svg";
import { useUIStore, type LayoutMode } from "@/stores/uiStore";
import { useEditorStore } from "@/stores/editorStore";
import { COLOR_SCHEMES } from "@/lib/theme/colorSchemes";
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

  const layout = useUIStore((s) => s.layout);
  const setLayout = useUIStore((s) => s.setLayout);
  const resolvedScheme = useUIStore((s) => s.resolvedScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const layouts: { mode: LayoutMode; icon: React.ReactNode; title: string }[] = [
    { mode: "editor-only", icon: <FileIcon size={15} />, title: "仅编辑" },
    { mode: "split", icon: <Columns2 size={15} />, title: "双栏" },
    { mode: "preview-only", icon: <Eye size={15} />, title: "仅预览" },
  ];

  return (
    <header
      data-tauri-drag-region
      className="flex h-[50px] w-full shrink-0 items-center gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] pr-4"
      style={{ paddingLeft: mac ? "78px" : "16px", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* 品牌 */}
      <div className="flex items-center gap-2">
        <img src={logoSvg} alt="MarkLite" className="h-[22px] w-[22px]" />
        <span className="text-[14.5px] font-bold tracking-tight">MarkLite</span>
      </div>

      {/* 文件名 + dirty */}
      {currentFile && (
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="text-[var(--color-text-subtle)]">/</span>
          <span className="truncate font-medium text-[var(--color-text)]">{currentFile.title}</span>
          {currentFile.isDirty && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* 工具按钮组（不参与拖拽） */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="tool-group">
          <button className="tbtn" onClick={openFileViaDialog} title="打开文件 (Ctrl+O)">
            <FileText size={15} /> 打开
          </button>
          <button className="tbtn" onClick={openFolderViaDialog} title="打开文件夹">
            <FolderOpen size={15} /> 文件夹
          </button>
          <button
            className="tbtn"
            onClick={saveCurrentFile}
            disabled={!currentFile || !currentFile.isDirty}
            title="保存 (Ctrl+S)"
          >
            <Save size={15} /> 保存
          </button>
        </div>

        <div className="tool-group">
          {layouts.map((l) => (
            <button
              key={l.mode}
              className={cn("tbtn icon", layout === l.mode && "active")}
              onClick={() => setLayout(l.mode)}
              title={l.title}
            >
              {l.icon}
            </button>
          ))}
        </div>

        <div className="tool-group">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              className={cn("tbtn icon", resolvedScheme === scheme.id && "active")}
              onClick={() => setColorScheme(scheme.id)}
              title={scheme.name}
            >
              <span
                className="h-[11px] w-[11px] rounded-full border-[1.5px] border-white/40"
                style={{ backgroundColor: scheme.swatch.accent }}
              />
            </button>
          ))}
        </div>

        <div className="tool-group">
          <button
            className={cn("tbtn icon", showSidebar && "active")}
            onClick={toggleSidebar}
            title="主侧栏 (Ctrl+\\)"
          >
            <PanelLeft size={15} />
          </button>
        </div>

        {onOpenSettings && (
          <div className="tool-group">
            <button className="tbtn icon" onClick={onOpenSettings} title="设置 (Ctrl+,)">
              <Settings size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
