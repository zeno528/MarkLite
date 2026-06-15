import { useSettingsStore } from "@/stores/settingsStore";
import { SettingRow } from "@/components/ui/SettingRow";
import { Toggle } from "@/components/ui/Toggle";

/** Markdown：编辑器与预览的联动 */
export function MarkdownSection() {
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <SettingRow label="滚动同步" description="编辑器与预览的双向滚动联动">
        <Toggle checked={scrollSync} onChange={(v) => update("scrollSync", v)} aria-label="滚动同步" />
      </SettingRow>
    </div>
  );
}
