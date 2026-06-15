/**
 * 打字机模式扩展：当前行恒居视口中央
 * 光标所在行始终滚动到屏幕垂直中央（像老式打字机）。
 */
import { ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";

class TypewriterPlugin {
  constructor(view: EditorView) {
    this.center(view);
  }
  update(u: ViewUpdate) {
    if (u.selectionSet || u.docChanged || u.viewportChanged) {
      this.center(u.view);
    }
  }
  center(view: EditorView) {
    const pos = view.state.selection.main.head;
    const block = view.lineBlockAt(pos);
    const viewHeight = view.dom.clientHeight;
    const target = block.top + block.height / 2 - viewHeight / 2;
    // 延迟到下一帧测量完成后再滚动，避免视口尚未刷新导致抖动
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = Math.max(0, target);
    });
  }
}

export const typewriterMode = ViewPlugin.fromClass(TypewriterPlugin);
