/**
 * 专注模式扩展：淡化非当前段落
 * 当前光标所在段落（由空行界定的文本块）保持清晰，其余段落 opacity 降低。
 * 配合 theme.ts 的 .cm-dimmed { opacity: 0.3 } 生效。
 */
import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

class FocusModePlugin {
  decorations: DecorationSet = Decoration.none;
  constructor(view: EditorView) {
    this.decorations = this.compute(view);
  }
  update(u: ViewUpdate) {
    if (u.docChanged || u.selectionSet || u.viewportChanged) {
      this.decorations = this.compute(u.view);
    }
  }
  /** 找出非当前段落的行，标记为 cm-dimmed */
  compute(view: EditorView): DecorationSet {
    const { doc, selection } = view.state;
    const head = selection.main.head;
    const curLine = doc.lineAt(head);
    // 当前段落范围：向上/向下遇到空行停止
    let startLine = curLine.number;
    while (startLine > 1 && doc.line(startLine - 1).text.trim() !== "") startLine--;
    let endLine = curLine.number;
    const total = doc.lines;
    while (endLine < total && doc.line(endLine + 1).text.trim() !== "") endLine++;
    // 范围外、非空行 → dimmed（必须按位置升序 add）
    const builder = new RangeSetBuilder<Decoration>();
    for (let n = 1; n <= total; n++) {
      if (n >= startLine && n <= endLine) continue;
      const line = doc.line(n);
      if (line.text.trim() === "") continue;
      builder.add(line.from, line.from, Decoration.line({ class: "cm-dimmed" }));
    }
    return builder.finish();
  }
}

export const focusMode = ViewPlugin.fromClass(FocusModePlugin, {
  decorations: (v) => v.decorations,
});
