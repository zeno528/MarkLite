/**
 * 窗口工具
 */
import { getCurrentWindow } from "@tauri-apps/api/window";

export function getMainWindow() {
  if (typeof window === "undefined" || !(window as any).__TAURI_INTERNALS__) {
    return null;
  }
  try {
    return getCurrentWindow();
  } catch (e) {
    console.error("[window] getCurrentWindow failed:", e);
    return null;
  }
}
