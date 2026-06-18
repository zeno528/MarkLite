/**
 * 文档大纲 - 从 Markdown 源码提取标题
 * - 点击标题：若有编辑器则直接跳转；否则（纯预览模式）先切到 split 布局并记下待跳转行
 */
import { useEffect, useMemo, useRef } from "react";
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

/** 根据标题层级返回样式：选中时统一 font-medium + accent 色，与文件树选中态一致 */
function getLevelStyle(level: number, isActive: boolean): string {
  const size =
    level === 1 ? "text-[13px]"
      : level === 2 ? "text-[12.5px]"
      : level === 3 ? "text-[12px]"
      : "text-[11.5px]";
  if (isActive) {
    return cn(size, "font-medium text-[var(--color-accent)]");
  }
  const weight =
    level <= 2 ? "font-medium"
    : level === 3 ? "font-normal"
    : "font-light";
  const color = level <= 2 ? "text-[var(--color-text)]"
    : level === 3 ? "text-[var(--color-text-muted)]"
    : "text-[var(--color-text-subtle)]";
  return cn(size, weight, color);
}

/** 让编辑器跳到指定行（需 view 已就绪） */
function jumpToLine(view: EditorView, line: number) {
  const target = Math.min(Math.max(1, line), view.state.doc.lines);
  const lineObj = view.state.doc.line(target);
  view.dispatch({
    selection: { anchor: lineObj.from },
    effects: EditorView.scrollIntoView(lineObj.from, { y: "start", yMargin: 60 }),
  });
  // 手动快速滚动到目标位置（scrollIntoView 动画太慢）
  const dom = view.dom;
  const lineTop = view.lineBlockAt(lineObj.from).top;
  const scrollTop = Math.max(0, lineTop - 60);
  dom.scrollTo({ top: scrollTop, behavior: "auto" });
  view.focus();
}

export function Outline() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const currentLine = useEditorStore((s) => s.cursor.line);
  const pendingJumpLine = useEditorStore((s) => s.pendingJumpLine);
  const setPendingJumpLine = useEditorStore((s) => s.setPendingJumpLine);

  const headings = useMemo(() => extractHeadings(content), [content]);
  // 点击锁定：点击标题后直接高亮，不跟随滚动过渡
  const clickedIndexRef = useRef<number | null>(null);
  const clickTimerRef = useRef(0);

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
        scroller.scrollTo({ top: 0, behavior: "auto" });
        return true;
      }

      const heads = preview.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
      const el = heads[index];
      if (!el) return false;
      const scrollerRect = scroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const target = scroller.scrollTop + (elRect.top - scrollerRect.top);
      scroller.scrollTo({ top: target, behavior: "auto" });
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

    // 点击锁定：直接高亮目标标题，不跟随滚动过渡
    clickedIndexRef.current = index;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      clickedIndexRef.current = null;
    }, 800);

    // 直接更新光标位置，确保大纲立即高亮
    useEditorStore.getState().setCursor({ line, ch: 0 });

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

  // 点击锁定时直接用点击的标题，否则根据光标位置计算
  let activeIndex = -1;
  if (clickedIndexRef.current !== null) {
    activeIndex = clickedIndexRef.current;
  } else {
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const nextSameOrHigher = headings.slice(i + 1).find((n) => n.level <= h.level);
      const sectionEnd = nextSameOrHigher ? nextSameOrHigher.line - 1 : Infinity;
      if (currentLine >= h.line && currentLine <= sectionEnd) {
        activeIndex = i;
      }
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
              "group relative flex my-0.5 cursor-pointer select-none items-center rounded-md py-[5px] pr-2",
              "hover:bg-[var(--color-bg-muted)]",
              getLevelStyle(h.level, isActive),
              isActive && "item-active",
            )}
            style={{ paddingLeft: `${(h.level - 1) * 14 + 12}px` }}
            title={`${h.text} (L${h.line})`}
          >
            <span className="truncate">{h.text}</span>
          </div>
        );
      })}
    </div>
  );
}
