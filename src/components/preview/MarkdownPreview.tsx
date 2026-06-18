/**
 * Markdown 预览组件
 * - 异步解析 marked + Shiki
 * - 滚动同步（编辑器 ↔ 预览）
 * - 行宽限制 ~70ch 居中 + 卡片化（阅读优先排版）
 * - 跟随配色方案（resolvedTheme）
 */
import { useEffect, useRef, useState } from "react";
import { useEditorStore, previewContainerRef, editorViewRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { parseMarkdown } from "@/lib/markdown/parser";
import { cn } from "@/lib/utils/cn";
import { lockScrollSync, isScrollSyncing } from "@/lib/utils/scrollSyncLock";
import { openExternalUrl } from "@/lib/utils/openUrl";
import "./markdown/styles/markdown.css";

// 复制按钮图标（模块级常量，避免每次 render 重建）
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

export function MarkdownPreview() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  const filePath = useEditorStore((s) => s.currentFile?.path);
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const layout = useUIStore((s) => s.layout);
  const scrollSync = useSettingsStore((s) => s.scrollSync);
  const setScrollPercent = useEditorStore((s) => s.setScrollPercent);

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 把滚动容器暴露到共享 ref，让编辑器滚动 handler 直接写（绕过 React 中转，消除 2~3 帧延迟）
  useEffect(() => {
    previewContainerRef.current = containerRef.current;
    return () => {
      if (previewContainerRef.current === containerRef.current) {
        previewContainerRef.current = null;
      }
    };
  }, []);

  // 切换文档时预览滚动归零（预览只挂载一次、容器复用，scrollTop 会残留）。
  // rAF 推迟一帧等 HTML 解析；lockScrollSync 防止归零被同步 handler 当用户滚动联动编辑器。
  const lastPathRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastPathRef.current === filePath) return;
    lastPathRef.current = filePath;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      lockScrollSync();
      el.scrollTop = 0;
    });
  }, [filePath]);

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

  // 给每个代码块注入复制按钮（GitHub 风格：图标，hover 显示，融入代码块）
  // MutationObserver 监听 childList（不含 subtree，避免滚动时 content-visibility 重排触发高频回调）
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let raf = 0;
    const ensureButtons = () => {
      // 只遍历直接子树里的 pre（markdown-body 的直接子元素）
      const inner = root.querySelector(".markdown-body");
      if (!inner) return;
      inner.querySelectorAll("pre").forEach((pre) => {
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
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        ensureButtons();
      });
    };
    ensureButtons();

    const observer = new MutationObserver(schedule);
    // subtree:true 必需（shiki 替换 pre 内容在深层），但用 rAF 合并避免高频
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 事件委托：容器统一处理复制按钮点击（避免 DOM 重建后监听器丢失）
  // 同时拦截 <a> 链接点击 → 系统默认浏览器（避免 WebView 内导航）
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1) 复制按钮
      const btn = target.closest(".copy-btn") as HTMLButtonElement | null;
      if (btn) {
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
        return;
      }

      // 2) 外部链接 → 系统默认浏览器
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (anchor && anchor.href) {
        e.preventDefault();
        openExternalUrl(anchor.getAttribute("href"));
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  // 滚动同步：预览 → 编辑器（直接写编辑器 scrollTop，绕过 React 中转，1 帧延迟）
  // 锁机制：程序主动写 scrollTop 前置锁，对方的 scroll handler 检测到锁就跳过
  useEffect(() => {
    if (!scrollSync) return;
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const handler = () => {
      if (isScrollSyncing()) return; // 程序触发的滚动（如编辑器同步过来的），跳过
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        const percent = scrollHeight > 0 ? el.scrollTop / scrollHeight : 0;

        // 直接写编辑器 scrollTop
        const view = editorViewRef.current;
        if (view) {
          const dom = view.scrollDOM;
          const editorHeight = dom.scrollHeight - dom.clientHeight;
          if (editorHeight > 0) {
            lockScrollSync();
            dom.scrollTop = editorHeight * percent;
          }
        }

        setScrollPercent(percent, "preview");
      });
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollSync, setScrollPercent]);

  // 仅预览模式用卡片包裹（占满主区域宽度，圆角/边框/阴影表达卡片视觉）。
  // 上下 my-3 留出与 TopBar / StatusBar 的间距（与主侧栏卡片的"四周 12px 留白"视觉一致）。
  // root 容器底色用 var(--color-bg)：跟主侧栏 aside 的 padding 处底色一致（都继承 body）。
  // 双栏模式直接平铺（无卡片）
  const isCardMode = layout === "preview-only";

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-auto",
        isCardMode ? "bg-[var(--color-bg)]" : "bg-[var(--color-bg-elevated)]",
      )}
    >
      <article
        className={cn(
          "markdown-body flex flex-col px-12 py-10",
          isCardMode
            ? "min-h-full w-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
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
