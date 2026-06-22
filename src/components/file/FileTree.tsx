/**
 * 文件树组件
 * - 递归渲染 FileNode
 * - 目录可展开/折叠
 * - 点击文件 → 打开
 * - Markdown 文件用 .md 标识
 * - 右键菜单"重命名"为 inline 编辑（文件名就地变输入框，自动选中文本）
 */
import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen } from "lucide-react";
import { useFileStore, type FileNode } from "@/stores/fileStore";
import { useEditorStore } from "@/stores/editorStore";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join, dirname } from "@tauri-apps/api/path";
import { cn } from "@/lib/utils/cn";
import { MdFileIcon } from "@/components/file/MdFileIcon";
import { FileService } from "@/lib/tauri/fs";
import { confirmDialog } from "@/lib/tauri/dialog";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { notify } from "@/stores/notificationStore";

interface MenuState {
  path: string;
  name: string;
  x: number;
  y: number;
}

export function FileTree() {
  const activeFolder = useFileStore((s) =>
    s.folders.find((f) => f.path === s.activeFolderPath) ?? null,
  );
  const [menu, setMenu] = useState<MenuState | null>(null);
  // inline 重命名：记录当前正在编辑的文件路径，为 null 时无编辑态
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  if (!activeFolder) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-subtle)]">
        <Trans>未打开文件夹</Trans>
      </div>
    );
  }

  return (
    <>
      <div className="h-full w-full overflow-auto py-1 text-sm">
        {activeFolder.fileTree.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            onContextMenu={setMenu}
            renamingPath={renamingPath}
            onRenameDone={() => setRenamingPath(null)}
          />
        ))}
      </div>
      {menu && (
        <FileContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onRenameStart={(path) => {
            setRenamingPath(path);
            setMenu(null);
          }}
        />
      )}
    </>
  );
}

