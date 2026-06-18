/**
 * 回到顶部悬浮按钮（仅阅读模式）
 * - 滚动超过 300px 后显示
 * - 点击后滚动到顶部
 * - 固定在右下角
 */
import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { previewContainerRef } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export function ScrollToTop() {
  const layout = useUIStore((s) => s.layout);
  const [visible, setVisible] = useState(false);

  // 仅阅读模式下监听滚动
  useEffect(() => {
    if (layout !== "preview-only") {
      setVisible(false);
      return;
    }

    const container = previewContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setVisible(container.scrollTop > 300);
    };

    container.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => container.removeEventListener("scroll", checkScroll);
  }, [layout]);

  // 非阅读模式不渲染
  if (layout !== "preview-only") return null;

  const handleClick = () => {
    const container = previewContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "auto" });
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
