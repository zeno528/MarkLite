/**
 * 编辑器面板
 * - 包含 CodeMirror 编辑器
 * - 处理 onChange → editorStore.updateContent
 * - 处理 onSave → editorStore.markSaved
 */
import { useCallback, useEffect, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { useEditorStore } from "@/stores/editorStore";
import { FileService } from "@/lib/tauri/fs";

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
      <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-subtle)]">
        <div className="text-center">
          <p className="text-lg">📝</p>
          <p>从左侧文件树打开一个 Markdown 文件</p>
          <p className="mt-1 text-xs">或按 ⌘/Ctrl + O 打开文件</p>
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
