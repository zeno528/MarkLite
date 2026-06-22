/**
 * 编辑器面板
 * - 包含 CodeMirror 编辑器
 * - 处理 onChange → editorStore.updateContent
 * - 处理 onSave → editorStore.markSaved
 * - 空状态：居中卡片 + 快捷动作 + 快捷键提示（参考 AI Studio 风格）
 */
import { useCallback, useEffect, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import logoSvg from "@/assets/logo.svg";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { useEditorStore } from "@/stores/editorStore";
import { FileService } from "@/lib/tauri/fs";
import {
  openFileViaDialog,
  openFolderViaDialog,
} from "@/lib/shortcuts/appShortcuts";
import { TabBar } from "./TabBar";

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
      <div className="flex h-full w-full flex-col bg-[var(--color-bg)]">
        <TabBar />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Logo */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[var(--color-border)] transition-transform duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, color-mix(in oklch, var(--color-accent) 10%, transparent), color-mix(in oklch, var(--color-accent) 4%, transparent))`,
                boxShadow: `0 4px 16px color-mix(in oklch, var(--color-accent) 12%, transparent)`,
              }}
            >
              <img src={logoSvg} alt="MarkLite" className="h-10 w-10" />
            </div>

            {/* 标题 */}
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                欢迎使用 MarkLite
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
                轻量级 Markdown 编辑器
              </p>
            </div>

            {/* 操作按钮 — 与顶栏一致的 btn-primary 样式 */}
            <div className="flex gap-2">
              <button className="btn-primary" onClick={openFileViaDialog}>
                <FileText size={15} />
                <span>打开文件</span>
              </button>
              <button className="btn-primary" onClick={openFolderViaDialog}>
                <FolderOpen size={15} />
                <span>打开文件夹</span>
              </button>
            </div>

            {/* 快捷键提示 */}
            <div className="flex gap-3 text-[11px] text-[var(--color-text-subtle)]">
              <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1 py-0.5 text-[10px]">Ctrl+O</kbd> 打开</span>
              <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1 py-0.5 text-[10px]">Ctrl+S</kbd> 保存</span>
              <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1 py-0.5 text-[10px]">Ctrl+\</kbd> 侧栏</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <TabBar />
      <div className="min-h-0 flex-1 bg-[var(--color-bg)]">
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
