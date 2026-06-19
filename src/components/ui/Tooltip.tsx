/**
 * 自定义 Tooltip 组件
 * - 替代原生 title 属性
 * - 延迟显示（300ms）
 * - 支持四个方向：top / bottom / left / right
 * - 自动适应边界
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** 显示方向，默认 top */
  placement?: TooltipPlacement;
  /** 水平对齐，默认 center */
  align?: "center" | "left";
}

export function Tooltip({ content, children, className, delay = 300, placement = "top", align = "center" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timerRef = useRef(0);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = 8;

    let x = 0;
    let y = 0;

    switch (placement) {
      case "top":
        x = align === "left" ? rect.left : rect.left + rect.width / 2;
        y = rect.top - offset;
        break;
      case "bottom":
        x = align === "left" ? rect.left : rect.left + rect.width / 2;
        y = rect.bottom + offset;
        break;
      case "left":
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
    }

    setPosition({ x, y });
    timerRef.current = window.setTimeout(() => setVisible(true), delay);
  }, [delay, placement]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const getTransform = () => {
    switch (placement) {
      case "top":
        return align === "left" ? "translate(0, -100%)" : "translate(-50%, -100%)";
      case "bottom":
        return align === "left" ? "translate(0, 0)" : "translate(-50%, 0)";
      case "left":
        return "translate(-100%, -50%)";
      case "right":
        return "translate(0, -50%)";
    }
  };

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div
          className="pointer-events-none fixed z-[100] rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text)] shadow-md whitespace-nowrap"
          style={{
            left: position.x,
            top: position.y,
            transform: getTransform(),
          }}
        >
          {content}
          {align === "left" && placement === "top" && (
            <div
              className="absolute -bottom-[3px] left-2 h-[6px] w-[6px] rotate-45 border-b border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
            />
          )}
        </div>
      )}
    </div>
  );
}
