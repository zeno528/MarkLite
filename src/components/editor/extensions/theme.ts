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
      padding: "0 16px",
      minHeight: "100%",
    },
    ".cm-line": {
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklch, var(--color-selection) 38%, transparent)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--color-text) 4%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 8%, transparent)",
      color: "var(--color-accent)",
      fontWeight: "600",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-subtle)",
      color: "var(--color-text-subtle)",
      border: "none",
      borderRight: "1px solid color-mix(in oklch, var(--color-border) 70%, transparent)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 14px 0 8px",
      minWidth: "44px",
      textAlign: "right",
      color: "var(--color-text-subtle)",
      fontFamily: "var(--font-editor-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: "0.92em",
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
      backgroundColor: "color-mix(in oklch, var(--color-accent) 14%, transparent)",
      color: "var(--color-accent)",
      border: "1px solid color-mix(in oklch, var(--color-accent) 35%, transparent)",
      padding: "1px 8px",
      borderRadius: "9999px",
      fontSize: "0.82em",
      margin: "0 3px",
      cursor: "pointer",
    },
    ".cm-fold-toggle": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "16px",
      height: "16px",
      margin: "0 6px 0 0",
      borderRadius: "9999px",
      backgroundColor: "color-mix(in oklch, var(--color-accent) 10%, transparent)",
      color: "var(--color-text-muted)",
      cursor: "pointer",
      fontSize: "11px",
      lineHeight: "1",
      userSelect: "none",
      verticalAlign: "middle",
      transition: "color 0.14s ease, background-color 0.14s ease",
    },
    ".cm-fold-toggle:hover": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 20%, transparent)",
      color: "var(--color-accent)",
    },
    ".cm-fold-toggle-open": {
      color: "var(--color-text-muted)",
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
      padding: "0 16px",
      minHeight: "100%",
    },
    ".cm-line": {
      fontFamily: "var(--font-editor)",
      fontSize: "var(--editor-font-size, 14px)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklch, var(--color-selection) 38%, transparent)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--color-text) 4%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 8%, transparent)",
      color: "var(--color-accent)",
      fontWeight: "600",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-subtle)",
      color: "var(--color-text-subtle)",
      border: "none",
      borderRight: "1px solid color-mix(in oklch, var(--color-border) 70%, transparent)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 14px 0 8px",
      minWidth: "44px",
      textAlign: "right",
      color: "var(--color-text-subtle)",
      fontFamily: "var(--font-editor-mono)",
      fontVariantNumeric: "tabular-nums",
      fontSize: "0.92em",
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
      backgroundColor: "color-mix(in oklch, var(--color-accent) 14%, transparent)",
      color: "var(--color-accent)",
      border: "1px solid color-mix(in oklch, var(--color-accent) 35%, transparent)",
      padding: "1px 8px",
      borderRadius: "9999px",
      fontSize: "0.82em",
      margin: "0 3px",
      cursor: "pointer",
    },
    ".cm-fold-toggle": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "16px",
      height: "16px",
      margin: "0 6px 0 0",
      borderRadius: "9999px",
      backgroundColor: "color-mix(in oklch, var(--color-accent) 10%, transparent)",
      color: "var(--color-text-muted)",
      cursor: "pointer",
      fontSize: "11px",
      lineHeight: "1",
      userSelect: "none",
      verticalAlign: "middle",
      transition: "color 0.14s ease, background-color 0.14s ease",
    },
    ".cm-fold-toggle:hover": {
      backgroundColor: "color-mix(in oklch, var(--color-accent) 20%, transparent)",
      color: "var(--color-accent)",
    },
    ".cm-fold-toggle-open": {
      color: "var(--color-text-muted)",
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
