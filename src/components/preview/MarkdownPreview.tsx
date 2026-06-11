/**
 * Markdown 预览组件
 * - 异步解析 marked + Shiki
 * - 滚动同步（编辑器 → 预览）
 * - 跟随主题（亮/暗）
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
      el.scrollTop = scrollPercent * scrollHeight;
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
    <div
      ref={containerRef}
      className="markdown-body h-full w-full overflow-auto px-8 py-6"
    >
      {loading && !html ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-subtle)]">
          渲染中...
        </div>
      ) : html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-subtle)]">
          预览将在这里显示
        </div>
      )}
    </div>
  );
}
