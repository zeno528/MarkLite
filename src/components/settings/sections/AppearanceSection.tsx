import { useUIStore } from "@/stores/uiStore";
import { SchemePicker } from "@/components/settings/SchemePicker";
import { SettingRow } from "@/components/ui/SettingRow";
import { NumberField } from "@/components/ui/NumberField";
import { Select, type SelectOption } from "@/components/ui/Select";

/** 字体候选（等宽，适合代码/markdown） */
const FONT_OPTIONS: SelectOption<string>[] = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Maple Mono", label: "Maple Mono" },
  { value: "Iosevka", label: "Iosevka" },
  { value: "Cascadia Code", label: "Cascadia Code" },
  { value: "SF Mono", label: "SF Mono" },
  { value: "Menlo", label: "Menlo" },
  { value: "Consolas", label: "Consolas" },
  { value: "monospace", label: "系统默认" },
];

/** 外观：配色方案 / 编辑器字号 / 字体 */
export function AppearanceSection() {
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const setFontFamily = useUIStore((s) => s.setFontFamily);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-[var(--color-text)]">配色方案</span>
        <SchemePicker />
      </div>
      <SettingRow label="编辑器字号" description="代码编辑器的字体大小">
        <NumberField
          value={fontSize}
          onChange={setFontSize}
          min={10}
          max={24}
          unit="px"
          aria-label="编辑器字号"
        />
      </SettingRow>
      <SettingRow label="字体">
        <Select
          value={fontFamily}
          options={FONT_OPTIONS}
          onChange={setFontFamily}
          aria-label="编辑器字体"
        />
      </SettingRow>
    </div>
  );
}
