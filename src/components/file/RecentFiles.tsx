/**
 * 最近使用文件面板
 *
 * 显示在资源管理器 tab 顶部，分两个区域：
 * - 固定区：pin 的文件，不受清空影响
 * - 最近区：按打开时间排序，可 pin/remove/一键清空
 *
 * 点击文件 = 打开（readTextFile → editorStore.openFile）
 */
import { useState } from "react";
import { Pin, PinOff, Trash2, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { useRecentStore } from "@/stores/recentStore";
import { useEditorStore } from "@/stores/editorStore";
import { useFileStore } from "@/stores/fileStore";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { FileService } from "@/lib/tauri/fs";
import { notify } from "@/stores/notificationStore";
import { cn } from "@/lib/utils/cn";

/** 取路径的文件名（不含扩展名） */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop()?.replace(/\.(md|markdown|mdx)$/i, "") ?? path;
}

/** 取路径的所在目录（用于 tooltip） */
function dirPath(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx > 0 ? path.substring(0, idx) : "";
}

/** 打开文件 */
async function openRecent(path: string) {
  try {
    const ok = await FileService.fileExists(path);
    if (!ok) {
      notify.error("文件不存在：" + fileName(path));
      useRecentStore.getState().removeRecent(path);
      return;
    }
    const content = await readTextFile(path);
    const title = fileName(path);
    useEditorStore.getState().openFile(path, title, content);

    // 如果文件所在目录已打开在文件树中，同步选中
    const dir = dirPath(path);
    if (dir) {
      const { folders } = useFileStore.getState();
      const matchingFolder = folders.find((f) =>
        path.toLowerCase().startsWith(f.path.toLowerCase()) ||
        path.toLowerCase().startsWith(f.path.replace(/\//g, "\\").toLowerCase()),
      );
      if (matchingFolder) {
        useFileStore.getState().setSelected(path);
      }
    }
  } catch (e) {
    console.error("[recent] open failed:", e);
    notify.error("打开失败");
  }
}

function RecentItem({
  path,
  pinned,
  onTogglePin,
  onRemove,
}: {
  path: string;
  pinned: boolean;
  onTogglePin: () => void;
  onRemove: () => void;
}) {
  const name = fileName(path);
  const dir = dirPath(path);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-1 rounded-md px-2 py-1 text-[13px] transition-colors hover:bg-[var(--color-accent)]/8 cursor-pointer"
      onClick={() => openRecent(path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={path}
    >
      <span className="shrink-0 text-[var(--color-text-muted)]">
        {pinned ? <Pin size={13} className="fill-current text-[var(--color-accent)]" /> : <FileText size={13} />}
      </span>
      <span className="flex-1 truncate text-[var(--color-text)]">{name}</span>
      {pinned && <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{dir ? dir.split(/[\\/]/).pop() : ""}</span>}
      {/* 操作按钮 */}
      <div className="flex shrink-0 items-center" style={{ opacity: hovered ? 1 : 0 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          title={pinned ? "取消固定" : "固定"}
        >
          {pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        {!pinned && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            title="移除"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export function RecentFiles() {
  const files = useRecentStore((s) => s.files);
  const togglePin = useRecentStore((s) => s.togglePin);
  const removeRecent = useRecentStore((s) => s.removeRecent);
  const clearUnpinned = useRecentStore((s) => s.clearUnpinned);
  const [expanded, setExpanded] = useState(true);

  if (files.length === 0) return null;

  const pinned = files.filter((f) => f.pinned);
  const unpinned = files.filter((f) => !f.pinned);

  return (
    <div className="shrink-0 border-b border-[var(--color-border)]">
      {/* 标题栏 */}
      <div className="flex h-7 items-center justify-between px-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          最近使用
        </button>
        {unpinned.length > 0 && (
          <button
            onClick={clearUnpinned}
            className="flex items-center gap-0.5 text-[11px] text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            title="清空未固定的最近文件"
          >
            <Trash2 size={11} />
            清空
          </button>
        )}
      </div>

      {/* 列表 */}
      {expanded && (
        <div className="px-1 pb-2 overflow-y-auto" style={{ maxHeight: "240px" }}>
          {/* 固定区 */}
          {pinned.length > 0 && (
            <div className="mb-1">
              {pinned.map((f) => (
                <RecentItem
                  key={f.path}
                  path={f.path}
                  pinned={true}
                  onTogglePin={() => togglePin(f.path)}
                  onRemove={() => removeRecent(f.path)}
                />
              ))}
            </div>
          )}
          {/* 最近区 */}
          {unpinned.length > 0 && (
            <div className={cn(pinned.length > 0 && "border-t border-[var(--color-border)] pt-1")}>
              {unpinned.map((f) => (
                <RecentItem
                  key={f.path}
                  path={f.path}
                  pinned={false}
                  onTogglePin={() => togglePin(f.path)}
                  onRemove={() => removeRecent(f.path)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
