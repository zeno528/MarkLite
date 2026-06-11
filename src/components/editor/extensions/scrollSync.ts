/**
 * 编辑器 → 预览的滚动同步
 * 通过 EditorView.dom 上监听 scroll 事件
 * 用 throttle 节流（macOS 16ms，Windows 32ms）
 */
import { EditorView } from "@codemirror/view";
import { throttle } from "@/lib/utils/throttle";

export interface ScrollSyncOptions {
  /** 滚动回调，参数 0-1 表示滚动百分比 */
  onScroll: (percent: number) => void;
  /** throttle 延迟（ms） */
  delay: number;
}

export function createScrollSync({ onScroll, delay }: ScrollSyncOptions) {
  /** 绑定到 view 的 scrollDOM */
  function attach(view: EditorView) {
    const dom = view.scrollDOM;
    const onScrollHandler = throttle(() => {
      const top = dom.scrollTop;
      const height = dom.scrollHeight - dom.clientHeight;
      const percent = height > 0 ? top / height : 0;
      onScroll(percent);
    }, delay);
    dom.addEventListener("scroll", onScrollHandler, { passive: true });
    return () => dom.removeEventListener("scroll", onScrollHandler);
  }

  return { attach };
}
