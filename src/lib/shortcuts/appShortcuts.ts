/**
 * 应用级操作（打开文件 / 保存）的复用逻辑
 * 供全局快捷键 handler 和 UI 按钮（TopBar）共用，避免逻辑重复
 */
import { useEditorStore } from "@/stores/editorStore";
import { useFileStore } from "@/stores/fileStore";
import { FileService } from "@/lib/tauri/fs";

/** 打开文件（系统对话框选 md → 载入编辑器） */
export async function openFileViaDialog() {
  const file = await FileService.openFile();
  if (file) {
    useEditorStore.getState().openFile(file.path, file.title, file.content);
  }
}

/** 保存当前文件到磁盘 */
export async function saveCurrentFile() {
  const { currentFile, markSaved } = useEditorStore.getState();
  if (!currentFile) return;
  try {
    await FileService.saveFile(currentFile.path, currentFile.content);
    markSaved(currentFile.path);
  } catch (e) {
    console.error("[save] failed:", e);
  }
}

/** 打开/添加文件夹（addFolder 内部读树 + 设 active；已存在则仅切 active） */
export async function openFolderViaDialog() {
  const { pickFolder } = await import("@/lib/tauri/dialog");
  const folder = await pickFolder();
  if (!folder) return;
  await useFileStore.getState().addFolder(folder);
}
