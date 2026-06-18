/**
 * 通知（toast）状态：右下角浮现、非阻塞、自动消失的操作反馈条
 * 纯内存（不持久化），仿 editorStore。自动消失的 timer 用模块级 Map 管理，
 * 不进响应式 state（仿 editorViewRef），避免每次 push 触发无谓重渲染。
 * 供 UI（ToastContainer）订阅，也供非 React 上下文（appShortcuts 等）通过 notify.xxx 调用。
 */
import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  /** 退出动画标记：dismiss 后置 true 触发淡出，180ms 后真正移除 */
  leaving?: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  notify: (message: string, type?: NotificationType, duration?: number) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** 自增 id（确定性、最轻，不依赖 Math.random/Date.now） */
let seq = 0;
/** 自动消失 timer（非响应式外部存储，不进 state） */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** 默认停留时长：error 更久（5s）便于看清 + 可手动关，其余 3s */
const DEFAULT_DURATION: Record<NotificationType, number> = {
  success: 3000,
  error: 5000,
  warning: 3000,
  info: 3000,
};

/** 同时显示上限：超出移除最旧的（含清其 timer），避免堆积 */
const MAX_VISIBLE = 4;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  notify: (message, type = "info", duration) => {
    const id = String(++seq);
    const wait = duration ?? DEFAULT_DURATION[type];

    set((state) => {
      const next = [...state.notifications, { id, message, type }];
      while (next.length > MAX_VISIBLE) {
        const oldest = next.shift()!;
        const t = timers.get(oldest.id);
        if (t) {
          clearTimeout(t);
          timers.delete(oldest.id);
        }
      }
      return { notifications: next };
    });

    // 排程自动消失
    const timer = setTimeout(() => get().dismiss(id), wait);
    timers.set(id, timer);
  },

  dismiss: (id) => {
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
    // 先标记 leaving 触发淡出动画，180ms（= toast-out 时长）后真正移除
    const cur = get().notifications.find((n) => n.id === id);
    if (!cur || cur.leaving) return;
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, leaving: true } : n,
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 180);
  },

  clear: () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    set({ notifications: [] });
  },
}));

/** 便捷 API：非 React 上下文直接调用，如 notify.success("已保存") */
export const notify = {
  success: (m: string) => useNotificationStore.getState().notify(m, "success"),
  error: (m: string) => useNotificationStore.getState().notify(m, "error"),
  warning: (m: string) => useNotificationStore.getState().notify(m, "warning"),
  info: (m: string) => useNotificationStore.getState().notify(m, "info"),
};
