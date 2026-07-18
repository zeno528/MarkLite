import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { useSettingsStore } from "@/stores/settingsStore";
import { SettingRow } from "@/components/ui/SettingRow";
import { Toggle } from "@/components/ui/Toggle";
import { NumberField } from "@/components/ui/NumberField";

/** 编辑器：行号 / 自动换行 / Tab 缩进 / 自动保存(+延迟) / 自动刷新(+间隔) / 滚动同步 */
export function EditorSection() {
  const { i18n } = useLingui();
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const singleTabMode = useSettingsStore((s) => s.singleTabMode);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <SettingRow label={<Trans>显示行号</Trans>}>
        <Toggle checked={lineNumbers} onChange={(v) => update("lineNumbers", v)} aria-label={i18n.t(`显示行号`)} />
      </SettingRow>
      <SettingRow label={<Trans>自动换行</Trans>}>
        <Toggle checked={wordWrap} onChange={(v) => update("wordWrap", v)} aria-label={i18n.t(`自动换行`)} />
      </SettingRow>
      <SettingRow label={<Trans>Tab 缩进宽度</Trans>} description={<Trans>按 Tab 键插入的空格数</Trans>}>
        <NumberField
          value={tabSize}
          onChange={(v) => update("tabSize", v)}
          min={2}
          max={8}
          step={2}
          aria-label={i18n.t(`Tab 缩进宽度`)}
        />
      </SettingRow>
      <SettingRow label={<Trans>自动保存</Trans>} description={<Trans>编辑后自动保存到磁盘，防止意外丢失</Trans>}>
        <Toggle checked={autoSave} onChange={(v) => update("autoSave", v)} aria-label={i18n.t(`自动保存`)} />
      </SettingRow>
      {autoSave && (
        <SettingRow label={<Trans>保存延迟</Trans>} description={<Trans>停止输入后等待此时间再保存</Trans>}>
          <NumberField
            value={autoSaveDelay}
            onChange={(v) => update("autoSaveDelay", v)}
            min={500}
            max={10000}
            step={500}
            unit="ms"
            aria-label={i18n.t(`自动保存延迟`)}
          />
        </SettingRow>
      )}
      <div className="my-4 h-px bg-[var(--color-border)]" />
      <SettingRow label={<Trans>自动刷新</Trans>} description={<Trans>自动从磁盘同步文件变更</Trans>}>
        <Toggle checked={autoRefresh} onChange={(v) => update("autoRefresh", v)} aria-label={i18n.t(`自动刷新`)} />
      </SettingRow>
      {autoRefresh && (
        <SettingRow label={<Trans>刷新间隔</Trans>}>
          <NumberField
            value={autoRefreshInterval}
            onChange={(v) => update("autoRefreshInterval", v)}
            min={1}
            max={300}
            step={1}
            unit={<Trans>秒</Trans>}
            aria-label={i18n.t(`自动刷新间隔`)}
          />
        </SettingRow>
      )}
      <div className="my-4 h-px bg-[var(--color-border)]" />
      <SettingRow label={<Trans>滚动同步</Trans>} description={<Trans>编辑器与预览的双向滚动联动</Trans>}>
        <Toggle checked={scrollSync} onChange={(v) => update("scrollSync", v)} aria-label={i18n.t(`滚动同步`)} />
      </SettingRow>
      <SettingRow label={<Trans>单标签模式</Trans>} description={<Trans>打开新文件时替换当前标签而非追加新标签</Trans>}>
        <Toggle checked={singleTabMode} onChange={(v) => update("singleTabMode", v)} aria-label={i18n.t(`单标签模式`)} />
      </SettingRow>
    </div>
  );
}
