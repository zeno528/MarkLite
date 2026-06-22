import { Monitor } from "lucide-react";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useUIStore } from "@/stores/uiStore";
import { COLOR_SCHEMES, type ColorScheme, type SchemeId } from "@/lib/theme/colorSchemes";
import { cn } from "@/lib/utils/cn";

/** 方案 id → 显示名（<Trans> 才能被 lingui extract 提取） */
const SCHEME_NAME: Record<SchemeId, ReactNode> = {
  paper: <Trans>纸白</Trans>,
  violet: <Trans>薰衣草</Trans>,
  amber: <Trans>琥珀</Trans>,
  notion: <Trans>Notion</Trans>,
  github: <Trans>GitHub</Trans>,
  midnight: <Trans>子夜</Trans>,
  ember: <Trans>余烬</Trans>,
  ink: <Trans>墨黑</Trans>,
};

/** 配色方案卡片选择器：3 列网格，色点 + 名称（无描述） */
export function SchemePicker() {
  const { i18n } = useLingui();
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);

  const items: { value: ColorScheme; name: ReactNode; mode: ReactNode; dots: string[] | null }[] = [
    ...COLOR_SCHEMES.map((s) => ({
      value: s.id as ColorScheme,
      name: SCHEME_NAME[s.id],
      mode: s.mode === "light" ? i18n.t("浅") : i18n.t("深"),
      dots: [s.swatch.bg, s.swatch.surface, s.swatch.accent],
    })),
    { value: "system", name: <Trans>跟随系统</Trans>, mode: <Trans>自动</Trans>, dots: null },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((item) => {
        const active = colorScheme === item.value;
        return (
          <button
            key={item.value}
            onClick={() => setColorScheme(item.value)}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-md)] border p-2 text-left transition-colors",
              active
                ? "border-[var(--color-accent)] bg-[var(--color-bg-subtle)]"
                : "border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]",
            )}
          >
            {item.dots ? (
              <div className="flex gap-0.5">
                {item.dots.map((d, i) => (
                  <span
                    key={i}
                    className="h-3.5 w-3.5 rounded-full border border-[var(--color-border)]"
                    style={{ backgroundColor: d }}
                  />
                ))}
              </div>
            ) : (
              <Monitor size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
            <span className="text-xs font-medium text-[var(--color-text)]">{item.name}</span>
            <span className="rounded bg-[var(--color-bg-muted)] px-1 text-[10px] text-[var(--color-text-subtle)]">
              {item.mode}
            </span>
          </button>
        );
      })}
    </div>
  );
}