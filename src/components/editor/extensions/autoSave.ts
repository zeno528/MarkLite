/**
 * 自动保存扩展
 * 编辑停止 N ms 后触发 onSave 回调
 * 配合 editorStore 的 updateContent 实现
 */
import { EditorView } from "@codemirror/view";
import { debounce } from "@/lib/utils/debounce";

export function createAutoSave(onSave: () => void, delay: number) {
  const debounced = debounce(onSave, delay);
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      debounced();
    }
  });
}
