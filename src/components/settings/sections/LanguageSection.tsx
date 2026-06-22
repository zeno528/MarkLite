import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Check } from "lucide-react";
import { dynamicActivate, locales, type Locale } from "@/i18n";
import { SettingRow } from "@/components/ui/SettingRow";
import { cn } from "@/lib/utils/cn";

/** 语言切换：列出 i18n.ts 注册的所有 locale，点击立即激活 */
export function LanguageSection() {
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as Locale;
  const entries = Object.entries(locales) as [Locale, string][];

  return (
    <div className="space-y-5">
      <SettingRow label={<Trans>界面语言</Trans>} description={<Trans>切换后立即生效，重启后保留</Trans>}>
        <div className="flex flex-col gap-1.5">
          {entries.map(([code, nativeName]) => {
            const active = currentLocale === code;
            return (
              <button
                key={code}
                onClick={() => dynamicActivate(code)}
                aria-label={nativeName}
                className={cn(
                  "flex w-[180px] items-center justify-between rounded-[var(--radius-md)] px-3 py-1.5 text-[13px] transition-all",
                  active
                    ? "bg-[var(--color-bg-subtle)] font-medium text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                )}
              >
                <span>{nativeName}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      </SettingRow>
    </div>
  );
}
