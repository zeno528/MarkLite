/**
 * 设置对话框（外壳）
 * 左分类导航 + 右内容区，分类由 sections.ts 注册表驱动
 * 进场动画：遮罩淡入 + 面板上浮（纯 CSS keyframes，见 globals.css）
 * 退场动画：遮罩淡出 + 面板下沉（200ms）
 * 内容切换：淡入过渡（200ms）
 * open/onClose 受控，由 App.tsx 管理
 */
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { cn } from "@/lib/utils/cn";
import { SECTIONS, type SectionId } from "./sections";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  initialSection?: SectionId;
}

export function SettingsDialog({ open, onClose, initialSection }: SettingsDialogProps) {
  const { i18n } = useLingui();

  // 分类导航本地化映射（用 <Trans> 才能被 lingui extract 提取）
  const NAV_LABEL: Record<SectionId, ReactNode> = {
    appearance: <Trans>外观</Trans>,
    editor: <Trans>编辑器</Trans>,
    language: <Trans>语言</Trans>,
    about: <Trans>关于</Trans>,
  };
  const [active, setActive] = useState<SectionId>("appearance");
  const [contentKey, setContentKey] = useState(0);
  const [visible, setVisible] = useState(false); // 控制退场动画
  const [mounted, setMounted] = useState(false); // 控制 DOM 挂载
  const current = SECTIONS.find((s) => s.id === active);

  // open 变化时处理进场/退场
  useEffect(() => {
    if (open) {
      if (initialSection) setActive(initialSection);
      setMounted(true);
      // 等 DOM 挂载后再触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else if (mounted) {
      // 开始退场动画
      setVisible(false);
      // 等动画结束后卸载
      const timer = setTimeout(() => {
        setMounted(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  // 关闭时触发退场动画
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // 切换分类时触发内容淡入动画
  const handleTabChange = (id: SectionId) => {
    if (id === active) return;
    setActive(id);
    setContentKey((k) => k + 1);
  };

  if (!mounted || !current) return null;
  const Current = current.Component;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-200",
        visible ? "bg-black/40" : "bg-black/0",
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "flex h-[600px] max-h-[85vh] w-[680px] max-w-[90vw] overflow-hidden rounded-[var(--radius-xl)]",
          "border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)]",
          "transition-all duration-200",
          visible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-2",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左导航 */}
        <nav className="flex w-[160px] shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-bg)] p-2 select-none">
          <h2 className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            <Trans>设置</Trans>
          </h2>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleTabChange(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150",
                  isActive
                    ? "bg-[var(--color-bg-subtle)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                )}
              >
                <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center"><Icon size={15} /></span>
                <span className="flex-1 truncate">{NAV_LABEL[s.id]}</span>
              </button>
            );
          })}
        </nav>

        {/* 右内容 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{NAV_LABEL[active]}</h3>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label={i18n.t(`关闭设置`)}
            >
              <X size={14} />
            </button>
          </div>
          <div
            key={contentKey}
            className="min-h-0 flex-1 overflow-auto p-5 text-sm animate-[content-fade_200ms_ease_forwards]"
          >
            <Current />
          </div>
        </div>
      </div>
    </div>
  );
}
