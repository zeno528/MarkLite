/**
 * Tauri 对话框封装
 * - 文件/文件夹选择：仍用系统对话框（Tauri 原生，体验好）
 * - 确认对话框：用自定义 UI（替代 Windows 原生丑对话框）
 */
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { homeDir, dirname } from "@tauri-apps/api/path";
import { customConfirm, type ConfirmResult } from "@/stores/confirmStore";

const LAST_DIR_KEY = "marklite:lastdir";

/** 对话框默认路径：优先用上次记忆的目录，否则家目录 */
export async function getDefaultPath(): Promise<string> {
  try {
    const last = localStorage.getItem(LAST_DIR_KEY);
    if (last) return last;
  } catch {}
  return await homeDir();
}

/** 记住本次选择的路径：文件夹记自身，文件记其父目录 */
export async function rememberPath(fullPath: string, isDir: boolean): Promise<void> {
  try {
    const dir = isDir ? fullPath : await dirname(fullPath);
    localStorage.setItem(LAST_DIR_KEY, dir);
  } catch {}
}

/** 打开文件夹对话框 */
export async function pickFolder(): Promise<string | null> {
  const defaultPath = await getDefaultPath();
  const selected = await openDialog({
    multiple: false,
    directory: true,
    defaultPath,
  });
  if (!selected || typeof selected !== "string") return null;
  await rememberPath(selected, true);
  return selected;
}

/** 确认对话框（自定义 UI，非系统原生） */
export async function confirmDialog(
  message: string,
  title = "MarkLite",
  okLabel = "确定",
  cancelLabel = "取消",
  danger = false,
): Promise<ConfirmResult> {
  return customConfirm(message, title, okLabel, cancelLabel, danger);
}
