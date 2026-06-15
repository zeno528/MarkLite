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
  let inCodeFence = false; // 跳过 ``` 围栏代码块内的内容（里面的 # 不算标题）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*)/);
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

/** 根据标题层级返回样式：字号/字重按层级（选中与非选中一致，避免切换时行高跳动），只颜色不同 */
function getLevelStyle(level: number, isActive: boolean): string {
  const sizeWeight =
    level === 1 ? "text-[13px] font-semibold"
      : level === 2 ? "text-[12.5px] font-medium"
      : level === 3 ? "text-[12px] font-normal"
      : "text-[11.5px] font-light";
  const color = isActive
    ? "text-[var(--color-accent)]"
    : level <= 2 ? "text-[var(--color-text)]"
    : level === 3 ? "text-[var(--color-text-muted)]"
    : "text-[var(--color-text-subtle)]";
  return cn(sizeWeight, color);
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
   *  - index === 0：滚到顶部（卡片"原始位置"= 滚动条到顶）
   *  - 其他：滚到对应标题位置
   *  预览异步渲染中找不到标题时轮询等待，绝不返回失败（避免误切布局） */
  function jumpInPreview(index: number): boolean {
    const tryJump = () => {
      const preview = document.querySelector(".markdown-body");
      if (!preview) return false;
      // 找滚动容器（向上找第一个 overflow-y: auto 的祖先）
      let scroller: HTMLElement | null = preview.parentElement;
      while (scroller && getComputedStyle(scroller).overflowY !== "auto") {
        scroller = scroller.parentElement;
      }
      if (!scroller) return false;

      // 第一个标题：滚到顶（卡片原始位置 = 滚动条初始位置）
      if (index === 0) {
        scroller.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }

      const heads = preview.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
      const el = heads[index];
      if (!el) return false;
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

  // 计算当前光标所在的"最具体"标题索引（唯一高亮，不高亮祖先）
  let activeIndex = -1;
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const nextSameOrHigher = headings.slice(i + 1).find((n) => n.level <= h.level);
    const sectionEnd = nextSameOrHigher ? nextSameOrHigher.line - 1 : Infinity;
    if (currentLine >= h.line && currentLine <= sectionEnd) {
      activeIndex = i; // 取最后一个满足的（最深层级）
    }
  }

  return (
    <div className="h-full overflow-auto py-1">
      {headings.map((h, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={`${h.line}-${h.text}`}
            onClick={() => handleClick(i)}
            className={cn(
              "group relative flex my-0.5 cursor-pointer items-center rounded-md py-[5px] pr-2 transition-colors",
              "hover:bg-[var(--color-bg-muted)]",
              getLevelStyle(h.level, isActive),
            )}
            style={{
              paddingLeft: `${(h.level - 1) * 14 + 12}px`,
              ...(isActive
                ? { backgroundColor: "color-mix(in oklch, var(--color-accent) 10%, transparent)" }
                : {}),
            }}
            title={`${h.text} (L${h.line})`}
          >
            {/* 选中态左侧边条 */}
            {isActive && (
              <span className="absolute left-1 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
            )}
            <span className="truncate">{h.text}</span>
          </div>
        );
      })}
    </div>
  );
}
