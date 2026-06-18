import { useSettingsStore } from "@/stores/settingsStore";
import { SettingRow } from "@/components/ui/SettingRow";
import { Toggle } from "@/components/ui/Toggle";
import { NumberField } from "@/components/ui/NumberField";

/** 编辑器：行号 / 自动换行 / Tab 缩进 / 自动保存(+延迟) / 自动刷新(+间隔) / 滚动同步 */
export function EditorSection() {
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <SettingRow label="显示行号">
        <Toggle checked={lineNumbers} onChange={(v) => update("lineNumbers", v)} aria-label="显示行号" />
      </SettingRow>
      <SettingRow label="自动换行">
        <Toggle checked={wordWrap} onChange={(v) => update("wordWrap", v)} aria-label="自动换行" />
      </SettingRow>
      <SettingRow label="Tab 缩进宽度" description="按 Tab 键插入的空格数">
        <NumberField
          value={tabSize}
          onChange={(v) => update("tabSize", v)}
          min={2}
          max={8}
          step={2}
          aria-label="Tab 缩进宽度"
        />
      </SettingRow>
      <SettingRow label="自动保存" description="编辑后自动保存到磁盘，防止意外丢失">
        <Toggle checked={autoSave} onChange={(v) => update("autoSave", v)} aria-label="自动保存" />
      </SettingRow>
      {autoSave && (
        <SettingRow label="保存延迟" description="停止输入后等待此时间再保存">
          <NumberField
            value={autoSaveDelay}
            onChange={(v) => update("autoSaveDelay", v)}
            min={500}
            max={10000}
            step={500}
            unit="ms"
            aria-label="自动保存延迟"
          />
        </SettingRow>
      )}
      <div className="my-4 h-px bg-[var(--color-border)]" />
      <SettingRow label="自动刷新" description="自动从磁盘同步文件变更">
        <Toggle checked={autoRefresh} onChange={(v) => update("autoRefresh", v)} aria-label="自动刷新" />
      </SettingRow>
      {autoRefresh && (
        <SettingRow label="刷新间隔">
          <NumberField
            value={autoRefreshInterval}
            onChange={(v) => update("autoRefreshInterval", v)}
            min={5}
            max={300}
            step={5}
            unit="秒"
            aria-label="自动刷新间隔"
          />
        </SettingRow>
      )}
      <div className="my-4 h-px bg-[var(--color-border)]" />
      <SettingRow label="滚动同步" description="编辑器与预览的双向滚动联动">
        <Toggle checked={scrollSync} onChange={(v) => update("scrollSync", v)} aria-label="滚动同步" />
      </SettingRow>
    </div>
  );
}
