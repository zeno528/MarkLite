/**
 * 底部状态栏
 * - 光标位置（行:列）
 * - 字数（中英混合）
 * - 文件状态（已保存/未保存）
 * - 文件类型
 */
import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";

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
          Ln {cursor.line}, Col {cursor.ch + 1}
        </span>
        <span>·</span>
        <span>{wc.words} 字</span>
        <span>·</span>
        <span>{wc.lines} 行</span>
        <span>·</span>
        <span>{Math.max(1, Math.round(wc.words / 300))} 分钟阅读</span>
      </div>
      <div className="flex items-center gap-3">
        {currentFile && (
          <>
            <span>{currentFile.ext.toUpperCase()}</span>
            <span>·</span>
            <span
              className={
                currentFile.isDirty
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-success)]"
              }
            >
              {currentFile.isDirty ? "●未保存" : "已保存"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
