import { cn } from "@/lib/utils/cn";

/**
 * 数字输入（带单位、min/max/step、clamp 守卫，避免 NaN/越界写回）
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  width = "w-20",
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  width?: string;
  "aria-label"?: string;
}) {
  const clamp = (n: number): number => {
    if (!Number.isFinite(n)) return value;
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className={cn(
          "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none",
          width,
        )}
      />
      {unit && <span className="text-xs text-[var(--color-text-subtle)]">{unit}</span>}
    </div>
  );
}
