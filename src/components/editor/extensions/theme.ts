/**
 * CodeMirror 主题扩展
 * 动态根据 resolvedTheme 切换亮/暗
 */
import { EditorView } from "@codemirror/view";

/** 浅色主题（自定义，比 one-light 更现代） */
export const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-bg-elevated)",
      color: "var(--color-text)",
      fontSize: "var(--editor-font-size, 14px)",
      fontFamily: "var(--font-editor)",
      height: "100%",
      maxHeight: "100%",
    },
    ".cm-scroller": {
      height: "100%",
      maxHeight: "100%",
      overflow: "auto",
      willChange: "scroll-position",
      contain: "strict",
    },
    ".cm-content": {
      caretColor: "var(--color-accent)",
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
      padding: "32px 16px",
      maxWidth: "680px",
      margin: "0 auto",
      minHeight: "100%",
    },
    ".cm-line": {
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklch, var(--color-selection) 38%, transparent)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--color-bg-muted)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-elevated)",
      color: "var(--color-text-subtle)",
      border: "none",
      borderRight: "1px solid var(--color-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 8px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-foldGutter": {
      width: "16px",
    },
    ".cm-foldGutter .cm-gutterElement": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--color-bg-muted)",
      color: "var(--color-text-muted)",
      border: "none",
      padding: "0 4px",
      borderRadius: "var(--radius-sm)",
    },
    ".cm-searchMatch": {
      backgroundColor: "color-mix(in oklch, var(--color-warning) 30%, transparent)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "var(--color-warning)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 15%, transparent)",
    },
  },
  { dark: false },
);

/** 深色主题 */
export const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-bg-elevated)",
      color: "var(--color-text)",
      fontSize: "var(--editor-font-size, 14px)",
      fontFamily: "var(--font-editor)",
      height: "100%",
      maxHeight: "100%",
    },
    ".cm-scroller": {
      height: "100%",
      maxHeight: "100%",
      overflow: "auto",
      willChange: "scroll-position",
      contain: "strict",
    },
    ".cm-content": {
      caretColor: "var(--color-accent)",
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
      padding: "32px 16px",
      maxWidth: "680px",
      margin: "0 auto",
      minHeight: "100%",
    },
    ".cm-line": {
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklch, var(--color-selection) 38%, transparent)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--color-bg-muted)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-elevated)",
      color: "var(--color-text-subtle)",
      border: "none",
      borderRight: "1px solid var(--color-border)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 8px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-foldGutter": {
      width: "16px",
    },
    ".cm-foldGutter .cm-gutterElement": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--color-bg-muted)",
      color: "var(--color-text-muted)",
      border: "none",
      padding: "0 4px",
      borderRadius: "var(--radius-sm)",
    },
    ".cm-searchMatch": {
      backgroundColor: "color-mix(in oklch, var(--color-warning) 30%, transparent)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "var(--color-warning)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 20%, transparent)",
    },
  },
  { dark: true },
);
