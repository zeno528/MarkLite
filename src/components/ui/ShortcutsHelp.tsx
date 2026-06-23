/**
 * 快捷键弹窗
 * 居中弹出，Esc 关闭，与 ConfirmDialog 风格一致
 *
 * 文案用 <Trans id="msgid">...</Trans> 显式标注（macro 模式下，<Trans>{var}</Trans> 不会抽字面量），
 * 这样 Lingui extract 能识别并翻译每条文案。
 */
import { useEffect } from "react";
import { Trans } from "@lingui/react/macro";
import { X } from "lucide-react";

interface RowProps { keys: string; desc: React.ReactNode }
function Row({ keys, desc }: RowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12.5px] text-[var(--color-text-muted)]">{desc}</span>
      <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
        {keys}
      </kbd>
    </div>
  );
}

interface GroupProps { title: React.ReactNode; children: React.ReactNode }
function Group({ title, children }: GroupProps) {
  return (
    <div>
      {/* 副标题：更大、更粗、字色用主前景色，与正文（muted）明显区分 */}
      <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-text)]">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

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
          <h2 className="text-[14px] font-semibold text-[var(--color-text)]">
            <Trans>快捷键</Trans>
          </h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="space-y-4 px-5 py-4">
          <Group title={<Trans>文件</Trans>}>
            <Row keys="Ctrl+N" desc={<Trans>新建文件</Trans>} />
            <Row keys="Ctrl+O" desc={<Trans>打开文件</Trans>} />
            <Row keys="Ctrl+Shift+N" desc={<Trans>打开文件夹</Trans>} />
            <Row keys="Ctrl+S" desc={<Trans>保存文件</Trans>} />
            <Row keys="Ctrl+R" desc={<Trans>刷新文件</Trans>} />
          </Group>
          <Group title={<Trans>视图</Trans>}>
            <Row keys="Ctrl+\\" desc={<Trans>切换侧栏</Trans>} />
            <Row keys="Ctrl+L" desc={<Trans>切换布局（双栏/仅编辑/仅预览）</Trans>} />
            <Row keys="Ctrl+F" desc={<Trans>搜索</Trans>} />
            <Row keys="Ctrl+," desc={<Trans>设置</Trans>} />
            <Row keys="Esc" desc={<Trans>关闭弹窗</Trans>} />
          </Group>
        </div>
      </div>
    </div>
  );
}