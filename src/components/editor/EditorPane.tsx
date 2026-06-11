/**
 * 编辑器面板
 * - 包含 CodeMirror 编辑器
 * - 处理 onChange → editorStore.updateContent
 * - 处理 onSave → editorStore.markSaved
 */
import { useCallback } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { useEditorStore } from "@/stores/editorStore";
import { FileService } from "@/lib/tauri/fs";

export function EditorPane() {
  const currentFile = useEditorStore((s) => s.currentFile);
  const updateContent = useEditorStore((s) => s.updateContent);
  const markSaved = useEditorStore((s) => s.markSaved);

  const handleChange = useCallback(
    (value: string) => {
      if (currentFile) {
        updateContent(currentFile.path, value);
      }
    },
    [currentFile, updateContent],
  );

  const handleSave = useCallback(async () => {
    if (!currentFile) return;
    try {
      await FileService.saveFile(currentFile.path, currentFile.content);
      markSaved(currentFile.path);
    } catch (e) {
      console.error("[EditorPane] save failed:", e);
    }
  }, [currentFile, markSaved]);

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
        value={currentFile.content}
        onChange={handleChange}
        onSave={handleSave}
      />
    </div>
  );
}
