/**
 * CodeMirror 语法高亮（VSCode Dark+/Light+ 风格配色）
 * 按 resolvedTheme 切换。tags 来自 @lezer/highlight（markdown Lezer parser 产出）。
 * 标题不放大字号（CodeMirror 行高需等齐；VSCode 编辑器内 markdown 标题也只加粗变色）。
 */
import { tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";

/** VSCode Dark+ 配色（暗色方案） */
export const darkHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "700", color: "#569CD6" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, fontFamily: "var(--font-editor-mono)", color: "#CE9178" },
  { tag: tags.link, color: "#569CD6" },
  { tag: tags.url, color: "#4DA8A8" },
  { tag: tags.quote, color: "#6A9955", fontStyle: "italic" },
  { tag: tags.list, color: "#6A9955" },
  { tag: [tags.processingInstruction, tags.contentSeparator], color: "#6A9955" },
]);

/** VSCode Light+ 配色（亮色方案） */
export const lightHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "700", color: "#0550AE" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, fontFamily: "var(--font-editor-mono)", color: "#A31515" },
  { tag: tags.link, color: "#0550AE" },
  { tag: tags.url, color: "#007ACC" },
  { tag: tags.quote, color: "#57606A", fontStyle: "italic" },
  { tag: tags.list, color: "#0000FF" },
  { tag: [tags.processingInstruction, tags.contentSeparator], color: "#6E7781" },
]);
