/**
 * 底部状态栏
 * - 光标位置（行:列）
 * - 字数（中英混合）
 * - 文件状态（已保存/未保存，圆点 + 文字）
 * - 文件类型
 */
import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

export function StatusBar() {
  const cursor = useEditorStore((s) => s.cursor);
  const currentFile = useEditorStore((s) => s.currentFile);
  const [wc, setWc] = useState({ chars: 0, words: 0, lines: 0 });

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
        <span>
          行 {cursor.line}，列 {cursor.ch + 1}
        </span>
        <span className="text-[var(--color-text-subtle)]">·</span>
        <span>{wc.words} 字</span>
        <span className="text-[var(--color-text-subtle)]">·</span>
        <span>{wc.lines} 行</span>
      </div>
      <div className="flex items-center gap-2">
        {currentFile && (
          <>
            {/* 文件类型徽章：accent 淡底胶囊 */}
            <span className="rounded-md bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-accent)]">
              {currentFile.ext.toUpperCase()}
            </span>
            {/* 保存状态：圆点 + 文字；未保存 warning 醒目，已保存 subtle 低调（常态不抢眼） */}
            <span
              className={cn(
                "flex items-center gap-1.5",
                currentFile.isDirty
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-text-subtle)]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentFile.isDirty
                    ? "bg-[var(--color-warning)] shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-warning)_25%,transparent)]"
                    : "bg-[var(--color-success)]",
                )}
              />
              <span className="font-medium">{currentFile.isDirty ? "未保存" : "已保存"}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
