/**
 * 应用级操作（打开文件 / 保存）的复用逻辑
 * 供全局快捷键 handler 和 UI 按钮（TopBar）共用，避免逻辑重复
 */
import { editorViewRef, useEditorStore } from "@/stores/editorStore";
import { useFileStore } from "@/stores/fileStore";
import { FileService } from "@/lib/tauri/fs";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { confirmDialog } from "@/lib/tauri/dialog";
import { notify } from "@/stores/notificationStore";

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
    notify.error("保存失败");
  }
}

/**
 * 刷新所有已打开的文件 + 文件树
 * @param silent 静默模式：不弹确认框、不显示通知（自动刷新用）
 * @returns 是否有文件内容变化
 */
export async function reloadCurrentFile(silent = false): Promise<boolean> {
  const editor = useEditorStore.getState();
  const { openFiles, activeFilePath, updateContent, markSaved } = editor;
  try {
    // 1. 刷新所有文件夹的文件树
    await useFileStore.getState().refreshAllTrees();

    // 2. 收集需要刷新的文件（排除无改动的文件以减少 IO）
    const filesToRefresh = openFiles.filter((f) => f.isDirty || f.content !== f.savedContent);

    // 3. 如果有未保存改动的文件，弹确认（非静默模式）
    if (!silent && filesToRefresh.some((f) => f.isDirty)) {
      const names = filesToRefresh
        .filter((f) => f.isDirty)
        .map((f) => f.title)
        .join("、");
      const ok = await confirmDialog(
        `以下文件有未保存的改动：${names}\n刷新将用磁盘内容覆盖本地改动，是否继续？`,
        "刷新确认",
      );
      if (!ok) return false;
    }

    // 4. 刷新所有已打开的文件
    let hasChanges = false;
    for (const file of openFiles) {
      try {
        const content = await readTextFile(file.path);
        if (content !== file.content) {
          updateContent(file.path, content);
          markSaved(file.path);
          hasChanges = true;

          // 如果是当前激活的文件，需要更新编辑器
          if (file.path === activeFilePath) {
            const view = editorViewRef.current;
            if (view) {
              view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: content },
              });
            }
          }
        }
      } catch (e) {
        console.error("[reload] failed to read file:", file.path, e);
      }
    }

    return hasChanges;
  } catch (e) {
    console.error("[reload] failed:", e);
    if (!silent) notify.error("刷新失败");
    return false;
  }
}

/** 打开/添加文件夹（addFolder 内部读树 + 设 active；已存在则仅切 active） */
export async function openFolderViaDialog() {
  const { pickFolder } = await import("@/lib/tauri/dialog");
  const folder = await pickFolder();
  if (!folder) return;
  await useFileStore.getState().addFolder(folder);
}
