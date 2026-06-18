/**
 * 搜索面板 - 在文件夹中搜索文本
 * - 搜索所有 Markdown 文件的内容
 * - 显示匹配结果，点击跳转到文件
 */
import { useState, useRef, useEffect } from "react";
import { Search, X, FileText } from "lucide-react";
import { EditorView } from "@codemirror/view";
import { useFileStore, type FileNode } from "@/stores/fileStore";
import { useEditorStore, editorViewRef, previewContainerRef } from "@/stores/editorStore";
import { readTextFile } from "@tauri-apps/plugin-fs";

interface SearchResult {
  path: string;
  name: string;
  line: number;
  text: string;
}

/** 递归收集所有文件路径 */
function collectFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.isDir) {
      if (node.children && node.children.length > 0) {
        files.push(...collectFiles(node.children));
      }
    } else {
      files.push(node);
    }
  }
  return files;
}

/** 高亮匹配文本 */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-[var(--color-warning)]/30 text-[var(--color-text)]">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function SearchPanel() {
  const folders = useFileStore((s) => s.folders);
  const openFile = useEditorStore((s) => s.openFile);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦 + 组件卸载时清除选区和高亮
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      window.getSelection()?.removeAllRanges();
      clearHighlights();
    };
  }, []);

  // 清除预览区域的搜索高亮
  const clearHighlights = () => {
    const previewContainer = previewContainerRef.current;
    if (!previewContainer) return;
    previewContainer.querySelectorAll(".search-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });
  };

  // 执行搜索
  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // 搜索所有打开的文件夹
    const allFiles: FileNode[] = [];
    for (const folder of folders) {
      allFiles.push(...collectFiles(folder.fileTree));
    }

    if (allFiles.length === 0) {
      setResults([]);
      return;
    }

    setSearching(true);
    const searchResults: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const file of allFiles) {
      try {
        const content = await readTextFile(file.path);
        const lines = content.split("\n");
        let matchCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            searchResults.push({
              path: file.path,
              name: file.name,
              line: i + 1,
              text: lines[i].trim(),
            });
            matchCount++;
            // 每个文件最多显示 3 个匹配
            if (matchCount >= 3) break;
          }
        }
      } catch {
        // 忽略读取失败的文件
      }
    }

    setResults(searchResults);
    setSearching(false);
  };

  // 输入变化时自动搜索（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
        clearHighlights();
        window.getSelection()?.removeAllRanges();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 点击结果打开文件并跳转到对应行
  const handleClickResult = async (result: SearchResult) => {
    try {
      const content = await readTextFile(result.path);
      const title = result.name.replace(/\.(md|markdown|mdx)$/i, "");
      openFile(result.path, title, content);

      // 跳转到对应行并选中匹配文本
      setTimeout(() => {
        const view = editorViewRef.current;
        if (view) {
          // 编辑器模式：跳转并选中
          const line = view.state.doc.line(result.line);
          const lineText = line.text;
          const queryLower = query.toLowerCase();
          const matchIndex = lineText.toLowerCase().indexOf(queryLower);

          if (matchIndex !== -1) {
            const from = line.from + matchIndex;
            const to = from + query.length;
            view.dispatch({
              selection: { anchor: from, head: to },
              effects: EditorView.scrollIntoView(from, { y: "center" }),
            });
            view.focus();
          } else {
            // 如果没找到匹配，只跳转到行首
            view.dispatch({
              selection: { anchor: line.from },
              effects: EditorView.scrollIntoView(line.from, { y: "center" }),
            });
            view.focus();
          }
        } else {
          // 阅读模式：清除旧高亮 + 滚动到匹配位置
          const previewContainer = previewContainerRef.current;
          if (!previewContainer) return;

          // 清除之前的高亮
          previewContainer.querySelectorAll(".search-highlight").forEach((el) => {
            const parent = el.parentNode;
            if (parent) {
              parent.replaceChild(document.createTextNode(el.textContent || ""), el);
              parent.normalize();
            }
          });

          const queryLower = query.toLowerCase();
          const walker = document.createTreeWalker(
            previewContainer,
            NodeFilter.SHOW_TEXT,
          );

          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            const text = node.textContent || "";
            const index = text.toLowerCase().indexOf(queryLower);
            if (index !== -1) {
              // 拆分文本节点，用 <mark> 包裹匹配部分
              const before = text.slice(0, index);
              const match = text.slice(index, index + query.length);
              const after = text.slice(index + query.length);

              const frag = document.createDocumentFragment();
              if (before) frag.appendChild(document.createTextNode(before));
              const mark = document.createElement("mark");
              mark.className = "search-highlight";
              mark.style.cssText = "background:color-mix(in oklch,var(--color-selection) 40%,transparent);border-radius:2px;padding:0 1px;";
              mark.textContent = match;
              frag.appendChild(mark);
              if (after) frag.appendChild(document.createTextNode(after));

              node.parentNode?.replaceChild(frag, node);

              // 滚动到高亮位置
              mark.scrollIntoView({ block: "center" });
              break;
            }
          }
        }
      }, 50);
    } catch {
      // 忽略错误
    }
  };

  // Enter 搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 搜索输入框 */}
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2.5 py-2">
          <Search size={14} className="shrink-0 text-[var(--color-text-subtle)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文件内容..."
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                clearHighlights();
                window.getSelection()?.removeAllRanges();
              }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {searching && (
          <div className="flex items-center justify-center py-4 text-xs text-[var(--color-text-subtle)]">
            搜索中...
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <div className="flex items-center justify-center py-4 text-xs text-[var(--color-text-subtle)]">
            未找到匹配结果
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="text-xs text-[var(--color-text-subtle)]">
            找到 {results.length} 个结果
          </div>
        )}

        {results.map((result, index) => (
          <div
            key={`${result.path}-${result.line}-${index}`}
            onClick={() => handleClickResult(result)}
            className="group cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-bg-muted)]"
          >
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="shrink-0 text-[var(--color-text-subtle)]" />
              <span className="truncate font-medium text-[var(--color-text)]">{result.name}</span>
              <span className="shrink-0 text-[var(--color-text-subtle)]">:{result.line}</span>
            </div>
            <div className="mt-0.5 truncate pl-5 text-[var(--color-text-muted)]">
              {highlightMatch(result.text, query)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
