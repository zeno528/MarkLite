/**
 * Tooltip - hover/focus 提示浮层
 * - 包裹单个 children（button / link / icon）
 * - placement: top / bottom / left / right
 * - align: 水平对齐（top/bottom 时为 left/center/right；left/right 时为 top/center/bottom）
 * - className: 透传给 wrapper（用于 stretch 父容器等布局需求）
 */
import { useState, type ReactElement, type ReactNode } from "react";
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
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[100] whitespace-nowrap rounded-md",
            "bg-[var(--color-text)] px-2 py-1 text-xs text-[var(--color-bg-elevated)] shadow-md",
            placementClass,
            alignClass,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}