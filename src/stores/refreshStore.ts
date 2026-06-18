/**
 * 全局刷新状态（供 StatusBar 图标旋转 + 自动刷新轮询共享）
 */
import { create } from "zustand";

interface RefreshState {
  /** 是否正在刷新（图标旋转状态） */
  reloading: boolean;
  /** 设置刷新状态 */
  setReloading: (v: boolean) => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  reloading: false,
  setReloading: (v) => set({ reloading: v }),
}));
