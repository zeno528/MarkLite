/**
 * 文件标签栏 - Edge 浏览器风格自适应标签
 * - 标签过多时自动收缩宽度（最小 80px）
 * - 激活标签与编辑区同色，形成延伸效果
 */
import { Fragment, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useLingui } from "@lingui/react";
import { cn } from "@/lib/utils/cn";

export function TabBar() {
  const { i18n } = useLingui();
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const switchFile = useEditorStore((s) => s.switchFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  if (openFiles.length === 0) return null;

  return (
    <div className="flex h-[34px] shrink-0 select-none items-end overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      {openFiles.map((file, i) => {
        const isActive = file.path === activeFilePath;
        const nextIsActive = openFiles[i + 1]?.path === activeFilePath;
        const showDivider = !isActive && !nextIsActive;
        const closeTitle = i18n.t("关闭 {title}", { title: file.title });
        return (
          <Fragment key={file.path}>
            <div
              onClick={() => switchFile(file.path)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ text: file.title, x: rect.left + rect.width / 2, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
              className={cn(
                "group relative flex h-[30px] shrink basis-[160px] min-w-0 cursor-pointer items-center gap-1.5 px-3 text-xs transition-colors",
                isActive
                  ? "bg-[var(--color-bg)] text-[var(--color-text)] rounded-t-md"
                  : "rounded-t-md text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {isActive && (
                <div className="absolute -bottom-px left-0 right-0 h-px bg-[var(--color-bg)]" />
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
                title={closeTitle}
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
            {/* 始终渲染分隔线占位，避免出现/消失导致布局抖动 */}
            <span
              className={cn(
                "flex h-[14px] w-px shrink-0 self-center bg-[var(--color-text-subtle)] transition-opacity",
                showDivider ? "opacity-30" : "opacity-0 pointer-events-none",
              )}
            />
          </Fragment>
        );
      })}
      {tooltip && createPortal(
        <span
          className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-md bg-[var(--color-text)] px-2 py-1 text-xs text-[var(--color-bg-elevated)] shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%) translateY(-6px)" }}
        >
          {tooltip.text}
        </span>,
        document.body,
      )}
    </div>
  );
}