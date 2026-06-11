/**
 * 多文件 Tab 栏
 * - 显示所有打开的文件
 * - 点击切换
 * - × 关闭（带 dirty 提示）
 */
import { X } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { confirmDialog } from "@/lib/tauri/dialog";
import { cn } from "@/lib/utils/cn";

export function FileTabs() {
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const switchFile = useEditorStore((s) => s.switchFile);
  const closeFile = useEditorStore((s) => s.closeFile);

  const handleClose = async (e: React.MouseEvent, path: string, isDirty: boolean) => {
    e.stopPropagation();
    if (isDirty) {
      const ok = await confirmDialog(
        "当前文件有未保存的修改，确定关闭吗？",
        "MarkLite",
        "关闭",
        "取消",
      );
      if (!ok) return;
    }
    closeFile(path);
  };

  if (openFiles.length === 0) return null;

  return (
    <div className="flex h-8 w-full shrink-0 items-center overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {openFiles.map((file) => {
        const active = file.path === activeFilePath;
        return (
          <div
            key={file.path}
            onClick={() => switchFile(file.path)}
            className={cn(
              "group flex h-full cursor-pointer items-center gap-2 border-r border-[var(--color-border)] px-3 text-xs",
              active
                ? "bg-[var(--color-bg)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]",
            )}
            title={file.path}
          >
            {file.isDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            )}
            <span className="max-w-[200px] truncate">{file.title}</span>
            <button
              onClick={(e) => handleClose(e, file.path, file.isDirty)}
              className="flex h-4 w-4 items-center justify-center rounded-sm opacity-0 hover:bg-[var(--color-border-strong)] group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
