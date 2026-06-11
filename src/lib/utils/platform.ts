/**
 * 跨平台判断工具
 * 区分 macOS / Windows / Linux，用于快捷键、UI 差异处理
 */
import { platform as tauriPlatform } from "@tauri-apps/plugin-os";

export type Platform = "macos" | "windows" | "linux" | "other";

/** 同步获取平台（带 fallback） */
export function getPlatformSync(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "other";
}

/** 异步获取平台（用 Tauri API，更准确） */
export async function getPlatform(): Promise<Platform> {
  try {
    const p = (await tauriPlatform()) as string;
    if (p === "darwin") return "macos";
    if (p === "windows") return "windows";
    if (p === "linux") return "linux";
    return "other";
  } catch {
    return getPlatformSync();
  }
}

/** 是否是 macOS */
export async function isMac(): Promise<boolean> {
  return (await getPlatform()) === "macos";
}

/** 主修饰键：macOS = Cmd，其他 = Ctrl */
export async function getModKey(): Promise<"Cmd" | "Ctrl"> {
  return (await isMac()) ? "Cmd" : "Ctrl";
}

/** CodeMirror 修饰键前缀：macOS = "Mod-"，其他 = "Ctrl-" */
export async function getCmMod(): Promise<string> {
  return (await isMac()) ? "Mod-" : "Ctrl-";
}

/** 滚动同步 throttle 延迟：macOS WKWebView 60fps，Windows WebView2 30fps */
export async function getScrollThrottle(): Promise<number> {
  return (await isMac()) ? 16 : 32;
}
