/**
 * 外部链接安全打开工具
 *
 * 作用：
 * - 调用系统默认浏览器打开 http/https/mailto 链接
 * - 过滤内部链接（锚点 / 相对路径 / 危险协议）
 * - Tauri 2 WebView 默认拦截 window.open，必须走原生插件
 *
 * 设计：
 * - 不做协议白名单以外的尝试（fail-closed）
 * - 静默失败 + console 警告，不打断用户
 */
import { openUrl } from "@tauri-apps/plugin-opener";

/** 允许的协议（不区分大小写） */
const SAFE_PROTOCOLS = /^(https?|mailto):/i;

/**
 * 在系统默认浏览器中打开 URL
 * @param url 链接
 * @returns 是否成功打开（false = 被过滤 / 失败 / 不在白名单）
 */
export async function openExternalUrl(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // 内部链接：锚点 / 绝对路径 / 相对路径 → 不处理（属于页面内导航）
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return false;
  }

  // 协议白名单校验
  if (!SAFE_PROTOCOLS.test(trimmed)) {
    console.warn("[openUrl] 拒绝非安全协议:", trimmed);
    return false;
  }

  try {
    await openUrl(trimmed);
    return true;
  } catch (e) {
    console.error("[openUrl] 打开失败:", trimmed, e);
    return false;
  }
}
