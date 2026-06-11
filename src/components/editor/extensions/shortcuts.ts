/**
 * CodeMirror 快捷键扩展
 * - Cmd/Ctrl+S 保存
 * - Cmd/Ctrl+B 加粗（Markdown 风格）
 * - Cmd/Ctrl+I 斜体
 * - Cmd/Ctrl+K 链接
 * - Cmd/Ctrl+Shift+P 切换预览
 * - Cmd/Ctrl+\ 切换侧边栏
 *
 * 注：Cmd/Ctrl 由调用方根据平台传入 prefix
 * Markdown 编辑用文本插入方式更可靠（CM 的 mark 系统对 GFM 适配不完整）
 */
import { Prec } from "@codemirror/state";
import { EditorView, keymap, type Command } from "@codemirror/view";

export interface ShortcutHandlers {
  onSave?: () => void;
  onTogglePreview?: () => void;
  onToggleSidebar?: () => void;
}

/** 在选区两端插入包裹符（无选区则插入空模板并选中） */
function wrapSelection(view: EditorView, before: string, after: string, placeholder = ""): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const selected = state.sliceDoc(sel.from, sel.to);
  const text = selected || placeholder;
  const insert = `${before}${text}${after}`;
  const cursorFrom = sel.from + before.length;
  const cursorTo = cursorFrom + text.length;

  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: cursorFrom, head: cursorTo },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

export function createShortcuts(
  mod: string,
  handlers: ShortcutHandlers,
) {
  const commands: Record<string, Command> = {
    [`${mod}s`]: () => {
      handlers.onSave?.();
      return true;
    },
    [`${mod}b`]: (view) => wrapSelection(view, "**", "**", "bold text"),
    [`${mod}i`]: (view) => wrapSelection(view, "_", "_", "italic text"),
    [`${mod}k`]: (view) => wrapSelection(view, "[", "](https://)", "link text"),
    [`${mod}Shift-p`]: () => {
      handlers.onTogglePreview?.();
      return true;
    },
    [`${mod}\\`]: () => {
      handlers.onToggleSidebar?.();
      return true;
    },
  };

  return Prec.high(
    keymap.of(Object.entries(commands).map(([key, cmd]) => ({ key, run: cmd }))),
  );
}
