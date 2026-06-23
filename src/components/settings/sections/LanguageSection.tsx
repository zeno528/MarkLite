import { useRef } from "react";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Languages } from "lucide-react";
import { dynamicActivate, locales, type Locale } from "@/i18n";
import { SettingRow } from "@/components/ui/SettingRow";
import { cn } from "@/lib/utils/cn";

/** 语言切换：分段控件（segmented control）
    - 滑动指示器：绝对定位的滑块，CSS 变量驱动位置，transform 平移
    - 性能：纯合成层动画，零 layout/paint 开销 */
export function LanguageSection() {
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as Locale;
  const entries = Object.entries(locales) as [Locale, string][];
  const activeIndex = Math.max(
    0,
    entries.findIndex(([code]) => code === currentLocale),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-5">
      <SettingRow
        label={<Trans>界面语言</Trans>}
        description={<Trans>切换后立即生效，重启后保留</Trans>}
      >
        {/* 分段控件容器：position relative 给滑块定位用 */}
        <div
          ref={containerRef}
          role="tablist"
          aria-label="Interface language"
          className="relative inline-flex rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] p-0.5 ring-1 ring-[var(--color-border)]"
          style={
            {
              // 滑块位置由 CSS 变量驱动，React 只在切换时 setProperty
              ["--seg-active-index" as string]: activeIndex,
              ["--seg-count" as string]: entries.length,
            } as React.CSSProperties
          }
        >
          {/* 滑动指示器：transform 平移，纯合成层动画 */}
          <div
            aria-hidden
            className="seg-indicator absolute inset-y-0.5 left-0.5 rounded-[calc(var(--radius-md)-2px)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)]"
            style={{
              width: `calc((100% - 0.25rem) / var(--seg-count))`,
              transform: `translateX(calc(var(--seg-active-index) * 100%))`,
              transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          />
          {entries.map(([code, nativeName]) => {
            const active = currentLocale === code;
            return (
              <button
                key={code}
                role="tab"
                aria-selected={active}
                onClick={() => dynamicActivate(code)}
                className={cn(
                  "relative z-10 inline-flex min-w-[90px] items-center justify-center rounded-[calc(var(--radius-md)-2px)] px-3 py-1 text-[13px]",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                  active
                    ? "font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                )}
              >
                {nativeName}
              </button>
            );
          })}
        </div>
      </SettingRow>

      {/* 当前语言状态卡 */}
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Languages size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-[var(--color-text)]">
            {locales[currentLocale]}
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
            <Trans>当前生效语言</Trans>
            <span className="mx-1.5 opacity-50">·</span>
            <code className="font-mono text-[11px]">{currentLocale}</code>
          </div>
        </div>
      </div>
    </div>
  );
}