/**
 * 自定义确认对话框状态管理
 * 替代系统原生 confirm/ask，Promise 式调用：const ok = await confirm(...)
 */
import { create } from "zustand";

interface ConfirmOptions {
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // 确认按钮用红色（破坏性操作）
}

interface ConfirmState {
  /** 当前显示的对话框选项，null = 关闭 */
  options: ConfirmOptions | null;
  /** Promise resolve 回调（由 show 设置，由用户点击触发） */
  resolve: ((value: boolean) => void) | null;
  /** 显示确认对话框，返回用户选择 */
  show: (opts: ConfirmOptions) => Promise<boolean>;
  /** 用户点击确认 */
  confirm: () => void;
  /** 用户点击取消 / 关闭 */
  cancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,

  show: (opts) =>
    new Promise<boolean>((resolve) => {
      set({ options: opts, resolve });
    }),

  confirm: () => {
    const { resolve } = get();
    resolve?.(true);
    set({ options: null, resolve: null });
  },

  cancel: () => {
    const { resolve } = get();
    resolve?.(false);
    set({ options: null, resolve: null });
  },
}));

/** 便捷 API：非 React 上下文直接调用 */
export async function customConfirm(
  message: string,
  title = "MarkLite",
  okLabel = "确定",
  cancelLabel = "取消",
  danger = false,
): Promise<boolean> {
  return useConfirmStore.getState().show({ title, message, okLabel, cancelLabel, danger });
}
