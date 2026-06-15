import { useSettingsStore } from "@/stores/settingsStore";
import { SettingRow } from "@/components/ui/SettingRow";
import { Toggle } from "@/components/ui/Toggle";
import { NumberField } from "@/components/ui/NumberField";

/** 编辑器：行号 / 自动换行 / Tab 缩进 / 自动保存(+延迟) */
export function EditorSection() {
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
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
      <SettingRow label="自动保存">
        <Toggle checked={autoSave} onChange={(v) => update("autoSave", v)} aria-label="自动保存" />
      </SettingRow>
      {autoSave && (
        <SettingRow label="保存延迟">
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
    </div>
  );
}
