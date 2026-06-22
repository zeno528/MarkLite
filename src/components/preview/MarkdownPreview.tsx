/**
 * Markdown 预览组件
 * - 异步解析 marked + Shiki
 * - 滚动同步（编辑器 ↔ 预览）
 * - 行宽限制 ~70ch 居中 + 卡片化（阅读优先排版）
 * - 跟随配色方案（resolvedTheme）
 */
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useEditorStore, previewContainerRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { parseMarkdown } from "@/lib/markdown/parser";
import { cn } from "@/lib/utils/cn";
import { lockScrollSync, isScrollSyncing } from "@/lib/utils/scrollSyncLock";
import { rebuildPreviewBlocks, syncEditorFromPreview, syncPreviewFromEditor } from "@/lib/utils/scrollSync";
import { openExternalUrl } from "@/lib/utils/openUrl";
import { PreviewTabBar } from "./PreviewTabBar";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { join, dirname, basename } from "@tauri-apps/api/path";
import { notify } from "@/stores/notificationStore";
import "./markdown/styles/markdown.css";

/** Markdown 文件扩展名 */
const MARKDOWN_EXT = /\.(md|markdown|mdx)$/i;

/**
 * 把预览里的相对 Markdown 链接在编辑器内打开（多语言 README 互链等场景）。
 * 解析规则：以当前文件所在目录为基准，拼接 href 得到目标文件绝对路径。
 * @returns true 已处理（成功打开 / 文件不存在已提示），false 非 md 相对链接、交给外部链接逻辑
 */
async function openLinkedMarkdown(
  href: string,
  currentPath: string,
): Promise<boolean> {
  const raw = (href ?? "").trim();
  if (!raw) return false;

  // 分离锚点：README_EN.md#features → README_EN.md（锚点暂不跨文件跳转）
  const hashIdx = raw.indexOf("#");
  let pathPart = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  if (!pathPart) return false; // 纯锚点，交给锚点逻辑

  // 仅处理 markdown 文件；带协议（http://…）或绝对路径（/…）的不接手
  pathPart = decodeURIComponent(pathPart);
  if (!MARKDOWN_EXT.test(pathPart)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart) || pathPart.startsWith("/")) {
    return false;
  }

  try {
    const dir = await dirname(currentPath);
    const targetPath = await join(dir, pathPart);
    if (!(await exists(targetPath))) {
      notify.error(`找不到文件：${pathPart}`);
      return true; // 已提示，不再交给浏览器
    }
    const content = await readTextFile(targetPath);
    const name = await basename(targetPath);
    const title = name.replace(/\.(md|markdown|mdx)$/i, "");
    useEditorStore.getState().openFile(targetPath, title, content);
    return true;
  } catch (e) {
    console.error("[preview] 打开链接文件失败:", pathPart, e);
    notify.error("打开文件失败");
    return true;
  }
}

/**
 * 自定义平滑滚动（替代 scrollIntoView({behavior:"smooth"})）。
 * 浏览器原生 smooth 动画约 400-600ms 且无法调速；这里用 rAF + easeInOutCubic
 * 插值，默认 300ms，更快且时长可控。
 */
function smoothScrollTo(
  container: HTMLElement,
  target: HTMLElement,
  duration = 300,
) {
  const containerTop = container.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const offset = targetTop - containerTop + container.scrollTop;
  const start = container.scrollTop;
  const delta = offset - start;
  if (Math.abs(delta) < 1) return;

  const startTime = performance.now();
  // easeInOutCubic：起步和收尾缓，中段快
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    container.scrollTop = start + delta * ease(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 复制按钮图标（模块级常量，避免每次 render 重建）
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
export function MarkdownPreview() {
  const content = useEditorStore((s) => s.currentFile?.content ?? "");
  // useDeferredValue：输入期间预览用旧值渲染（不阻塞输入），停顿后 React 后台用新值重解析（自适应，无固定延迟）——官方推荐替代防抖
  const deferredContent = useDeferredValue(content);
  const filePath = useEditorStore((s) => s.currentFile?.path);
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
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

  // 切换文档时预览滚动归零（同实例下切换文件，scrollTop 会残留）。
  // 但「同文件的模式切换」要保留阅读进度——此时 scrollPercentPath === filePath，
  // 跳过归零，交给下方解析 effect 按 scrollPercent 恢复。
  // rAF 推迟一帧等 HTML 解析；lockScrollSync 防止归零被同步 handler 当用户滚动联动编辑器。
  const lastPathRef = useRef<string | undefined>(undefined);
  // 挂载后首次解析标志：用于区分「模式切换重建 → 恢复进度」与「同文件编辑 → 跟随编辑器」
  const isFirstParseRef = useRef(true);
  useEffect(() => {
    if (lastPathRef.current === filePath) return;
    lastPathRef.current = filePath;
    const { scrollPercent, scrollPercentPath } = useEditorStore.getState();
    // 同文件模式切换：不归零，解析 effect 里恢复阅读进度
    if (scrollPercentPath === filePath && scrollPercent > 0) return;
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      lockScrollSync();
      el.scrollTop = 0;
    });
  }, [filePath]);

  // 解析 Markdown → HTML（用 deferredContent：输入期间 React 用旧值渲染不阻塞，停顿后后台重解析，自适应无固定延迟）
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    setLoading(true);
    parseMarkdown(deferredContent, resolvedTheme, filePath)
      .then((h) => {
        if (cancelled) return;
        setHtml(h);
        setLoading(false);
        // HTML 更新后等 DOM 布局稳定再做位置处理
        raf = requestAnimationFrame(() => {
          rebuildPreviewBlocks();
          const el = containerRef.current;
          if (!el) {
            isFirstParseRef.current = false;
            return;
          }
          const { scrollPercent, scrollPercentPath } = useEditorStore.getState();
          // 挂载后首次解析 + 同文件模式切换 → 按阅读进度恢复滚动位置
          // 其余情况（编辑、配色切换、换文件后的解析）→ 对齐编辑器当前位置（解决编辑后错位）
          if (
            isFirstParseRef.current &&
            scrollPercentPath === filePath &&
            scrollPercent > 0
          ) {
            const max = el.scrollHeight - el.clientHeight;
            if (max > 0) {
              lockScrollSync();
              el.scrollTop = max * scrollPercent;
            }
          } else {
            syncPreviewFromEditor();
          }
          isFirstParseRef.current = false;
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
  }, [deferredContent, resolvedTheme, filePath]);

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

        // 锚点链接 → 预览内跳转（自定义平滑滚动，比浏览器原生更快可控）
        if (href.startsWith("#")) {
          const id = decodeURIComponent(href.slice(1));
          const targetEl = document.getElementById(id);
          if (targetEl) {
            smoothScrollTo(root, targetEl);
          }
          return;
        }

        // 相对路径 Markdown 文件链接 → 在编辑器内打开（多语言 README 互链等）
        const currentPath = useEditorStore.getState().currentFile?.path;
        if (currentPath && (await openLinkedMarkdown(href, currentPath))) {
          return;
        }

        // 其余外部链接 → 系统默认浏览器
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

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-[var(--color-bg-elevated)]",
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
