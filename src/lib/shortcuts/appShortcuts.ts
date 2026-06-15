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

/** 打开文件夹（设为根目录 + 读文件树） */
export async function openFolderViaDialog() {
  const { pickFolder } = await import("@/lib/tauri/dialog");
  const folder = await pickFolder();
  if (!folder) return;
  const { setRootFolder, setFileTree } = useFileStore.getState();
  setRootFolder(folder);
  try {
    const tree = await FileService.readFolderTree(folder);
    setFileTree(tree);
  } catch (e) {
    console.error("[openFolder] read folder failed:", e);
  }
}
