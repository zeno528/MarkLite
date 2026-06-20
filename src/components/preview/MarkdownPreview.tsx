/**
 * Markdown 预览组件
 * - 异步解析 marked + Shiki
 * - 滚动同步（编辑器 ↔ 预览）
 * - 行宽限制 ~70ch 居中 + 卡片化（阅读优先排版）
 * - 跟随配色方案（resolvedTheme）
 */
import { useEffect, useRef, useState } from "react";
import { useEditorStore, previewContainerRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { parseMarkdown } from "@/lib/markdown/parser";
import { cn } from "@/lib/utils/cn";
import { lockScrollSync, isScrollSyncing } from "@/lib/utils/scrollSyncLock";
import { rebuildPreviewBlocks, syncEditorFromPreview, syncPreviewFromEditor } from "@/lib/utils/scrollSync";
import { openExternalUrl } from "@/lib/utils/openUrl";
import { PreviewTabBar } from "./PreviewTabBar";
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
    let raf = 0;
    setLoading(true);
    parseMarkdown(content, resolvedTheme, filePath)
      .then((h) => {
        if (cancelled) return;
        setHtml(h);
        setLoading(false);
        // HTML 更新后等 DOM 布局稳定：重建块缓存，并让预览对齐到编辑器当前位置（解决编辑后错位）
        raf = requestAnimationFrame(() => {
          rebuildPreviewBlocks();
          syncPreviewFromEditor();
        });
      })
      .catch((e) => {
        console.error("[preview] parse failed:", e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
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

      // 2) 链接处理
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (anchor && anchor.href) {
        e.preventDefault();
        const href = anchor.getAttribute("href") ?? "";

        // 锚点链接 → 预览内跳转
        if (href.startsWith("#")) {
          const id = decodeURIComponent(href.slice(1));
          const targetEl = document.getElementById(id);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return;
        }

        // 外部链接 → 系统默认浏览器
        openExternalUrl(href);
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  // 滚动同步：预览 → 编辑器（按预览可视顶部块的源行号，映射到编辑器对应行）
  // 锁机制：程序主动写 scrollTop 前置锁，对方的 scroll handler 检测到锁就跳过
  useEffect(() => {
    if (!scrollSync) return;
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    // settle 校正：滚动停止后二次同步，修正虚拟滚动 scrollHeight 漂移导致的底部偏差
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (isScrollSyncing()) return; // 程序触发的滚动（如编辑器同步过来的），跳过
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        syncEditorFromPreview();
        const scrollHeight = el.scrollHeight - el.clientHeight;
        const percent = scrollHeight > 0 ? el.scrollTop / scrollHeight : 0;
        setScrollPercent(percent, "preview");
      });
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (isScrollSyncing()) return;
        syncEditorFromPreview();
      }, 150);
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => {
      el.removeEventListener("scroll", handler);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [scrollSync, setScrollPercent]);

  // 仅预览模式用卡片包裹（边框 + 圆角表达卡片视觉），双栏模式直接平铺
  const isCardMode = layout === "preview-only";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-[var(--color-bg-elevated)]",
        isCardMode && "border border-[var(--color-border)]",
      )}
    >
      <PreviewTabBar />
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto"
      >
        <article
          className={cn(
            "markdown-body flex flex-col px-12 min-h-full w-full",
          )}
          style={{ paddingTop: "10px", paddingBottom: "40px" }}
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
    </div>
  );
}
