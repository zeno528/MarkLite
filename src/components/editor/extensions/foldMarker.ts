/**
 * Inline 折叠开关：可折叠行行首显示圆圈 toggle（点击折叠/展开），替代 foldGutter（行号栏箭头）。
 * ViewPlugin 检测可折叠范围（foldable），在行首插 FoldToggle widget；
 * 点击 dispatch foldEffect/unfoldEffect。圆圈样式由 theme.ts 的 .cm-fold-toggle 控制。
 */
import {
  ViewPlugin,
  Decoration,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { foldable, foldState, foldEffect, unfoldEffect } from "@codemirror/language";

class FoldToggle extends WidgetType {
  constructor(readonly open: boolean, readonly from: number, readonly to: number) {
    super();
  }
  eq(other: FoldToggle) {
    return other.open === this.open && other.from === this.from && other.to === this.to;
  }
  toDOM(view: EditorView) {
    const el = document.createElement("span");
    el.className = "cm-fold-toggle" + (this.open ? " cm-fold-toggle-open" : " cm-fold-toggle-closed");
    el.textContent = this.open ? "▾" : "▸";
    el.title = this.open ? "折叠" : "展开";
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        effects: this.open
          ? unfoldEffect.of({ from: this.from, to: this.to })
          : foldEffect.of({ from: this.from, to: this.to }),
      });
    });
    return el;
  }
  ignoreEvent() {
    return false;
  }
}

function buildFoldDecorations(view: EditorView): DecorationSet {
  const widgets: { from: number; deco: Decoration }[] = [];
  const folded = view.state.field(foldState, false) ?? Decoration.none;
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = view.state.doc.lineAt(pos);
      const range = foldable(view.state, line.from, line.to);
      if (range) {
        let isFolded = false;
        folded.between(range.from, range.from, (f) => {
          if (f === range.from) isFolded = true;
        });
        widgets.push({
          from: line.from,
          deco: Decoration.widget({
            widget: new FoldToggle(!isFolded, range.from, range.to),
            side: -1,
          }),
        });
      }
      pos = line.to + 1;
    }
  }
  return Decoration.set(widgets.map((w) => w.deco.range(w.from)), true);
}

export const inlineFoldMarkers = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildFoldDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((tr) => tr.effects.length > 0)
      ) {
        this.decorations = buildFoldDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
