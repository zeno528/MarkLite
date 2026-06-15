import { Monitor } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { COLOR_SCHEMES, type ColorScheme } from "@/lib/theme/colorSchemes";
import { cn } from "@/lib/utils/cn";

/** 配色方案卡片选择器：3 个方案 + 跟随系统 */
export function SchemePicker() {
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);

  const cards: {
    key: string;
    value: ColorScheme;
    name: string;
    desc: string;
    mode: string;
    dots: string[] | null;
  }[] = [
    ...COLOR_SCHEMES.map((s) => ({
      key: s.id,
      value: s.id as ColorScheme,
      name: s.name,
      desc: s.desc,
      mode: s.mode === "light" ? "浅" : "深",
      dots: [s.swatch.bg, s.swatch.surface, s.swatch.accent],
    })),
    {
      key: "system",
      value: "system",
      name: "跟随系统",
      desc: "自动跟随系统明暗",
      mode: "自动",
      dots: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c) => {
        const active = colorScheme === c.value;
        return (
          <button
            key={c.key}
            onClick={() => setColorScheme(c.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-lg)] border p-2.5 text-left transition-colors",
              active
                ? "border-[var(--color-accent)] bg-[var(--color-bg-subtle)]"
                : "border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]",
            )}
          >
            {/* 色板 / 图标 */}
            {c.dots ? (
              <div className="flex gap-0.5">
                {c.dots.map((d, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-[var(--color-border)]"
                    style={{ backgroundColor: d }}
                  />
                ))}
              </div>
            ) : (
              <Monitor size={18} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
            {/* 名称 + 描述 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-text)]">{c.name}</span>
                <span className="rounded bg-[var(--color-bg-muted)] px-1 text-[10px] text-[var(--color-text-subtle)]">
                  {c.mode}
                </span>
              </div>
              <div className="truncate text-[11px] text-[var(--color-text-subtle)]">{c.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
