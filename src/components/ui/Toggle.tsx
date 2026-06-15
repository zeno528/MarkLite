import { cn } from "@/lib/utils/cn";

/**
 * iOS 风格开关，替代原生 checkbox
 * accent 轨道 + 白色圆点，跟随 data-scheme 自动换色
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
        checked
          ? "bg-[var(--color-accent)]"
          : "border border-[var(--color-border)] bg-[var(--color-bg-muted)]",
        disabled && "opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
