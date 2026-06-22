/**
 * 可复用的拖拽调节手柄（仿 VSCode）
 *
 * - 默认透明 0 宽，只有 6px 的拖拽热区（before 伪元素）
 * - hover / 拖拽中显示 2px 主题色发光线
 * - 水平方向用 ew-resize 光标，垂直方向用 ns-resize 光标
 *
 * 用法：
 *   <ResizeHandle direction="horizontal" onMouseDown={startResize} />
 */
import { cn } from "@/lib/utils/cn";

interface ResizeHandleProps {
  /** 方向：水平（左右拖）/ 垂直（上下拖） */
  direction?: "horizontal" | "vertical";
  /** 鼠标按下时触发拖拽 */
  onMouseDown: (e: React.MouseEvent) => void;
  /** 双击回调（如重置宽度） */
  onDoubleClick?: () => void;
  /** 鼠标悬停提示 */
  title?: string;
  /** 是否正在拖拽（为 true 时强制显形发光线） */
  isDragging?: boolean;
  /** 额外类名 */
  className?: string;
}

export function ResizeHandle({
  direction = "horizontal",
  onMouseDown,
  onDoubleClick,
  title,
  isDragging = false,
  className,
}: ResizeHandleProps) {
  const isH = direction === "horizontal";
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title={title}
      className={cn(
        "group relative z-10 shrink-0 select-none before:absolute before:content-['']",
        isH
          ? "w-0 cursor-ew-resize before:inset-y-0 before:-inset-x-[3px] before:cursor-ew-resize"
          : "h-0 cursor-ns-resize before:inset-x-0 before:-inset-y-[3px] before:cursor-ns-resize",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bg-[var(--color-accent)] opacity-0 transition-all duration-150 ease-out group-hover:opacity-100 [box-shadow:0_0_4px_1px_color-mix(in_oklch,var(--color-accent)_40%,transparent)]",
          isH
            ? "left-1/2 top-0 bottom-0 w-0 -translate-x-1/2 group-hover:w-[2px]"
            : "top-1/2 left-0 right-0 h-0 -translate-y-1/2 group-hover:h-[2px]",
          isDragging && (isH ? "!w-[2px] !opacity-100" : "!h-[2px] !opacity-100"),
        )}
      />
    </div>
  );
}