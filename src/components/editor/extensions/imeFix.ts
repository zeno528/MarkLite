/**
 * CodeMirror 6 搜狗/第三方输入法兼容修复
 *
 * 问题：搜狗输入法在 contenteditable 中的 composition 事件时序与微软拼音不同，
 *       compositionend 触发时 DOM 变更可能还没被 CodeMirror 的 MutationObserver 观察到，
 *       导致第一次输入被吞（需要打两遍才显示）。
 *
 * 修复：监听 compositionend 后，短延迟强制 flush DOMObserver，
 *       确保 MutationObserver 已捕获浏览器延迟派发的 DOM 变更。
 *
 * 参考：https://discuss.codemirror.net/t/9741
 */
import { EditorView } from "@codemirror/view";

export const imeFix = EditorView.domEventHandlers({
  compositionend() {
    // compositionend 后 DOM 变更可能在下一个事件循环才到达 MutationObserver
    // 延迟 20ms 确保浏览器已派发所有 DOM 变更，然后强制 flush
    setTimeout(() => {
      try {
        // @ts-expect-error flush() 是 DOMObserver 内部方法，未导出类型
        const observer = (this as EditorView).observer;
        if (observer?.flush) observer.flush();
      } catch {
        // 静默：flush 失败不影响正常使用
      }
    }, 20);
  },
});
