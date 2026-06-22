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
  foldKeymap,
  foldState,
  syntaxHighlighting,
} from "@codemirror/language";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";

import { lightTheme, darkTheme } from "./extensions/theme";
import { lightHighlight, darkHighlight } from "./extensions/highlight";
import { inlineFoldMarkers } from "./extensions/foldMarker";
import { createShortcuts } from "./extensions/shortcuts";
import {
  wordCountField,
  wordCountUpdate,
  wordCountInit,
} from "./extensions/wordcount";
import { createAutoSave } from "./extensions/autoSave";
import { createHyperlinkHandler } from "./extensions/hyperlinks";
import { useEditorStore, editorViewRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCmMod } from "@/lib/utils/platform";
import { isScrollSyncing, lockScrollSync } from "@/lib/utils/scrollSyncLock";
import { syncPreviewFromEditor } from "@/lib/utils/scrollSync";
import { cn } from "@/lib/utils/cn";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onToggleSidebar?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  onSave,
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
  const setSelection = useEditorStore((s) => s.setSelection);
  const setScrollPercent = useEditorStore((s) => s.setScrollPercent);

  // cursorSync 扩展：选区变化时同步光标位置到 store（供目录高亮）
  // 文档变化时同步内容到 store（确保撤销/重做也能更新 isDirty）
  // 用 ViewPlugin 而非 onUpdate 回调，确保 view.dispatch 触发的选区变化也能被捕获
  const cursorSync = useMemo(
    () =>
      CMEditorView.updateListener.of((vu: ViewUpdate) => {
        // 文档变化时同步内容
        if (vu.docChanged) {
          const content = vu.state.doc.toString();
          const currentFile = useEditorStore.getState().currentFile;
          // 只有内容真的变化时才更新（避免文件加载时误触发）
          if (currentFile && content !== currentFile.content) {
            useEditorStore.getState().updateContent(currentFile.path, content);
          }
        }

        // 选区变化时同步光标
        if (vu.selectionSet) {
          const state = vu.state;
          const pos = state.selection.main.head;
          const line = state.doc.lineAt(pos);
          setCursor({ line: line.number, ch: pos - line.from });

          // 同步选中文本信息
          const sel = state.selection.main;
          if (sel.from !== sel.to) {
            const text = state.sliceDoc(sel.from, sel.to);
            const chars = text.length;
            const cnChars = (text.match(/[一-龥]/g) || []).length;
            const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
            setSelection({ text, chars, words: cnChars + enWords });
          } else {
            setSelection({ text: "", chars: 0, words: 0 });
          }
        }
      }),
    [setCursor, setSelection],
  );

  const viewRef = useRef<EditorView | null>(null);
  /** 回调的稳定引用：autoSave/shortcuts 读 ref.current，保证扩展只创建一次、闭包始终最新 */
  const cbRef = useRef({ onSave: onSave ?? null, onToggleSidebar: onToggleSidebar ?? null });
  useEffect(() => {
    cbRef.current = { onSave: onSave ?? null, onToggleSidebar: onToggleSidebar ?? null };
  }, [onSave, onToggleSidebar]);
  const [editorReady, setEditorReady] = useState(false);
  const [mod, setMod] = useState("Mod-");

  useEffect(() => {
    getCmMod().then(setMod);
  }, []);

  // 卸载时清空共享 view 引用，避免纯预览模式下目录误用已销毁的 view
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
      highlightSelectionMatches(),
      autocompletion(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      cursorSync,
      wordCountField,
      wordCountUpdate,
      wordCountInit,
      keymap.of(baseKeymap),
      createShortcuts(mod, () => ({
        onSave: cbRef.current.onSave ?? undefined,
        onToggleSidebar: cbRef.current.onToggleSidebar ?? undefined,
      })),
      createHyperlinkHandler(),
    ];

    if (wordWrapEnabled) {
      exts.push(CMEditorView.lineWrapping);
    }

    if (lineNumbersEnabled) {
      exts.push(lineNumbers());
      exts.push(highlightActiveLine());
    }

    if (autoSaveEnabled) {
      exts.push(createAutoSave(() => cbRef.current.onSave?.(), autoSaveDelay));
    }

    exts.push(resolvedTheme === "dark" ? darkTheme : lightTheme);
    exts.push(syntaxHighlighting(resolvedTheme === "dark" ? darkHighlight : lightHighlight));
    exts.push(inlineFoldMarkers);
    // foldGutter 关闭后 foldState 不会自动激活，需手动加，否则 foldEffect/unfoldEffect 无处理者（点击折叠无效）
    exts.push(foldState);

    return exts;
  }, [
    mod,
    resolvedTheme,
    lineNumbersEnabled,
    wordWrapEnabled,
    autoSaveEnabled,
    autoSaveDelay,
  ]);

  // 滚动同步：编辑器 → 预览（按编辑器可视首行映射到预览对应块；找不到标注块回退百分比）
  // 同步逻辑下沉到 syncPreviewFromEditor，供 MarkdownPreview 编辑后对齐复用
  useEffect(() => {
    if (!scrollSync) return; // 关闭滚动同步时不挂监听
    const view = viewRef.current;
    if (!view) return;
    const dom = view.scrollDOM;

    let ticking = false;
    // settle 校正：CodeMirror 虚拟滚动在滚动停止后才修正 scrollHeight，
    // rAF 读到的 editorMax 可能偏大 → percent 偏小（底部差 ~3%），停止后二次同步补正
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (isScrollSyncing()) return; // 程序触发的滚动（如预览同步过来的），跳过
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        syncPreviewFromEditor();
        const top = dom.scrollTop;
        const height = dom.scrollHeight - dom.clientHeight;
        const percent = height > 0 ? top / height : 0;
        setScrollPercent(percent, "editor");
      });
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (isScrollSyncing()) return;
        syncPreviewFromEditor();
      }, 150);
    };

    dom.addEventListener("scroll", handler, { passive: true });
    return () => {
      dom.removeEventListener("scroll", handler);
      if (settleTimer) clearTimeout(settleTimer);
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
          // 否则目录用过期的 currentLine 算 active，永远高亮到最后一个标题
          setCursor({ line: 1, ch: 0 });
          // 模式切换重建编辑器时保留阅读进度（文件切换时 scrollPercentPath≠activeFilePath，从顶部开始）
          const { scrollPercent, scrollPercentPath, activeFilePath } =
            useEditorStore.getState();
          if (scrollPercentPath === activeFilePath && scrollPercent > 0) {
            const dom = view.scrollDOM;
            // 推迟一帧等 CodeMirror 完成布局，scrollHeight 才准确
            requestAnimationFrame(() => {
              const max = dom.scrollHeight - dom.clientHeight;
              if (max > 0) {
                lockScrollSync();
                dom.scrollTop = max * scrollPercent;
              }
            });
          }
        }}
        basicSetup={{
          lineNumbers: lineNumbersEnabled,
          foldGutter: false,
          highlightActiveLine: lineNumbersEnabled,
          highlightActiveLineGutter: lineNumbersEnabled,
          highlightSelectionMatches: false,
          autocompletion: false,
          bracketMatching: false,
          closeBrackets: false,
          indentOnInput: false,
          drawSelection: false,
          tabSize,
        }}
      />
    </div>
  );
}
