/**
 * 自定义确认对话框 — 替代系统原生 confirm/ask
 * 居中弹出、毛玻璃遮罩、键盘支持（Enter 确认 / Esc 取消）
 */
import { useEffect, useRef } from "react";
import { useConfirmStore } from "@/stores/confirmStore";
import { useLingui } from "@lingui/react";
import { cn } from "@/lib/utils/cn";

export function ConfirmDialog() {
  const { i18n } = useLingui();
  const options = useConfirmStore((s) => s.options);
  const confirm = useConfirmStore((s) => s.confirm);
  const cancel = useConfirmStore((s) => s.cancel);
  const discard = useConfirmStore((s) => s.discard);
  const okRef = useRef<HTMLButtonElement>(null);

  // 自动聚焦确认按钮
  useEffect(() => {
    if (options) {
      // 延迟一帧，等动画开始后再聚焦
      requestAnimationFrame(() => okRef.current?.focus());
    }
  }, [options]);

  // 键盘：Enter 确认 / Esc 取消
  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        confirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [options, confirm, cancel]);

  if (!options) return null;

  const { title, message, okLabel: rawOk, cancelLabel: rawCancel, discardLabel, danger } = options;
  const okLabel = rawOk ?? i18n.t("确定");
  const cancelLabel = rawCancel ?? i18n.t("取消");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fade-in_150ms_ease]"
      onClick={cancel}
    >
      <div
        className="w-[380px] max-w-[90vw] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)] animate-[pop-in_200ms_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-[15px] font-semibold text-[var(--color-text)]">{title}</h2>
        </div>

        {/* 消息 */}
        <div className="px-5 pb-5">
          <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)] whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* 按钮：三选项时 [不保存 danger] 靠左 / [取消] [保存] 靠右（HIG：破坏性按钮远离安全按钮防误点）；
            两选项时保持 [取消] [确认] 靠右；danger 仅在两选项时让确认按钮变红 */}
        {discardLabel ? (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-5 py-3">
            <button
              onClick={discard}
              className="h-8 rounded-[var(--radius-md)] px-3 text-[12.5px] font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              {discardLabel}
            </button>
            <div className="flex gap-2">
              <button
                onClick={cancel}
                className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 text-[12.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]"
              >
                {cancelLabel}
              </button>
              <button
                ref={okRef}
                onClick={confirm}
                className="h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-[12.5px] font-medium text-white transition-colors hover:brightness-110"
              >
                {okLabel}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
            <button
              onClick={cancel}
              className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 text-[12.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]"
            >
              {cancelLabel}
            </button>
            <button
              ref={okRef}
              onClick={confirm}
              className={cn(
                "h-8 rounded-[var(--radius-md)] px-4 text-[12.5px] font-medium text-white transition-colors",
                danger
                  ? "bg-[var(--color-danger)] hover:brightness-110"
                  : "bg-[var(--color-accent)] hover:brightness-110",
              )}
            >
              {okLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
