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
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { EditorView, ViewUpdate } from "@codemirror/view";
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
import { createHyperlinkHandler } from "./extensions/hyperlinks";
import { useEditorStore, editorViewRef, previewContainerRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCmMod } from "@/lib/utils/platform";
import { lockScrollSync, isScrollSyncing } from "@/lib/utils/scrollSyncLock";
import { cn } from "@/lib/utils/cn";

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
  // 纯编辑模式：.cm-content 填满宽度（去掉 680 居中），配合软换行自适应窗口宽度
  const isStandalone = useUIStore((s) => s.layout) === "editor-only";
  const lineNumbersEnabled = useSettingsStore((s) => s.lineNumbers);
  const wordWrapEnabled = useSettingsStore((s) => s.wordWrap);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const autoSaveEnabled = useSettingsStore((s) => s.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.autoSaveDelay);
  const setCursor = useEditorStore((s) => s.setCursor);
  const setScrollPercent = useEditorStore((s) => s.setScrollPercent);

  // onUpdate 稳定引用（避免 @uiw 因 onUpdate 变化 reconfigure 全部 extensions，导致打字吞字符）
  // 只在选区（光标）变化时同步，docChanged 不重复触发
  const onUpdate = useCallback(
    (vu: ViewUpdate) => {
      if (!vu.selectionSet) return;
      const state = vu.state;
      const pos = state.selection.main.head;
      const line = state.doc.lineAt(pos);
      setCursor({ line: line.number, ch: pos - line.from });
    },
    [setCursor],
  );

  const viewRef = useRef<EditorView | null>(null);
  /** 回调的稳定引用：autoSave/shortcuts 读 ref.current，保证扩展只创建一次、闭包始终最新 */
  const cbRef = useRef({ onSave: onSave ?? null, onTogglePreview: onTogglePreview ?? null, onToggleSidebar: onToggleSidebar ?? null });
  useEffect(() => {
    cbRef.current = { onSave: onSave ?? null, onTogglePreview: onTogglePreview ?? null, onToggleSidebar: onToggleSidebar ?? null };
  }, [onSave, onTogglePreview, onToggleSidebar]);
  const [editorReady, setEditorReady] = useState(false);
  const [mod, setMod] = useState("Mod-");

  useEffect(() => {
    getCmMod().then(setMod);
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
      createShortcuts(mod, () => ({
        onSave: cbRef.current.onSave ?? undefined,
        onTogglePreview: cbRef.current.onTogglePreview ?? undefined,
        onToggleSidebar: cbRef.current.onToggleSidebar ?? undefined,
      })),
      createHyperlinkHandler(),
    ];

    if (wordWrapEnabled) {
      exts.push(CMEditorView.lineWrapping);
    }

    if (lineNumbersEnabled) {
      exts.push(lineNumbers());
      exts.push(foldGutter());
      exts.push(highlightActiveLine());
    }

    if (autoSaveEnabled) {
      exts.push(createAutoSave(() => cbRef.current.onSave?.(), autoSaveDelay));
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
  ]);

  // 滚动同步：编辑器 → 预览（直接写预览 scrollTop，绕过 React 中转，1 帧延迟）
  // 不走 store → useEffect 中转（那会多 2~3 帧），而是同 rAF 内直接 DOM-to-DOM
  useEffect(() => {
    if (!scrollSync) return; // 关闭滚动同步时不挂监听
    const view = viewRef.current;
    if (!view) return;
    const dom = view.scrollDOM;

    let ticking = false;
    const handler = () => {
      if (isScrollSyncing()) return; // 程序触发的滚动（如预览同步过来的），跳过
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const top = dom.scrollTop;
        const height = dom.scrollHeight - dom.clientHeight;
        const percent = height > 0 ? top / height : 0;

        // 直接写预览 scrollTop
        const preview = previewContainerRef.current;
        if (preview) {
          const previewHeight = preview.scrollHeight - preview.clientHeight;
          if (previewHeight > 0) {
            lockScrollSync();
            preview.scrollTop = previewHeight * percent;
          }
        }

        setScrollPercent(percent, "editor");
      });
    };

    dom.addEventListener("scroll", handler, { passive: true });
    return () => {
      dom.removeEventListener("scroll", handler);
    };
  }, [editorReady, scrollSync, setScrollPercent]);

  // CSS 变量
  const editorStyle = {
    "--editor-font-size": `${fontSize}px`,
    "--font-editor": fontFamily,
  } as React.CSSProperties;

  // 两种模式都用 height:100% 内部滚动（与双栏一致）；纯编辑模式加 cm-grow 让 .cm-content 填满宽度，
  // 配合软换行实现"窗口够宽不换行、不够宽自动折行"。
  return (
    <div className="h-full w-full overflow-hidden" style={editorStyle}>
      <CodeMirror
        className={cn("h-full", isStandalone && "cm-grow")}
        value={value}
        height="100%"
        theme="none"
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
          editorViewRef.current = view;
          setEditorReady(true);
          // 切换文件会按 key=path 重建编辑器：重置光标到开头，避免上一文件的 cursor 残留，
          // 否则大纲用过期的 currentLine 算 active，永远高亮到最后一个标题
          setCursor({ line: 1, ch: 0 });
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
          tabSize,
        }}
        onUpdate={onUpdate}
      />
    </div>
  );
}
