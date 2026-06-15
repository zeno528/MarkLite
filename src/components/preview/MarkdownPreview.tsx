/**
 * Markdown 预览组件
 * - 异步解析 marked + Shiki
 * - 滚动同步（编辑器 ↔ 预览）
 * - 行宽限制 ~70ch 居中 + 卡片化（阅读优先排版）
 * - 跟随配色方案（resolvedTheme）
 */
import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { parseMarkdown } from "@/lib/markdown/parser";
import "./markdown/styles/markdown.css";

export function MarkdownPreview() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const scrollPercent = useEditorStore((s) => s.scrollPercent);
  const scrollSource = useEditorStore((s) => s.scrollSource);
  const setScrollPercent = useEditorStore((s) => s.setScrollPercent);

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析 Markdown → HTML
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    parseMarkdown(content, resolvedTheme)
      .then((h) => {
        if (!cancelled) {
          setHtml(h);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error("[preview] parse failed:", e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [content, resolvedTheme]);

  // 滚动同步：编辑器 → 预览（仅响应编辑器发起的滚动）
  useEffect(() => {
    if (!scrollSync || scrollSource !== "editor") return;
    const el = containerRef.current;
    if (!el) return;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      el.scrollTop = scrollHeight * scrollPercent;
    }
  }, [scrollPercent, scrollSource, scrollSync, html]);

  // 滚动同步：预览 → 编辑器（监听预览区滚动）
  useEffect(() => {
    if (!scrollSync) return;
    const el = containerRef.current;
    if (!el) return;

    const handler = () => {
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const percent = scrollHeight > 0 ? el.scrollTop / scrollHeight : 0;
      setScrollPercent(percent, "preview");
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollSync, setScrollPercent, html]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto bg-[var(--color-bg-muted)]">
      <article
        className="markdown-body mx-auto my-3 flex min-h-[calc(100%-1.5rem)] w-[95%] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-12 py-10 shadow-[var(--shadow-md)]"
      >
        {loading && !html ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-subtle)]">
            渲染中...
          </div>
        ) : html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-subtle)]">
            预览将在这里显示
          </div>
        )}
      </article>
    </div>
  );
}
