/**
 * 自定义确认对话框状态管理
 * 替代系统原生 confirm/ask，Promise 式调用：const result = await confirm(...)
 * 支持两按钮（confirm/cancel）和可选第三按钮（discard，破坏性，如"不保存"）
 */
import { create } from "zustand";

/** 确认对话框返回结果 */
export type ConfirmResult = "confirm" | "cancel" | "discard";

interface ConfirmOptions {
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  /** 可选第三按钮文案（破坏性，如"不保存"）；不传则只显示 confirm/cancel 两按钮 */
  discardLabel?: string;
  danger?: boolean; // 确认按钮用红色（破坏性操作）
}

interface ConfirmState {
  /** 当前显示的对话框选项，null = 关闭 */
  options: ConfirmOptions | null;
  /** Promise resolve 回调（由 show 设置，由用户点击触发） */
  resolve: ((value: ConfirmResult) => void) | null;
  /** 显示确认对话框，返回用户选择 */
  show: (opts: ConfirmOptions) => Promise<ConfirmResult>;
  /** 用户点击确认 */
  confirm: () => void;
  /** 用户点击取消 / 关闭 */
  cancel: () => void;
  /** 用户点击第三按钮（discard，破坏性） */
  discard: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,

  show: (opts) =>
    new Promise<ConfirmResult>((resolve) => {
      set({ options: opts, resolve });
    }),

  confirm: () => {
    const { resolve } = get();
    resolve?.("confirm");
    set({ options: null, resolve: null });
  },

  cancel: () => {
    const { resolve } = get();
    resolve?.("cancel");
    set({ options: null, resolve: null });
  },

  discard: () => {
    const { resolve } = get();
    resolve?.("discard");
    set({ options: null, resolve: null });
  },
}));

/** 便捷 API：非 React 上下文直接调用（两按钮场景） */
export async function customConfirm(
  message: string,
  title = "MarkLite",
  okLabel = "确定",
  cancelLabel = "取消",
  danger = false,
): Promise<ConfirmResult> {
  return useConfirmStore.getState().show({ title, message, okLabel, cancelLabel, danger });
}
