/**
 * 底部状态栏
 * - 光标位置（行:列）
 * - 字数（中英混合）
 * - 文件状态（已保存/未保存，圆点 + 文字）
 * - 文件类型
 */
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useRefreshStore } from "@/stores/refreshStore";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";
import { reloadCurrentFile } from "@/lib/shortcuts/appShortcuts";
import { notify } from "@/stores/notificationStore";

export function StatusBar() {
  const cursor = useEditorStore((s) => s.cursor);
  const selection = useEditorStore((s) => s.selection);
  const currentFile = useEditorStore((s) => s.currentFile);
  const [wc, setWc] = useState({ chars: 0, words: 0, lines: 0 });
  const reloading = useRefreshStore((s) => s.reloading);
  const setReloading = useRefreshStore((s) => s.setReloading);

  const handleReload = async () => {
    if (reloading) return; // 旋转中防重复点击
    setReloading(true);
    const minSpin = new Promise<void>((r) => setTimeout(r, 400));
    try {
      const hasChanges = await Promise.all([reloadCurrentFile(false), minSpin]);
      if (hasChanges[0]) {
        notify.info("已刷新");
      }
    } finally {
      setReloading(false);
    }
  };

  // 字数从 CodeMirror 同步 - 但更简单做法是从 currentFile.content 算
  useEffect(() => {
    if (!currentFile) {
      setWc({ chars: 0, words: 0, lines: 0 });
      return;
    }
    const text = currentFile.content;
    const lines = text.split("\n").length;
    const chars = text.length;
    const cnChars = (text.match(/[一-龥]/g) || []).length;
    const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
    setWc({ chars, words: cnChars + enWords, lines });
  }, [currentFile?.content, currentFile]);

  return (
    <div
      className="flex h-[var(--statusbar-height)] w-full shrink-0 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-xs text-[var(--color-text-muted)]"
    >
      <div className="flex items-center gap-3">
        {/* 模块1：刷新按钮 */}
        <Tooltip content="刷新 (Ctrl+R) — 从磁盘重新读取当前文件" placement="top">
          <button
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
            onClick={handleReload}
            disabled={!currentFile}
            aria-label="刷新当前文件"
          >
            <RefreshCw size={13} className={cn(reloading && "animate-spin")} />
          </button>
        </Tooltip>

        {/* 模块2：文档统计 */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-subtle)]">|</span>
          <span>{wc.words} 字</span>
          <span className="text-[var(--color-text-subtle)]">·</span>
          <span>{wc.lines} 行</span>
        </div>

        {/* 模块3：光标位置 + 选中信息 */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-subtle)]">|</span>
          <span>
            行 {cursor.line}，列 {cursor.ch + 1}
          </span>
          {selection.chars > 0 && (
            <>
              <span className="text-[var(--color-text-subtle)]">·</span>
              <span>选中 {selection.chars} 字符 / {selection.words} 词</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentFile && (
          <>
            {/* 文件类型徽章：accent 淡底胶囊 */}
            <span className="rounded-md bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-accent)]">
              {currentFile.ext.toUpperCase()}
            </span>
            {/* 保存状态：胶囊样式 */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                currentFile.isDirty
                  ? "bg-[color-mix(in_oklch,var(--color-warning)_15%,transparent)] text-[var(--color-warning)]"
                  : "bg-[color-mix(in_oklch,var(--color-success)_15%,transparent)] text-[var(--color-success)]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentFile.isDirty ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]",
                )}
              />
              {currentFile.isDirty ? "未保存" : "已保存"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
