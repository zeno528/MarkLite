/**
 * 编辑器面板
 * - 包含 CodeMirror 编辑器
 * - 处理 onChange → editorStore.updateContent
 * - 处理 onSave → editorStore.markSaved
 * - 空状态：居中卡片 + 快捷动作 + 快捷键提示（参考 AI Studio 风格）
 */
import { useCallback, useEffect, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { FileService } from "@/lib/tauri/fs";
import { cn } from "@/lib/utils/cn";
import {
  openFileViaDialog,
  openFolderViaDialog,
} from "@/lib/shortcuts/appShortcuts";

export function EditorPane() {
  const currentFile = useEditorStore((s) => s.currentFile);
  const updateContent = useEditorStore((s) => s.updateContent);
  const markSaved = useEditorStore((s) => s.markSaved);

  // 纯编辑模式（editor-only）用卡片包裹，与纯预览（preview-only）的卡片视觉一致
  const isCardMode = useUIStore((s) => s.layout) === "editor-only";

  // 仅在切换文件时更新编辑器初始内容（用 key 强制重建 + 稳定 value）。
  // 打字时不回灌 value 给 @uiw，避免受控 value 同步在快速打字时用滞后值覆盖、吞字符。
  const path = currentFile?.path ?? "";
  const [initValue, setInitValue] = useState(currentFile?.content ?? "");
  useEffect(() => {
    setInitValue(useEditorStore.getState().currentFile?.content ?? "");
  }, [path]);

  // handleChange/handleSave 引用稳定（不依赖 currentFile），
  // 避免 @uiw 因 onChange 引用变化频繁 reconfigure extensions + value 回灌竞争导致吞字符
  const handleChange = useCallback((value: string) => {
    const p = useEditorStore.getState().currentFile?.path;
    if (p) updateContent(p, value);
  }, [updateContent]);

  const handleSave = useCallback(async () => {
    const file = useEditorStore.getState().currentFile;
    if (!file) return;
    try {
      await FileService.saveFile(file.path, file.content);
      markSaved(file.path);
    } catch (e) {
      console.error("[EditorPane] save failed:", e);
    }
  }, [markSaved]);

  if (!currentFile) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-muted)] p-8">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] text-2xl">
            📝
          </div>
          <div>
            <h3 className="mb-1.5 text-[15px] font-semibold text-[var(--color-text)]">
              打开 Markdown 开始
            </h3>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
              从左侧文件树选择文件，或使用下方按钮快速开始
            </p>
          </div>
          <div className="flex w-full gap-2">
            <button
              className="btn-primary flex-1 justify-center"
              onClick={openFileViaDialog}
            >
              <FileText size={14} />
              <span>打开文件</span>
            </button>
            <button
              className="btn-ghost flex-1 justify-center"
              onClick={openFolderViaDialog}
            >
              <FolderOpen size={14} />
              <span>打开文件夹</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--color-text-subtle)]">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                ⌘ O
              </kbd>
              打开
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                ⌘ S
              </kbd>
              保存
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                ⌘ \
              </kbd>
              侧栏
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 纯编辑模式用卡片包裹（与纯预览卡片完全一致）：
  // 外层为滚动容器（overflow-auto），卡片用 min-h——内容少时撑满视口、内容多时变长，
  // 滚动时卡片整体随滚动移动、顶部圆角可见（而非固定在视口内）。
  // 上下 my-3 留出与 TopBar / StatusBar 的间距；双栏模式直接平铺（无卡片）。
  return (
    <div
      className={cn(
        "h-full w-full",
        isCardMode ? "overflow-auto bg-[var(--color-bg)]" : "overflow-hidden bg-[var(--color-bg-elevated)]",
      )}
    >
      <div
        className={cn(
          "w-full",
          isCardMode
            ? "my-3 min-h-[calc(100%-1.5rem)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-md)]"
            : "h-full",
        )}
      >
        <CodeEditor
          key={path}
          value={initValue}
          onChange={handleChange}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
