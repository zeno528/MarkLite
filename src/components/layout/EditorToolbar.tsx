/**
 * 工具栏（顶部菜单模拟 - macOS 走系统菜单，Windows 在窗口内显示）
 * - 打开文件 / 打开文件夹 / 保存
 * - 主题切换（亮/暗/系统）
 * - 布局切换（双栏/编辑/预览）
 * - 侧边栏切换
 */
import { useEffect, useState } from "react";
import { FolderOpen, FileText, Save, Sun, Moon, Monitor, Columns2, File as FileIcon, Eye, Settings } from "lucide-react";
import { useUIStore, type LayoutMode } from "@/stores/uiStore";
import { FileService } from "@/lib/tauri/fs";
import { useEditorStore } from "@/stores/editorStore";
import { useFileStore } from "@/stores/fileStore";
import { isMac } from "@/lib/utils/platform";
import { cn } from "@/lib/utils/cn";

interface EditorToolbarProps {
  onOpenSettings?: () => void;
}

export function EditorToolbar({ onOpenSettings }: EditorToolbarProps = {}) {
  const [mac, setMac] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const layout = useUIStore((s) => s.layout);
  const setLayout = useUIStore((s) => s.setLayout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const openFile = useEditorStore((s) => s.openFile);
  const markSaved = useEditorStore((s) => s.markSaved);
  const currentFile = useEditorStore((s) => s.currentFile);
  const setRootFolder = useFileStore((s) => s.setRootFolder);
  const setFileTree = useFileStore((s) => s.setFileTree);

  useEffect(() => {
    isMac().then(setMac);
  }, []);

  const handleOpenFile = async () => {
    const file = await FileService.openFile();
    if (file) {
      openFile(file.path, file.title, file.content);
    }
  };

  const handleOpenFolder = async () => {
    const { pickFolder } = await import("@/lib/tauri/dialog");
    const folder = await pickFolder();
    if (!folder) return;
    setRootFolder(folder);
    try {
      const tree = await FileService.readFolderTree(folder);
      setFileTree(tree);
    } catch (e) {
      console.error("[Toolbar] read folder failed:", e);
    }
  };

  const handleSave = async () => {
    if (!currentFile) return;
    try {
      await FileService.saveFile(currentFile.path, currentFile.content);
      markSaved(currentFile.path);
    } catch (e) {
      console.error("[Toolbar] save failed:", e);
    }
  };

  // macOS 用系统菜单栏，工具栏只显示在 Windows/Linux
  if (mac) {
    return (
      <div
        className="flex h-9 w-full shrink-0 items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3"
        style={{ paddingLeft: "78px" }}
      >
        <span className="text-sm font-semibold tracking-tight">MarkLite</span>
        <div className="flex-1" />
        <ToolbarRight
          theme={theme}
          setTheme={setTheme}
          layout={layout}
          setLayout={setLayout}
          showSidebar={showSidebar}
          toggleSidebar={toggleSidebar}
          onOpenSettings={onOpenSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-full shrink-0 items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3">
      {/* Windows/Linux: 工具栏 + 菜单按钮 */}
      <button
        onClick={handleOpenFile}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
        title="打开文件 (Ctrl+O)"
      >
        <FileText size={13} /> 打开
      </button>
      <button
        onClick={handleOpenFolder}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
        title="打开文件夹"
      >
        <FolderOpen size={13} /> 文件夹
      </button>
      <button
        onClick={handleSave}
        disabled={!currentFile || !currentFile.isDirty}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40"
        title="保存 (Ctrl+S)"
      >
        <Save size={13} /> 保存
      </button>
      <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <ToolbarRight
        theme={theme}
        setTheme={setTheme}
        layout={layout}
        setLayout={setLayout}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}

function ToolbarRight({
  theme,
  setTheme,
  layout,
  setLayout,
  showSidebar,
  toggleSidebar,
  onOpenSettings,
}: {
  theme: string;
  setTheme: (t: any) => void;
  layout: LayoutMode;
  setLayout: (l: LayoutMode) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  onOpenSettings?: () => void;
}) {
  const layouts: { mode: LayoutMode; icon: React.ReactNode; title: string }[] = [
    { mode: "editor-only", icon: <FileIcon size={13} />, title: "仅编辑" },
    { mode: "split", icon: <Columns2 size={13} />, title: "双栏" },
    { mode: "preview-only", icon: <Eye size={13} />, title: "仅预览" },
  ];

  return (
    <div className="flex items-center gap-1">
      {/* 布局切换 */}
      <div className="flex items-center rounded border border-[var(--color-border)]">
        {layouts.map((l) => (
          <button
            key={l.mode}
            onClick={() => setLayout(l.mode)}
            className={cn(
              "flex h-6 w-7 items-center justify-center",
              layout === l.mode
                ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]",
            )}
            title={l.title}
          >
            {l.icon}
          </button>
        ))}
      </div>
      {/* 主题切换 */}
      <div className="flex items-center rounded border border-[var(--color-border)]">
        {[
          { mode: "light", icon: <Sun size={13} />, title: "亮色" },
          { mode: "dark", icon: <Moon size={13} />, title: "暗色" },
          { mode: "system", icon: <Monitor size={13} />, title: "跟随系统" },
        ].map((t) => (
          <button
            key={t.mode}
            onClick={() => setTheme(t.mode as any)}
            className={cn(
              "flex h-6 w-7 items-center justify-center",
              theme === t.mode
                ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]",
            )}
            title={t.title}
          >
            {t.icon}
          </button>
        ))}
      </div>
      {/* 侧边栏切换 */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "flex h-6 items-center gap-1 rounded border border-[var(--color-border)] px-2 text-xs",
          showSidebar
            ? "bg-[var(--color-bg-muted)]"
            : "text-[var(--color-text-muted)]",
        )}
        title="切换侧边栏 (Ctrl+\\)"
      >
        <FolderOpen size={13} /> 文件
      </button>
      {/* 设置入口 */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="flex h-6 w-7 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
          title="设置 (Ctrl+,)"
        >
          <Settings size={13} />
        </button>
      )}
    </div>
  );
}
