/**
 * 设置对话框
 * - 外观（主题、字体、字号）
 * - 编辑器（行号、自动换行、自动保存、Tab 大小）
 * - Markdown（滚动同步）
 */
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const setFontFamily = useUIStore((s) => s.setFontFamily);

  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const update = useSettingsStore((s) => s.update);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[90vw] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-base font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bg-muted)]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-auto p-4 text-sm">
          {/* 外观 */}
          <Section title="外观">
            <Row label="主题">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
              >
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
                <option value="system">跟随系统</option>
              </select>
            </Row>
            <Row label="编辑器字号">
              <input
                type="number"
                min={10}
                max={24}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
              />
              <span className="text-xs text-[var(--color-text-subtle)]">px</span>
            </Row>
            <Row label="字体">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
              >
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="SF Mono">SF Mono</option>
                <option value="Cascadia Code">Cascadia Code</option>
                <option value="Menlo">Menlo</option>
                <option value="Consolas">Consolas</option>
                <option value="monospace">系统默认</option>
              </select>
            </Row>
          </Section>

          {/* 编辑器 */}
          <Section title="编辑器">
            <Row label="显示行号">
              <input
                type="checkbox"
                checked={lineNumbers}
                onChange={(e) => update("lineNumbers", e.target.checked)}
              />
            </Row>
            <Row label="自动换行">
              <input
                type="checkbox"
                checked={wordWrap}
                onChange={(e) => update("wordWrap", e.target.checked)}
              />
            </Row>
            <Row label="自动保存">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => update("autoSave", e.target.checked)}
              />
            </Row>
            {autoSave && (
              <Row label="保存延迟">
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={autoSaveDelay}
                  onChange={(e) => update("autoSaveDelay", Number(e.target.value))}
                  className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
                />
                <span className="text-xs text-[var(--color-text-subtle)]">ms</span>
              </Row>
            )}
          </Section>

          {/* Markdown */}
          <Section title="Markdown">
            <Row label="滚动同步">
              <input
                type="checkbox"
                checked={scrollSync}
                onChange={(e) => update("scrollSync", e.target.checked)}
              />
            </Row>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text)]">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
