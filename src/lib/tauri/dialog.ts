/**
 * Tauri 对话框封装
 */
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";

/** 打开文件夹对话框 */
export async function pickFolder(): Promise<string | null> {
  const home = await homeDir();
  const selected = await openDialog({
    multiple: false,
    directory: true,
    defaultPath: home,
  });
  if (!selected || typeof selected !== "string") return null;
  return selected;
}

/** 打开文件对话框 */
export async function pickFile(
  filters: { name: string; extensions: string[] }[] = [
    { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
  ],
): Promise<string | null> {
  const home = await homeDir();
  const selected = await openDialog({
    multiple: false,
    directory: false,
    defaultPath: home,
    filters,
  });
  if (!selected || typeof selected !== "string") return null;
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
