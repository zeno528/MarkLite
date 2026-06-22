/**
 * 自定义标题栏（替代系统原生窗口装饰）
 *
 * 职责：
 * - 应用品牌标识（左）
 * - 窗口控件：最小化 / 最大化-还原 / 关闭（右，仅 Windows/Linux）
 * - 整栏可拖拽移动窗口（data-tauri-drag-region），双击标题栏自动最大化/还原
 *
 * 跨平台策略：
 * - macOS：不渲染按钮（系统红绿灯通过 tauri.conf.json titleBarStyle:"Overlay" 叠加），
 *          左侧留 78px 红绿灯安全区
 * - Windows/Linux：App.tsx 启动时运行时 setDecorations(false) 关掉系统装饰，由本组件接管
 *
 * 配套样式：.titlebar-btn / .titlebar-close 在 globals.css
 */
import { useEffect, useState, type CSSProperties } from "react";
import { getMainWindow } from "@/lib/window";
import { getPlatformSync } from "@/lib/utils/platform";

export function TitleBar() {
  // 同步检测：首帧即正确，避免 macOS 上闪烁 Windows 三按钮
  const [mac] = useState(() => getPlatformSync() === "macos");
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getMainWindow();
    if (!win) return;
    // 初始读取 + 监听 resize 切换最大化/还原图标
    win.isMaximized().then(setMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setMaximized);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const onMinimize = () => getMainWindow()?.minimize();
  const onToggleMaximize = () => getMainWindow()?.toggleMaximize();
  const onClose = () => getMainWindow()?.close();

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 w-full shrink-0 select-none items-center justify-between bg-[var(--color-bg-elevated)]"
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
    >
      {/* 左侧：品牌标识（macOS 留红绿灯 78px 安全区） */}
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: mac ? "78px" : "12px" }}
      >
        <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-sm" />
        <span className="text-[12px] font-medium tracking-tight text-[var(--color-text-muted)]">
          MarkLite
        </span>
      </div>

      {/* 右侧：窗口控件（仅 Windows/Linux） */}
      {!mac && (
        <div
          className="flex h-full items-stretch"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          {/* 最小化 */}
          <button
            type="button"
            onClick={onMinimize}
            aria-label="最小化"
            title="最小化"
            className="titlebar-btn"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M0 5 H10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>

          {/* 最大化 / 还原 */}
          <button
            type="button"
            onClick={onToggleMaximize}
            aria-label={maximized ? "向下还原" : "最大化"}
            title={maximized ? "向下还原" : "最大化"}
            className="titlebar-btn"
          >
            {maximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                {/* 还原：前景方框（右上完整） + 背景 L 形（左+底露出） */}
                <rect x="2.5" y="0.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
                <path d="M0.5 2.5 V9.5 H7.5" stroke="currentColor" strokeWidth="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}
          </button>

          {/* 关闭（hover 红，Windows 11 标准 #c42b1c） */}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
            className="titlebar-btn titlebar-close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M0.5 0.5 L9.5 9.5 M9.5 0.5 L0.5 9.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
