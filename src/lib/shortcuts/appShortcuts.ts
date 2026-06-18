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
 * 刷新当前文件：从磁盘重新读取最新内容并同步到编辑器/预览/文件树
 * - 内容无变化：仅刷新文件树（静默，不打扰）
 * - 内容有变化且本地有未保存改动：弹确认，避免误覆盖本地编辑
 */
export async function reloadCurrentFile() {
  const { currentFile, updateContent, markSaved } = useEditorStore.getState();
  if (!currentFile) return;
  try {
    const content = await readTextFile(currentFile.path);
    // 内容无变化：静默刷新文件树后返回（外部可能新建/删除了别的文件）
    if (content === currentFile.content) {
      await useFileStore.getState().refreshActiveTree();
      return;
    }
    // 内容有变化且本地有未保存改动 → 弹确认，避免误覆盖本地编辑
    if (currentFile.isDirty) {
      const ok = await confirmDialog(
        "该文件已被外部修改，且本地有未保存的改动。\n刷新将用磁盘内容覆盖本地改动，是否继续？",
        "刷新确认",
      );
      if (!ok) return;
    }
    // 同步 store（预览/字数随之更新）+ 对齐 savedContent、清 dirty（刷新 = 与磁盘对齐）
    updateContent(currentFile.path, content);
    markSaved(currentFile.path);
    // 非受控编辑器：直接 dispatch 替换文档，绕过 key={path} 回灌限制（不动重建机制，无吞字符回归）
    const view = editorViewRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
    // 同步文件树（外部新建/删除/重命名）
    await useFileStore.getState().refreshActiveTree();
    notify.info("已刷新");
  } catch (e) {
    console.error("[reload] failed:", e);
    notify.error("刷新失败");
  }
}

/** 打开/添加文件夹（addFolder 内部读树 + 设 active；已存在则仅切 active） */
export async function openFolderViaDialog() {
  const { pickFolder } = await import("@/lib/tauri/dialog");
  const folder = await pickFolder();
  if (!folder) return;
  await useFileStore.getState().addFolder(folder);
}
