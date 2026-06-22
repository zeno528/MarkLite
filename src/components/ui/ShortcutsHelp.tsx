/**
 * 快捷键参考弹窗
 * 居中弹出，Esc 关闭，与 ConfirmDialog 风格一致
 */
import { useEffect } from "react";
import { X } from "lucide-react";

const GROUPS = [
  {
    title: "文件",
    items: [
      { keys: "Ctrl+N", desc: "新建文件" },
      { keys: "Ctrl+O", desc: "打开文件" },
      { keys: "Ctrl+Shift+N", desc: "打开文件夹" },
      { keys: "Ctrl+S", desc: "保存文件" },
      { keys: "Ctrl+R", desc: "刷新文件" },
    ],
  },
  {
    title: "视图",
    items: [
      { keys: "Ctrl+\\", desc: "切换侧栏" },
      { keys: "Ctrl+L", desc: "切换布局（双栏/仅编辑/仅预览）" },
      { keys: "Ctrl+F", desc: "搜索" },
      { keys: "Ctrl+,", desc: "设置" },
      { keys: "Esc", desc: "关闭弹窗" },
    ],
  },
];

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fade-in_150ms_ease]"
      onClick={onClose}
    >
      <div
        className="w-[400px] max-w-[90vw] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)] animate-[pop-in_200ms_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-[14px] font-semibold text-[var(--color-text)]">快捷键</h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="space-y-4 px-5 py-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between py-1">
                    <span className="text-[12.5px] text-[var(--color-text-muted)]">{item.desc}</span>
                    <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
