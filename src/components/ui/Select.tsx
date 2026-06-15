import { cn } from "@/lib/utils/cn";

/**
 * 下拉选择（原生 select 套壳，统一样式）
 * 保留下拉项的原生渲染（浏览器/系统管），只统一外壳
 */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (v: T) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
