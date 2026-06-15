/**
 * 自动保存扩展
 * 编辑停止 N ms 后触发 getOnSave（每次调用读最新回调，保证单一 debounce 实例防抖正确）
 */
import { EditorView } from "@codemirror/view";
import { debounce } from "@/lib/utils/debounce";

export function createAutoSave(getOnSave: () => void, delay: number) {
  const debounced = debounce(getOnSave, delay);
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      debounced();
    }
  });
}
