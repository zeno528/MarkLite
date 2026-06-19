/**
 * 文件标签栏 - Edge 浏览器风格自适应标签
 * - 标签过多时自动收缩宽度（最小 80px）
 * - 激活标签与编辑区同色，形成延伸效果
 */
import { X, FileText } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

export function TabBar() {
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const switchFile = useEditorStore((s) => s.switchFile);
  const closeFile = useEditorStore((s) => s.closeFile);

  if (openFiles.length === 0) return null;

  return (
    <div className="flex h-[34px] shrink-0 select-none items-end overflow-hidden bg-[var(--color-bg)]">
      {openFiles.map((file, i) => {
        const isActive = file.path === activeFilePath;
        const nextIsActive = openFiles[i + 1]?.path === activeFilePath;
        return (
          <div
            key={file.path}
            className="flex items-end"
          >
            <div
              onClick={() => switchFile(file.path)}
              className={cn(
                "group relative flex h-[30px] min-w-[80px] shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs transition-colors",
                openFiles.length > 1 && "shrink basis-auto",
                isActive
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text)] rounded-t-md"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {isActive && (
                <div className="absolute -bottom-px left-0 right-0 h-px bg-[var(--color-bg-elevated)]" />
              )}
              <FileText size={13} className="shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate">{file.title}</span>
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
                    : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[var(--color-bg-muted)]",
                )}
              >
                <X size={11} />
              </button>
            </div>
            {!isActive && !nextIsActive && (
              <span className="flex h-[14px] w-px self-center bg-[var(--color-text-subtle)] opacity-30" />
            )}
          </div>
        );
      })}
      <div className="min-w-0 flex-1 self-stretch border-b border-[var(--color-border)]" />
    </div>
  );
}
