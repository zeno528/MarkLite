/**
 * 文件标签栏 - VSCode 风格延伸式标签
 * - 始终显示（即使只有 1 个文件）
 * - 激活标签与编辑区同色，形成延伸效果
 * - 未激活标签轻微区分，无边框割裂
 */
import { X, FileText } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

export function TabBar() {
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const switchFile = useEditorStore((s) => s.switchFile);
  const closeFile = useEditorStore((s) => s.closeFile);

  // 无文件时不显示
  if (openFiles.length === 0) return null;

  return (
    <div className="flex h-[34px] shrink-0 items-end bg-[var(--color-bg)]">
      {openFiles.map((file) => {
        const isActive = file.path === activeFilePath;
        return (
          <div
            key={file.path}
            onClick={() => switchFile(file.path)}
            className={cn(
              "group relative flex h-[30px] shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs transition-colors",
              isActive
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text)] rounded-t-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            )}
          >
            {/* 激活标签底部遮盖边框 */}
            {isActive && (
              <div className="absolute -bottom-px left-0 right-0 h-px bg-[var(--color-bg-elevated)]" />
            )}
            <FileText size={13} className="shrink-0 opacity-70" />
            <span className="max-w-[120px] truncate">{file.title}</span>
            {file.isDirty && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warning)]" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
              title={`关闭 ${file.title}`}
              className={cn(
                "ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all",
                isActive
                  ? "hover:bg-[var(--color-bg-muted)] opacity-60 hover:opacity-100"
                  : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[var(--color-bg-muted)]"
              )}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
      {/* 底部分隔线（非激活区域） */}
      <div className="flex-1 self-stretch border-b border-[var(--color-border)]" />
    </div>
  );
}
