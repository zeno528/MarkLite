/**
 * Tauri 对话框封装
 * - 记住上次打开/保存的目录（localStorage），下次对话框默认指向那里
 */
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { homeDir, dirname } from "@tauri-apps/api/path";

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

/** 确认对话框 */
export async function confirmDialog(
  message: string,
  title = "MarkLite",
  okLabel = "确定",
  cancelLabel = "取消",
): Promise<boolean> {
  const { ask } = await import("@tauri-apps/plugin-dialog");
  return await ask(message, { title, okLabel, cancelLabel });
}
