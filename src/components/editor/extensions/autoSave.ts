/**
 * 自动保存扩展
 * 编辑停止 N ms 后触发 getOnSave（每次调用读最新回调，保证单一 debounce 实例防抖正确）
 * 退出确认期间通过 isAutoSaveSuspended() 挂起：防抖到期也不执行保存，避免弹框时偷偷存盘
 * 导致 isDirty 消失（用户点取消后误以为没改过）。挂起期间用户继续编辑会正常重置防抖计时。
 */
import { EditorView } from "@codemirror/view";
import { debounce } from "@/lib/utils/debounce";
import { isAutoSaveSuspended } from "@/stores/editorStore";

export function createAutoSave(getOnSave: () => void, delay: number) {
  const guarded = () => {
    if (isAutoSaveSuspended()) return;
    getOnSave();
  };
  const debounced = debounce(guarded, delay);
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      debounced();
    }
  });
}
