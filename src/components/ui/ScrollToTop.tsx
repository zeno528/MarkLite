/**
 * 回到顶部悬浮按钮
 * - 滚动超过 300px 后显示
 * - 点击后滚动到顶部
 * - 固定在右下角
 */
import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { editorViewRef, previewContainerRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export function ScrollToTop() {
  const layout = useUIStore((s) => s.layout);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (layout === "preview-only") {
        const container = previewContainerRef.current;
        if (container) {
          setVisible(container.scrollTop > 300);
        }
      } else {
        const view = editorViewRef.current;
        if (view) {
          setVisible(view.scrollDOM.scrollTop > 300);
        }
      }
    };

    // 监听滚动事件
    const editorView = editorViewRef.current;
    const previewContainer = previewContainerRef.current;

    if (layout === "preview-only" && previewContainer) {
      previewContainer.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => previewContainer.removeEventListener("scroll", checkScroll);
    } else if (editorView) {
      editorView.scrollDOM.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => editorView.scrollDOM.removeEventListener("scroll", checkScroll);
    }
  }, [layout]);

  const handleClick = () => {
    if (layout === "preview-only") {
      const container = previewContainerRef.current;
      if (container) {
        container.scrollTo({ top: 0, behavior: "auto" });
      }
    } else {
      const view = editorViewRef.current;
      if (view) {
        view.scrollDOM.scrollTo({ top: 0, behavior: "auto" });
        view.focus();
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-16 right-4 z-40 flex h-8 w-8 items-center justify-center rounded-full",
        "bg-[var(--color-bg-elevated)] border border-[var(--color-border)] shadow-md",
        "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      title="回到顶部"
      aria-label="回到顶部"
    >
      <ArrowUp size={16} />
    </button>
  );
}
