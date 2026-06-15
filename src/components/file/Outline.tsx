/**
 * 文档大纲 - 从 Markdown 源码提取标题
 * - 点击标题：若有编辑器则直接跳转；否则（纯预览模式）先切到 split 布局并记下待跳转行
 */
import { useEffect, useMemo } from "react";
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

/** 让编辑器跳到指定行（需 view 已就绪） */
function jumpToLine(view: EditorView, line: number) {
  const target = Math.min(Math.max(1, line), view.state.doc.lines);
  const lineObj = view.state.doc.line(target);
  view.dispatch({
    selection: { anchor: lineObj.from },
    effects: EditorView.scrollIntoView(lineObj.from, { y: "start", yMargin: 60 }),
  });
  view.focus();
}

export function Outline() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const currentLine = useEditorStore((s) => s.cursor.line);
  const pendingJumpLine = useEditorStore((s) => s.pendingJumpLine);
  const setPendingJumpLine = useEditorStore((s) => s.setPendingJumpLine);

  const headings = useMemo(() => extractHeadings(content), [content]);

  // 消费 pendingJumpLine：编辑器就绪后跳转并清空
  useEffect(() => {
    if (pendingJumpLine == null) return;
    const view = editorViewRef.current;
    if (!view) return;
    jumpToLine(view, pendingJumpLine);
    setPendingJumpLine(null);
  });

  /** 纯预览模式下：滚动预览区到第 index 个标题
   *  预览异步渲染中找不到标题时轮询等待，绝不返回失败（避免误切布局） */
  function jumpInPreview(index: number): boolean {
    const tryJump = () => {
      const preview = document.querySelector(".markdown-body");
      if (!preview) return false;
      const heads = preview.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
      const el = heads[index];
      if (!el) return false;
      let scroller: HTMLElement | null = preview.parentElement;
      while (scroller && getComputedStyle(scroller).overflowY !== "auto") {
        scroller = scroller.parentElement;
      }
      if (!scroller) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      const scrollerRect = scroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const target = scroller.scrollTop + (elRect.top - scrollerRect.top);
      scroller.scrollTo({ top: target, behavior: "smooth" });
      return true;
    };
    if (tryJump()) return true;
    // 预览尚未渲染好：轮询等待最多 1s
    let tries = 0;
    const timer = window.setInterval(() => {
      if (tryJump() || ++tries > 20) window.clearInterval(timer);
    }, 50);
    return true; // 始终返回 true，避免上层兜底切布局
  }

  const handleClick = (index: number) => {
    const line = headings[index]?.line;
    if (line == null) return;
    // 仅当编辑器真实存在于 DOM 时才走编辑器跳转（避免纯预览模式用了孤儿 view）
    const view = editorViewRef.current;
    if (view && document.body.contains(view.dom)) {
      jumpToLine(view, line);
      return;
    }
    // 无编辑器（纯预览）：滚动预览，永不切布局
    jumpInPreview(index);
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
            onClick={() => handleClick(i)}
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
