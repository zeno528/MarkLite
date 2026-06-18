/**
 * 通知条容器（toast）：顶部居中浮现、非阻塞、自动消失
 * 订阅 notificationStore，垂直堆叠渲染。单条 = 类型图标 + 消息 + 关闭按钮。
 * 配色跟随 data-scheme（CSS 变量），进场动画 toast-in（150ms）。
 */
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useNotificationStore,
  type NotificationType,
} from "@/stores/notificationStore";
import { cn } from "@/lib/utils/cn";

const TYPE_CONFIG: Record<NotificationType, { icon: LucideIcon; color: string; spin?: boolean }> = {
  success: { icon: CheckCircle2, color: "var(--color-success)" },
  error: { icon: XCircle, color: "var(--color-danger)" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)" },
  info: { icon: Info, color: "var(--color-accent)" },
  loading: { icon: Loader2, color: "var(--color-accent)", spin: true },
};

export function ToastContainer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (notifications.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-[calc(var(--titlebar-height)+35px)] left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
      role="region"
      aria-label="通知"
    >
      {notifications.map((n) => {
        const { icon: Icon, color, spin } = TYPE_CONFIG[n.type];
        return (
          <div
            key={n.id}
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto flex min-w-[200px] max-w-[360px] items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2",
              "shadow-[0_6px_20px_rgba(0,0,0,0.12),0_0_10px_color-mix(in_oklch,var(--color-accent)_12%,transparent)]",
              n.leaving
                ? "animate-[toast-out_180ms_ease_forwards]"
                : "animate-[toast-in_150ms_ease-forwards]",
            )}
          >
            <Icon
              size={16}
              style={{ color }}
              className={cn("shrink-0", spin && "animate-spin")}
            />
            <span className="flex-1 text-[12.5px] leading-snug text-[var(--color-text)]">
              {n.message}
            </span>
            <button
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              onClick={() => dismiss(n.id)}
              aria-label="关闭通知"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
