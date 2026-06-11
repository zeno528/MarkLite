/**
 * 标题栏
 * - macOS: 自定义标题栏，保留红绿灯（titleBarStyle=Overlay）
 * - Windows: 标准窗口标题栏
 * - 显示当前文件名 + dirty 标记
 */
import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { isMac } from "@/lib/utils/platform";

export function TitleBar() {
  const currentFile = useEditorStore((s) => s.currentFile);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    isMac().then(setMac);
  }, []);

  // macOS 标题栏需要 -webkit-app-region: drag
  // Windows 不需要（用系统标准标题栏）
  return (
    <div
      data-tauri-drag-region
      className="flex h-[var(--titlebar-height)] w-full shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3"
      style={{
        // macOS 标题栏留出红绿灯空间（约 78px）
        paddingLeft: mac ? "78px" : "12px",
        // @ts-ignore -webkit-app-region
        WebkitAppRegion: "drag",
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-tight">MarkLite</span>
        {currentFile && (
          <>
            <span className="text-[var(--color-text-subtle)]">·</span>
            <span className="text-[var(--color-text-muted)]">
              {currentFile.title}
              {currentFile.isDirty && (
                <span className="ml-1 text-[var(--color-accent)]">●</span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
        {/* 右侧可以放主题切换、布局切换等按钮 */}
      </div>
    </div>
  );
}