function FileTreeItem({
  node,
  depth,
  onContextMenu,
  renamingPath,
  onRenameDone,
}: {
  node: FileNode;
  depth: number;
  onContextMenu: (m: MenuState) => void;
  renamingPath: string | null;
  onRenameDone: () => void;
}) {
  const expanded = useFileStore(
    (s) => s.folders.find((f) => f.path === s.activeFolderPath)?.expanded ?? [],
  );
  const toggleExpand = useFileStore((s) => s.toggleExpand);
  const setSelected = useFileStore((s) => s.setSelected);
  const selected = useFileStore(
    (s) => s.folders.find((f) => f.path === s.activeFolderPath)?.selectedPath ?? null,
  );
  const openFile = useEditorStore((s) => s.openFile);
  const refreshActiveTree = useFileStore((s) => s.refreshActiveTree);

  const isOpen = expanded.includes(node.path);
  const isSelected = selected === node.path;
  const isMd = /\.(md|markdown|mdx)$/i.test(node.name);
  const isRenaming = renamingPath === node.path;

  const handleClick = async () => {
    // 编辑态下不响应点击（避免触发打开/折叠）
    if (isRenaming) return;
    if (node.isDir) {
      setSelected(node.path);
      toggleExpand(node.path);
      return;
    }
    // 非 Markdown 文件不打开：readTextFile 读取二进制/大文件会返回超大乱码字符串，
    // 塞给 CodeMirror 渲染会卡死主线程
    if (!isMd) return;
    setSelected(node.path);
    try {
      const content = await readTextFile(node.path);
      const title = node.name.replace(/\.(md|markdown|mdx)$/i, "");
      openFile(node.path, title, content);
    } catch (e) {
      console.error("[FileTree] open file failed:", e);
    }
  };

  // inline 重命名提交：先退出编辑态（立即关闭输入框），后台执行 rename + 刷新树
  const handleRenameCommit = async (newName: string) => {
    onRenameDone();
    try {
      const dir = await dirname(node.path);
      const newPath = await join(dir, newName);
      await FileService.renameFile(node.path, newPath);
      await refreshActiveTree();
    } catch (e) {
      console.error("[FileTree] rename failed:", e);
    }
  };

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          if (node.isDir || !isMd) return; // 仅 md 文件提供右键菜单
          e.preventDefault();
          onContextMenu({ path: node.path, name: node.name, x: e.clientX, y: e.clientY });
        }}
        className={cn(
          "relative flex h-7 my-0.5 cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 text-[var(--color-text)] transition-colors",
          "hover:bg-[var(--color-bg-muted)]",
          isSelected && ["item-active", "text-[var(--color-accent)] font-medium"],
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        title={node.path}
      >
        {node.isDir ? (
          <>
            {isOpen ? (
              <ChevronDown size={12} className="shrink-0 text-[var(--color-text-subtle)]" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-[var(--color-text-subtle)]" />
            )}
            {isOpen ? (
              <FolderOpen size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            ) : (
              <Folder size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {isMd ? (
              <MdFileIcon size={14} className="shrink-0 text-[var(--color-accent)]" />
            ) : (
              <FileIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
            )}
          </>
        )}
        {isRenaming ? (
          <RenameInput
            initialName={node.name}
            onCommit={handleRenameCommit}
            onCancel={onRenameDone}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
      {node.isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onRenameDone={onRenameDone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * inline 重命名输入框
 * 挂载即聚焦，并选中文件名主体（不含扩展名），与 VS Code 行为一致
 * Enter/失焦 → 提交；Esc → 取消
 */
function RenameInput({
  initialName,
  onCommit,
  onCancel,
}: {
  initialName: string;
  onCommit: (newName: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // 选中文件名主体（不含 .md 后缀）
    const dot = initialName.lastIndexOf(".");
    input.setSelectionRange(0, dot > 0 ? dot : initialName.length);
  }, [initialName]);

  const commit = () => {
    const v = value.trim();
    // 空名 / 未改 / 含路径非法字符 → 取消（不重命名）
    if (!v || v === initialName || /[\\/:*?"<>|]/.test(v)) {
      onCancel();
      return;
    }
    onCommit(v);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="min-w-0 flex-1 rounded-sm border border-[var(--color-accent)] bg-[var(--color-bg)] px-1 py-0.5 text-sm text-[var(--color-text)] outline-none"
    />
  );
}

/** md 文件右键菜单：在资源管理器中打开 / 重命名（inline）/ 删除 */
function FileContextMenu({
  menu,
  onClose,
  onRenameStart,
}: {
  menu: MenuState;
  onClose: () => void;
  onRenameStart: (path: string) => void;
}) {
  const { i18n } = useLingui();
  const refreshActiveTree = useFileStore((s) => s.refreshActiveTree);

  const handleReveal = async () => {
    try {
      await FileService.revealFile(menu.path);
    } catch (e) {
      console.error("[FileTree] reveal failed:", e);
    }
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirmDialog(
      i18n.t("确定删除「{name}」？此操作不可撤销。", { name: menu.name }),
      i18n.t("删除文件"),
      i18n.t("删除"),
      i18n.t("取消"),
      true,
    );
    if (!ok) {
      onClose();
      return;
    }
    try {
      await FileService.removeFile(menu.path);
      // 若该文件正在编辑器中打开，一并移除
      useEditorStore.getState().closeFile(menu.path);
      await refreshActiveTree();
      notify.success(i18n.t("已删除"));
    } catch (e) {
      console.error("[FileTree] delete failed:", e);
      notify.error(i18n.t("删除失败"));
    }
    onClose();
  };

  // 重命名：关闭菜单，让对应文件项进入 inline 编辑态
  const handleRename = () => {
    onRenameStart(menu.path);
  };

  const itemCls =
    "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]";

  return (
    <>
      {/* 遮罩：点击/右键外部关闭 */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[150px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 shadow-[var(--shadow-lg)]"
        style={{ left: menu.x, top: menu.y }}
      >
        <button onClick={handleReveal} className={itemCls}>
          <Trans>在资源管理器中打开</Trans>
        </button>
        <button onClick={handleRename} className={itemCls}>
          <Trans>重命名</Trans>
        </button>
        <div className="my-1 h-px bg-[var(--color-border)]" />
        <button onClick={handleDelete} className={cn(itemCls, "text-[var(--color-danger)]")}>
          <Trans>删除</Trans>
        </button>
      </div>
    </>
  );
}
