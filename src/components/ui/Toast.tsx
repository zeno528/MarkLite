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
import { useUIStore } from "@/stores/uiStore";
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
  // 通知条背景与主题明暗「反相」：浅色主题用深色通知条、深色主题用浅色通知条，
  // 避免与界面同明暗而融进背景看不清。复用 uiStore 派生的 resolvedTheme（纯中性灰，8 套主题通用）。
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const toastSkin =
    resolvedTheme === "light"
      ? "bg-[oklch(0.26_0_0)] border-[oklch(0.36_0_0)] text-[oklch(0.96_0_0)]"
      : "bg-[oklch(0.97_0_0)] border-[oklch(0.88_0_0)] text-[oklch(0.2_0_0)]";

  if (notifications.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-[calc(var(--titlebar-height)+25px)] left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
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
              "pointer-events-auto flex min-w-[200px] max-w-[360px] items-center gap-2.5 rounded-full border px-4 py-2",
              toastSkin,
              "shadow-[0_4px_8px_rgba(0,0,0,0.20),0_10px_28px_rgba(0,0,0,0.22),0_0_12px_color-mix(in_oklch,var(--color-accent)_16%,transparent)]",
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
            <span className="flex-1 text-[13px] font-medium leading-snug">
              {n.message}
            </span>
            <button
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-50 transition-opacity hover:opacity-100"
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
