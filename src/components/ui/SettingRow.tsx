/**
 * 设置行容器：左侧标签（+可选描述），右侧控件靠右对齐
 * 统一所有设置项的横向布局
 */
export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${description ? "items-start" : "items-center"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[var(--color-text)]">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-subtle)]">
            {description}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
