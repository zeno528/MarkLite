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
import { FileService } from "@/lib/tauri/fs";
import {
  openFileViaDialog,
  openFolderViaDialog,
} from "@/lib/shortcuts/appShortcuts";

export function EditorPane() {
  const currentFile = useEditorStore((s) => s.currentFile);
  const updateContent = useEditorStore((s) => s.updateContent);
  const markSaved = useEditorStore((s) => s.markSaved);

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
    const currentFile = useEditorStore.getState().currentFile;
    if (!currentFile) return;

    // 只有内容真的变化时才更新（避免文件加载时误触发）
    // 检查 value 是否和当前文件内容相同
    if (value === currentFile.content) return;

    // 检查 value 是否和当前文件的 savedContent 相同（文件加载时的初始值）
    if (value === currentFile.savedContent) return;

    // 检查 value 是否和当前文件的 path 匹配（避免切换文件时误触发）
    if (currentFile.path !== path) return;

    updateContent(currentFile.path, value);
  }, [updateContent, path]);

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
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-muted)] text-3xl">
            📝
          </div>

          {/* 标题 */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              欢迎使用 MarkLite
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              轻量级 Markdown 编辑器
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={openFileViaDialog}
            >
              <FileText size={16} />
              <span>打开文件</span>
            </button>
            <button
              className="btn-ghost"
              onClick={openFolderViaDialog}
            >
              <FolderOpen size={16} />
              <span>打开文件夹</span>
            </button>
          </div>

          {/* 快捷键提示 */}
          <div className="flex gap-4 text-xs text-[var(--color-text-subtle)]">
            <span>⌘O 打开</span>
            <span>⌘S 保存</span>
            <span>⌘\ 侧栏</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[var(--color-bg-elevated)]">
      <CodeEditor
        key={path}
        value={initValue}
        onChange={handleChange}
        onSave={handleSave}
      />
    </div>
  );
}
