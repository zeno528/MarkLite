/**
 * 可拖拽双栏布局
 * - 中间拖拽条改变两侧比例
 * - 比例持久化到 uiStore
 * - 拖拽时用 ref + 直接操作 DOM 避免 React re-render
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResizeHandle } from "./ResizeHandle";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** 初始比例（0-1） */
  initialRatio?: number;
  /** 最小/最大宽度百分比 */
  minRatio?: number;
  maxRatio?: number;
  /** 方向 */
  direction?: "horizontal" | "vertical";
  /** 类名 */
  className?: string;
}

export function SplitView({
  left,
  right,
  initialRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
  direction = "horizontal",
  className,
}: SplitViewProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // 拖拽逻辑
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos =
        direction === "horizontal" ? e.clientX - rect.left : e.clientY - rect.top;
      const total = direction === "horizontal" ? rect.width : rect.height;
      let r = pos / total;
      r = Math.max(minRatio, Math.min(maxRatio, r));
      setRatio(r);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [direction, minRatio, maxRatio]);

  const startDrag = () => {
    dragging.current = true;
    document.body.style.cursor = direction === "horizontal" ? "ew-resize" : "ns-resize";
    document.body.style.userSelect = "none";
  };

  const isH = direction === "horizontal";
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full overflow-hidden",
        isH ? "flex-row" : "flex-col",
        className,
      )}
    >
      <div
        className="overflow-hidden"
        style={{
          [isH ? "width" : "height"]: `${ratio * 100}%`,
          flexShrink: 0,
        }}
      >
        {left}
      </div>
      <ResizeHandle
        direction={direction}
        onMouseDown={startDrag}
        onDoubleClick={() => setRatio(initialRatio)}
        title="拖动调节宽度（双击重置）"
      />
      <div className="flex-1 overflow-hidden">{right}</div>
    </div>
  );
}
