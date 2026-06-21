/**
 * Tooltip - hover/focus 提示浮层
 * - 包裹单个 children（button / link / icon）
 * - placement: top / bottom / left / right
 * - align: 水平对齐（top/bottom 时为 left/center/right；left/right 时为 top/center/bottom）
 * - className: 透传给 wrapper（用于 stretch 父容器等布局需求）
 */
import { useState, useRef, useCallback, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Placement = "top" | "bottom" | "left" | "right";
type Align = "left" | "center" | "right";

interface TooltipProps {
  content: ReactNode;
  placement?: Placement;
  align?: Align;
  className?: string;
  children: ReactElement;
}

export function Tooltip({
  content,
  placement = "top",
  align = "center",
  className,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(0);

  const show = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // 延一帧隐藏：处理快速移入相邻按钮时 mouseLeave/Enter 事件顺序问题
    rafRef.current = requestAnimationFrame(() => setVisible(false));
  }, []);

  // 浮层位置：placement 决定锚边，align 决定侧位
  const placementClass = {
    top: "bottom-full mb-1.5",
    bottom: "top-full mt-1.5",
    left: "right-full mr-1.5",
    right: "left-full ml-1.5",
  }[placement];

  const alignClass = {
    left: placement === "top" || placement === "bottom" ? "left-0" : "top-0",
    right: placement === "top" || placement === "bottom" ? "right-0" : "bottom-0",
    center:
      placement === "top" || placement === "bottom"
        ? "left-1/2 -translate-x-1/2"
        : "top-1/2 -translate-y-1/2",
  }[align];

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[100] whitespace-nowrap rounded-md",
          "bg-[var(--color-text)] px-2 py-1 text-xs text-[var(--color-bg-elevated)] shadow-md",
          "transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
          placementClass,
          alignClass,
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {content}
      </span>
    </span>
  );
}
