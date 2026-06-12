/**
 * 文档大纲 - 从 Markdown 源码提取标题
 * - 点击标题滚动编辑器到对应行
 * - 内容变化时自动刷新
 */
import { useMemo } from "react";
import { useEditorStore, editorViewRef } from "@/stores/editorStore";
import { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils/cn";

interface Heading {
  level: number;
  text: string;
  line: number; // 1-based
}

/** 从 Markdown 源码提取标题 */
function extractHeadings(md: string): Heading[] {
  const headings: Heading[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (m) {
      headings.push({
        level: m[1].length,
        text: m[2].replace(/[#*`\[\]()]/g, "").trim(),
        line: i + 1,
      });
    }
  }
  return headings;
}

/** 根据标题层级返回样式 */
function getLevelStyle(level: number): string {
  switch (level) {
    case 1:
      return "text-[13px] font-semibold";
    case 2:
      return "text-[12px] font-medium";
    case 3:
      return "text-[11px] font-normal";
    default:
      return "text-[11px] font-light text-[var(--color-text-muted)]";
  }
}

export function Outline() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const currentLine = useEditorStore((s) => s.cursor.line);

  const headings = useMemo(() => extractHeadings(content), [content]);

  const handleClick = (line: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    const lineObj = view.state.doc.line(Math.min(line, view.state.doc.lines));
    view.dispatch({
      selection: { anchor: lineObj.from },
      effects: EditorView.scrollIntoView(lineObj.from, { y: "start", yMargin: 60 }),
    });
    view.focus();
  };

  if (headings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-subtle)]">
        无标题
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto py-1">
      {headings.map((h, i) => {
        const nextSameOrHigher = headings
          .slice(i + 1)
          .find((n) => n.level <= h.level);
        const sectionEnd = nextSameOrHigher ? nextSameOrHigher.line - 1 : Infinity;
        const isActive = currentLine >= h.line && currentLine <= sectionEnd;

        return (
          <div
            key={`${h.line}-${h.text}`}
            onClick={() => handleClick(h.line)}
            className={cn(
              "flex cursor-pointer items-center rounded-sm px-2 py-[3px] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]",
              getLevelStyle(h.level),
              isActive && "bg-[var(--color-bg-muted)] text-[var(--color-accent)]",
            )}
            style={{ paddingLeft: `${(h.level - 1) * 14 + 8}px` }}
          >
            <span className="truncate">{h.text}</span>
          </div>
        );
      })}
    </div>
  );
}
