/**
 * CodeMirror 6 包装组件
 * - Markdown 语法（GFM + 代码块语言识别）
 * - 主题（亮/暗动态切换）
 * - 快捷键（Cmd/Ctrl 自动适配平台）
 * - 字数统计（中英混合）
 * - 自动保存（防抖 N 秒）
 * - 滚动同步（编辑器 → 预览）
 * - 查找替换（内置 searchKeymap）
 */
import { useMemo, useEffect, useState, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView as CMEditorView } from "@codemirror/view";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";

import { lightTheme, darkTheme } from "./extensions/theme";
import { createShortcuts } from "./extensions/shortcuts";
import {
  wordCountField,
  wordCountUpdate,
  wordCountInit,
} from "./extensions/wordcount";
import { createAutoSave } from "./extensions/autoSave";
import { useEditorStore, editorViewRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCmMod, getScrollThrottle } from "@/lib/utils/platform";
import { throttle } from "@/lib/utils/throttle";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onTogglePreview?: () => void;
  onToggleSidebar?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  onSave,
  onTogglePreview,
  onToggleSidebar,
}: CodeEditorProps) {
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const fontSize = useUIStore((s) => s.fontSize);
  const fontFamily = useUIStore((s) => s.fontFamily);
  const lineNumbersEnabled = useSettingsStore((s) => s.lineNumbers);
  const wordWrapEnabled = useSettingsStore((s) => s.wordWrap);
  const autoSaveEnabled = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
  const setCursor = useEditorStore((s) => s.setCursor);
  const setScrollPercent = useEditorStore((s) => s.setScrollPercent);
  const scrollPercent = useEditorStore((s) => s.scrollPercent);
  const scrollSource = useEditorStore((s) => s.scrollSource);

  const viewRef = useRef<EditorView | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [mod, setMod] = useState("Mod-");
  const [throttleDelay, setThrottleDelay] = useState(32);

  useEffect(() => {
    getCmMod().then(setMod);
    getScrollThrottle().then(setThrottleDelay);
  }, []);

  // 卸载时清空共享 view 引用，避免纯预览模式下大纲误用已销毁的 view
  useEffect(() => {
    return () => {
      editorViewRef.current = null;
    };
  }, []);

  const extensions = useMemo(() => {
    const baseKeymap = [
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ];

    const exts: any[] = [
      history(),
      bracketMatching(),
      indentOnInput(),
      drawSelection(),
      highlightSelectionMatches(),
      autocompletion(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      wordCountField,
      wordCountUpdate,
      wordCountInit,
      keymap.of(baseKeymap),
      createShortcuts(mod, {
        onSave,
        onTogglePreview,
        onToggleSidebar,
      }),
    ];

    if (wordWrapEnabled) {
      exts.push(CMEditorView.lineWrapping);
    }

    if (lineNumbersEnabled) {
      exts.push(lineNumbers());
      exts.push(foldGutter());
      exts.push(highlightActiveLine());
    }

    if (autoSaveEnabled && onSave) {
      exts.push(createAutoSave(onSave, autoSaveDelay));
    }

    exts.push(resolvedTheme === "dark" ? darkTheme : lightTheme);

    return exts;
  }, [
    mod,
    resolvedTheme,
    lineNumbersEnabled,
    wordWrapEnabled,
    autoSaveEnabled,
    autoSaveDelay,
    onSave,
    onTogglePreview,
    onToggleSidebar,
  ]);

  // 滚动同步：编辑器 → 预览
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const dom = view.scrollDOM;

    const handler = throttle(() => {
      const top = dom.scrollTop;
      const height = dom.scrollHeight - dom.clientHeight;
      const percent = height > 0 ? top / height : 0;
      setScrollPercent(percent, "editor");
    }, throttleDelay);

    dom.addEventListener("scroll", handler, { passive: true });
    return () => {
      dom.removeEventListener("scroll", handler);
    };
  }, [editorReady, throttleDelay, setScrollPercent]);

  // 滚动同步：预览 → 编辑器
  useEffect(() => {
    if (scrollSource !== "preview") return;
    const view = viewRef.current;
    if (!view) return;
    const dom = view.scrollDOM;
    const scrollHeight = dom.scrollHeight - dom.clientHeight;
    if (scrollHeight > 0) {
      dom.scrollTop = scrollPercent * scrollHeight;
    }
  }, [scrollPercent, scrollSource]);

  // CSS 变量
  const editorStyle = {
    "--editor-font-size": `${fontSize}px`,
    "--font-editor": fontFamily,
  } as React.CSSProperties;

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={editorStyle}
    >
      <CodeMirror
        className="h-full"
        value={value}
        height="100%"
        theme="none"
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
          editorViewRef.current = view;
          setEditorReady(true);
        }}
        basicSetup={{
          lineNumbers: lineNumbersEnabled,
          foldGutter: lineNumbersEnabled,
          highlightActiveLine: lineNumbersEnabled,
          highlightActiveLineGutter: lineNumbersEnabled,
          highlightSelectionMatches: false,
          autocompletion: false,
          bracketMatching: false,
          closeBrackets: false,
          indentOnInput: false,
          tabSize: 2,
        }}
        onUpdate={(view) => {
          if (!view) return;
          const state = view.state;
          const pos = state.selection.main.head;
          const line = state.doc.lineAt(pos);
          setCursor({ line: line.number, ch: pos - line.from });
        }}
      />
    </div>
  );
}
