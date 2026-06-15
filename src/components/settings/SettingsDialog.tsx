/**
 * 设置对话框（外壳）
 * 左分类导航 + 右内容区，分类由 sections.ts 注册表驱动
 * 进场动画：遮罩淡入 + 面板上浮（纯 CSS keyframes，见 globals.css）
 * open/onClose 受控，由 App.tsx 管理
 */
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SECTIONS, type SectionId } from "./sections";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [active, setActive] = useState<SectionId>("appearance");
  const current = SECTIONS.find((s) => s.id === active);

  if (!open || !current) return null;
  const Current = current.Component;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[settings-fade_150ms_ease_forwards]"
      onClick={onClose}
    >
      <div
        className="flex h-[600px] max-h-[85vh] w-[680px] max-w-[90vw] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)] animate-[settings-pop_150ms_ease_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左导航 */}
        <nav className="flex w-[160px] shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <h2 className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            设置
          </h2>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  isActive
                    ? "bg-[var(--color-bg-subtle)] font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 右内容 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{current.label}</h3>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label="关闭设置"
            >
              <X size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5 text-sm">
            <Current />
          </div>
        </div>
      </div>
    </div>
  );
}
