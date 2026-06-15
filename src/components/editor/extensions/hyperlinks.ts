/**
 * CodeMirror 链接点击扩展
 *
 * 行为约定（与 Typora / VS Code 一致）：
 * - 编辑器内：**Ctrl/Cmd + 单击** 链接 → 系统默认浏览器打开
 * - 不响应普通单击 → 保持光标定位，避免误触
 *
 * 匹配范围：
 * 1. Markdown 链接 [text](url) — 整段语法（含中括号）
 * 2. 自动链接 <https://...> — 可选
 * 3. 裸 URL https?://... — 整段 URL
 *
 * 注意：
 * - CodeMirror 编辑器显示的是 markdown 源文，不是渲染后的 <a>
 * - 不做装饰 / 样式改动（lang-markdown 已自带链接样式）
 * - 仅捕获 click 事件，识别落点 → 调原生 opener
 */
import { EditorView } from "@codemirror/view";
import { openExternalUrl } from "@/lib/utils/openUrl";

/** 匹配 markdown 链接 [text](url)，含嵌套括号 URL（罕见但合法） */
const MD_LINK_RE = /\[[^\]\n]*?\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
/** 匹配裸 URL（http/https） */
const BARE_URL_RE = /https?:\/\/[^\s<>")\]]+/g;

export function createHyperlinkHandler() {
  return EditorView.domEventHandlers({
    click(event, view) {
      // 仅响应 Ctrl/Cmd + 点击
      if (!(event.ctrlKey || event.metaKey)) return;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return;

      // 向上取整行（链接可能跨视觉换行）
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const lineStart = line.from;

      // 1) markdown 链接（优先匹配，url 在第二个捕获组）
      MD_LINK_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = MD_LINK_RE.exec(text)) !== null) {
        const fullStart = lineStart + m.index;
        const fullEnd = fullStart + m[0].length;
        if (pos >= fullStart && pos <= fullEnd) {
          event.preventDefault();
          openExternalUrl(m[1]);
          return true;
        }
      }

      // 2) 裸 URL
      BARE_URL_RE.lastIndex = 0;
      while ((m = BARE_URL_RE.exec(text)) !== null) {
        const urlStart = lineStart + m.index;
        const urlEnd = urlStart + m[0].length;
        if (pos >= urlStart && pos <= urlEnd) {
          event.preventDefault();
          openExternalUrl(m[0]);
          return true;
        }
      }
    },
  });
}
