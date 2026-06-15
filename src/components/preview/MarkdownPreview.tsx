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
import { cn } from "@/lib/utils/cn";
import "./markdown/styles/markdown.css";

export function MarkdownPreview() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const layout = useUIStore((s) => s.layout);
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

  // 复制按钮图标（lucide: copy / check）
  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  // 给每个代码块注入复制按钮（GitHub 风格：图标，hover 显示，融入代码块）
  // 用 MutationObserver 监听 DOM 变化，保证任何情况下（渲染、切主题、shiki 重算）代码块都有按钮
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const ensureButtons = () => {
      root.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector(".copy-btn")) return;
        if (!pre.querySelector("code")) return;
        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.type = "button";
        btn.title = "复制";
        btn.setAttribute("aria-label", "复制代码");
        btn.innerHTML = COPY_ICON;
        pre.appendChild(btn);
      });
    };
    ensureButtons();

    const observer = new MutationObserver(() => ensureButtons());
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // 事件委托：容器统一处理复制按钮点击（避免 DOM 重建后监听器丢失）
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(".copy-btn") as HTMLButtonElement | null;
      if (!btn) return;
      const pre = btn.parentElement;
      const codeEl = pre?.querySelector("code");
      if (!codeEl) return;
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(codeEl.textContent ?? "");
        btn.innerHTML = CHECK_ICON;
        btn.classList.add("copied");
      } catch {
        btn.innerHTML = COPY_ICON;
      }
      window.setTimeout(() => {
        if (document.body.contains(btn)) {
          btn.innerHTML = COPY_ICON;
          btn.classList.remove("copied");
        }
      }, 1500);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

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

  // 仅预览模式用卡片包裹，双栏模式直接平铺（无卡片）
  const isCardMode = layout === "preview-only";

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-auto",
        isCardMode ? "bg-[var(--color-bg-muted)]" : "bg-[var(--color-bg-elevated)]",
      )}
    >
      <article
        className={cn(
          "markdown-body mx-auto flex flex-col px-12 py-10",
          isCardMode
            ? "my-3 min-h-[calc(100%-1.5rem)] w-[95%] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-md)]"
            : "h-full w-full",
        )}
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
