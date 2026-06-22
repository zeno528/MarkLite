import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * 数字输入（带单位、min/max/step）
 * - 箭头（原生 spinner）按 step 步进、合法手输：即时提交
 * - 手输过程中的临时值（如 min=500 时输入「7」）不实时 clamp，避免打断输入；失焦时才 clamp 到合法范围
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
  unit?: ReactNode;
  width?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // 外部 value 变化时同步显示；聚焦输入中不打断用户正在打的字
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const clamp = (n: number): number => {
    if (!Number.isFinite(n)) return value;
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };

  const inRange = (n: number): boolean =>
    Number.isFinite(n) && (min == null || n >= min) && (max == null || n <= max);

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = Number(raw);
          // 合法且在范围内才即时提交（箭头步进、合法手输立即生效）；
          // 超出范围的中间态（如 min=500 时输入「7」）只更新显示，等失焦再 clamp
          if (inRange(n)) onChange(n);
        }}
        onBlur={(e) => {
          focused.current = false;
          const n = Number(e.target.value);
          const safe = Number.isFinite(n) ? clamp(n) : value;
          onChange(safe);
          setText(String(safe));
        }}
        className={cn(
          "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none",
          width,
        )}
      />
      {unit && <span className="text-xs text-[var(--color-text-subtle)]">{unit}</span>}
    </div>
  );
}
