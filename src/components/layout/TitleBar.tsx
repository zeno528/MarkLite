/**
 * 自定义标题栏（替代系统原生窗口装饰）
 *
 * 职责：
 * - 应用 logo + 品牌名 + 菜单栏（左）
 * - 窗口控件：最小化 / 最大化-还原 / 关闭（右，仅 Windows/Linux）
 * - 整栏可拖拽移动窗口（data-tauri-drag-region），双击标题栏自动最大化/还原
 *
 * 跨平台策略：
 * - macOS：不渲染按钮（系统红绿灯通过 tauri.conf.json titleBarStyle:"Overlay" 叠加），
 *          左侧留 78px 红绿灯安全区
 * - Windows/Linux：App.tsx 启动时运行时 setDecorations(false) 关掉系统装饰，由本组件接管
 *
 * 配套样式：.titlebar-btn / .titlebar-close / .titlebar-menu-* 在 globals.css
 */
import { useEffect, useState, type CSSProperties } from "react";
import { getMainWindow } from "@/lib/window";
import { getPlatformSync } from "@/lib/utils/platform";
import { MenuBar, type MenuItem } from "@/components/ui/Menu";
import { COLOR_SCHEMES } from "@/lib/theme/colorSchemes";
import { useUIStore, type LayoutMode } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEditorStore } from "@/stores/editorStore";
import {
  newFile,
  openFileViaDialog,
  openFolderViaDialog,
  saveCurrentFile,
} from "@/lib/shortcuts/appShortcuts";
import logoSvg from "@/assets/logo.svg";

interface TitleBarProps {
  onOpenSettings?: () => void;
  onShowShortcuts?: () => void;
}

export function TitleBar({ onOpenSettings, onShowShortcuts }: TitleBarProps) {
  const [mac] = useState(() => getPlatformSync() === "macos");
  const [maximized, setMaximized] = useState(false);

  // 从 store 读取需要响应式更新的状态
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);
  const layout = useUIStore((s) => s.layout);
  const setLayout = useUIStore((s) => s.setLayout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const updateSettings = useSettingsStore((s) => s.update);
  const hasFile = useEditorStore((s) => !!s.currentFile);

  useEffect(() => {
    const win = getMainWindow();
    if (!win) return;
    win.isMaximized().then(setMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setMaximized);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const onMinimize = () => getMainWindow()?.minimize();
  const onToggleMaximize = () => getMainWindow()?.toggleMaximize();
  const onClose = () => getMainWindow()?.close();

  // 构建菜单数据
  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: "文件",
      items: [
        { label: "新建文件", shortcut: "Ctrl+N", onClick: newFile },
        { label: "打开文件", shortcut: "Ctrl+O", onClick: openFileViaDialog },
        { label: "打开文件夹", shortcut: "Ctrl+Shift+N", onClick: openFolderViaDialog },
        { type: "separator" },
        { label: "保存", shortcut: "Ctrl+S", onClick: saveCurrentFile, disabled: !hasFile },
        { type: "separator" },
        {
          label: "自动刷新",
          checked: autoRefresh,
          onClick: () => updateSettings("autoRefresh", !autoRefresh),
        },
      ],
    },
    {
      label: "视图",
      items: [
        {
          label: "编辑",
          checked: layout === "editor-only",
          onClick: () => setLayout("editor-only" as LayoutMode),
        },
        {
          label: "双栏",
          checked: layout === "split",
          onClick: () => setLayout("split" as LayoutMode),
        },
        {
          label: "预览",
          checked: layout === "preview-only",
          onClick: () => setLayout("preview-only" as LayoutMode),
        },
        { type: "separator" },
        { label: "切换侧栏", shortcut: "Ctrl+\\", onClick: toggleSidebar },
        { type: "separator" },
        {
          type: "submenu",
          label: "配色方案",
          checked: colorScheme !== "system",
          items: [
            {
              label: "跟随系统",
              checked: colorScheme === "system",
              onClick: () => setColorScheme("system"),
            },
            { type: "separator" },
            ...COLOR_SCHEMES.map((s) => ({
              label: s.name,
              checked: colorScheme === s.id,
              onClick: () => setColorScheme(s.id),
            })),
          ],
        },
      ],
    },
    {
      label: "帮助",
      items: [
        { label: "快捷键参考", shortcut: "Ctrl+K Ctrl+S", onClick: onShowShortcuts },
        { type: "separator" },
        { label: "关于", onClick: onOpenSettings },
      ],
    },
  ];

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 w-full shrink-0 select-none items-center justify-between bg-[var(--color-bg-muted)]"
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
    >
      {/* 左侧：logo + 品牌 + 菜单 */}
      <div className="flex items-center gap-2" style={{ paddingLeft: mac ? "78px" : "12px" }}>
        <img src={logoSvg} alt="MarkLite" className="h-4 w-4 shrink-0" draggable={false} />
        <MenuBar menus={menus} />
      </div>

      {/* 右侧：窗口控件（仅 Windows/Linux） */}
      {!mac && (
        <div
          className="flex h-full items-stretch"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <button type="button" onClick={onMinimize} aria-label="最小化" title="最小化" className="titlebar-btn">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M0 5 H10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button type="button" onClick={onToggleMaximize} aria-label={maximized ? "向下还原" : "最大化"} title={maximized ? "向下还原" : "最大化"} className="titlebar-btn">
            {maximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <rect x="2.5" y="0.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
                <path d="M0.5 2.5 V9.5 H7.5" stroke="currentColor" strokeWidth="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}
          </button>
          <button type="button" onClick={onClose} aria-label="关闭" title="关闭" className="titlebar-btn titlebar-close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M0.5 0.5 L9.5 9.5 M9.5 0.5 L0.5 9.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
