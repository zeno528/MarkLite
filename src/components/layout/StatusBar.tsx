/**
 * 底部状态栏
 * - 光标位置（行:列）
 * - 字数（中英混合）
 * - 文件状态（已保存/未保存，圆点 + 文字）
 * - 文件类型
 * - 自动保存/自动刷新状态标识
 */
import { useDeferredValue, useMemo } from "react";
import { RefreshCw, Save, RotateCw, Pin } from "lucide-react";
import { MdFileIcon } from "@/components/file/MdFileIcon";
import { useEditorStore } from "@/stores/editorStore";
import { useFileStore, type FileNode } from "@/stores/fileStore";
import { useRefreshStore } from "@/stores/refreshStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";
import { reloadCurrentFile } from "@/lib/shortcuts/appShortcuts";
import { notify } from "@/stores/notificationStore";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

/** 递归统计文件夹下的 md 文件数量 */
function countMdFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.isDir) {
      if (node.children) count += countMdFiles(node.children);
    } else {
      count++;
    }
  }
  return count;
}

export function StatusBar() {
  const { i18n } = useLingui();
  const cursor = useEditorStore((s) => s.cursor);
  const selection = useEditorStore((s) => s.selection);
  const currentFile = useEditorStore((s) => s.currentFile);
  // useDeferredValue：输入期间用旧字数渲染（不阻塞），停顿后 React 后台重统计（自适应无固定延迟）
  const deferredContent = useDeferredValue(currentFile?.content ?? "");
  const singleTabMode = useSettingsStore((s) => s.singleTabMode);
  const wc = useMemo(() => {
    if (!deferredContent) return { chars: 0, words: 0, lines: 0 };
    const text = deferredContent;
    const lines = text.split("\n").length;
    const chars = text.length;
    const cnChars = (text.match(/[一-龥]/g) || []).length;
    const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return { chars, words: cnChars + enWords, lines };
  }, [deferredContent]);
  const reloading = useRefreshStore((s) => s.reloading);
  const setReloading = useRefreshStore((s) => s.setReloading);
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const folders = useFileStore((s) => s.folders);
  const activeFolderPath = useFileStore((s) => s.activeFolderPath);

  // 统计【当前激活文件夹】下的 md 文件数量（而非所有文件夹总和）
  const activeFolder = folders.find((f) => f.path === activeFolderPath);
  const fileCount = activeFolder ? countMdFiles(activeFolder.fileTree) : 0;

  const handleReload = async () => {
    if (reloading) return; // 旋转中防重复点击
    setReloading(true);
    const minSpin = new Promise<void>((r) => setTimeout(r, 400));
    try {
      const hasChanges = await Promise.all([reloadCurrentFile(false), minSpin]);
      if (hasChanges[0]) {
        notify.info(i18n.t("已刷新"));
      }
    } finally {
      setReloading(false);
    }
  };

  // 字数 wc 由上方 useMemo(deferredContent) 计算，输入自适应 defer，无需 useEffect

  return (
    <div
      className="flex h-[var(--statusbar-height)] w-full shrink-0 select-none items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] pr-3 text-xs text-[var(--color-text-muted)]"
    >
      <div className="flex h-full items-stretch gap-2">
        {/* 模块1：刷新按钮 */}
        <Tooltip
          content={<Trans>刷新 <span>(Ctrl+R)</span> — 从磁盘重新读取当前文件</Trans>}
          placement="top"
          align="left"
          className="!flex h-full"
        >
          <button
            className="flex h-full w-12 items-center justify-center border-0 bg-transparent text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
            onClick={handleReload}
            disabled={!currentFile}
            aria-label={i18n.t("刷新当前文件")}
          >
            <RefreshCw size={13} className={cn(reloading && "animate-spin")} />
          </button>
        </Tooltip>

        {/* 模块2：文档统计 */}
        <div className="-ml-1 flex items-center gap-2">
          {fileCount > 0 && (
            <>
              <span className="inline-flex items-center gap-1">
                <MdFileIcon size={11} />
                <span>{i18n.t("{count} 个文件", { count: fileCount })}</span>
              </span>
              <span className="text-[var(--color-text-subtle)]">·</span>
            </>
          )}
          <span>{i18n.t("{count} 字", { count: wc.words })}</span>
          <span className="text-[var(--color-text-subtle)]">·</span>
          <span>{i18n.t("{count} 行", { count: wc.lines })}</span>
        </div>

        {/* 模块3：光标位置 + 选中信息 */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-subtle)]">|</span>
          <span>{i18n.t("行 {line}，列 {col}", { line: cursor.line, col: cursor.ch + 1 })}</span>
          {selection.chars > 0 && (
            <>
              <span className="text-[var(--color-text-subtle)]">·</span>
              <span>{i18n.t("选中 {chars} 字符 / {words} 词", { chars: selection.chars, words: selection.words })}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 单标签模式 */}
        <Tooltip
          content={singleTabMode ? <Trans>单标签模式：已开启</Trans> : <Trans>单标签模式：已关闭</Trans>}
          placement="top"
        >
          <button
            onClick={() => useSettingsStore.getState().update("singleTabMode", !singleTabMode)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] transition-colors",
              singleTabMode
                ? "bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <Pin size={10} />
            <span><Trans>单标签</Trans></span>
          </button>
        </Tooltip>

        {/* 自动保存标识 — 点击关闭 */}
        {autoSave && (
          <Tooltip content={<Trans>自动保存已开启</Trans>} placement="top">
            <button
              onClick={() => useSettingsStore.getState().update("autoSave", false)}
              aria-label={i18n.t("关闭自动保存")}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-accent)_22%,transparent)]"
            >
              <Save size={10} />
              <span><Trans>自动</Trans></span>
            </button>
          </Tooltip>
        )}

        {/* 自动刷新标识 — 点击关闭 */}
        {autoRefresh && (
          <Tooltip content={<Trans>自动刷新已开启</Trans>} placement="top">
            <button
              onClick={() => useSettingsStore.getState().update("autoRefresh", false)}
              aria-label={i18n.t("关闭自动刷新")}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-accent)_22%,transparent)]"
            >
              <RotateCw size={10} />
              <span><Trans>同步</Trans></span>
            </button>
          </Tooltip>
        )}

        {currentFile && (
          <>
            {/* 保存状态：胶囊样式 */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                currentFile.isDirty
                  ? "bg-[color-mix(in_oklch,var(--color-warning)_15%,transparent)] text-[var(--color-warning)]"
                  : "bg-[color-mix(in_oklch,var(--color-success)_15%,transparent)] text-[var(--color-success)]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentFile.isDirty ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]",
                )}
              />
              {currentFile.isDirty ? <Trans>未保存</Trans> : <Trans>已保存</Trans>}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
