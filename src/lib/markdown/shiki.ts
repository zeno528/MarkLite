/**
 * Shiki 单例 + 启动后预热
 *
 * 设计要点：
 * 1. 单例模式 - 全应用共享一个 highlighter 实例，避免重复初始化（WASM 加载很贵）
 * 2. 预热 10 个最常用语言 - 启动后空闲时加载，覆盖 95% 场景
 * 3. 其他语言按需懒加载 - highlighter.loadLanguage()，失败静默回退到 text
 * 4. 主题动态切换 - light/dark 主题同时加载
 * 5. 别名表 - 支持 js/ts/py/sh/md/yml/yml 等常见简写
 */
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
  type BundledTheme,
} from "shiki";

/** 预热语言（最常用的 10 个，含 OpenCode 文档高频用法） */
const WARMUP_LANGS: BundledLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "json",
  "bash",
  "yaml",
  "markdown",
  "html",
  "css",
  "sql",
];

/** 预热主题（亮 + 暗） */
const WARMUP_THEMES: BundledTheme[] = ["github-light", "github-dark"];

/** Highlighter 单例 */
let highlighterPromise: Promise<Highlighter> | null = null;

/** 已加载的语言（用于按需懒加载） */
const loadedLangs = new Set<BundledLanguage>(WARMUP_LANGS);

/** 加载失败的语言（避免反复重试） */
const failedLangs = new Set<string>();

/** 预热状态 */
let warmupStarted = false;
let warmupPromise: Promise<void> | null = null;

/** 启动后预热（在 requestIdleCallback 中调用） */
export function warmupShiki(): Promise<void> {
  if (warmupPromise) return warmupPromise;
  if (warmupStarted) return Promise.resolve();
  warmupStarted = true;

  warmupPromise = createHighlighter({
    themes: WARMUP_THEMES,
    langs: WARMUP_LANGS,
  }).then((h) => {
    highlighterPromise = Promise.resolve(h);
  });

  return warmupPromise;
}

/** 获取 Highlighter（懒加载兜底） */
export function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise) return highlighterPromise;
  if (warmupPromise) {
    return warmupPromise.then(() => highlighterPromise!);
  }
  // 兜底：未预热就同步请求
  highlighterPromise = createHighlighter({
    themes: WARMUP_THEMES,
    langs: WARMUP_LANGS,
  });
  return highlighterPromise;
}

/**
 * 按需加载语言
 * 失败时记录到 failedLangs 避免反复重试，调用方应据此回退到 text
 * @returns true 加载成功（或已加载），false 加载失败
 */
export async function loadLanguage(lang: BundledLanguage): Promise<boolean> {
  if (loadedLangs.has(lang)) return true;
  if (failedLangs.has(lang)) return false;
  try {
    const h = await getHighlighter();
    await h.loadLanguage(lang);
    loadedLangs.add(lang);
    return true;
  } catch (e) {
    // 语言不支持 / 加载失败 → 记录失败集合，避免下次重试浪费 wasm 加载
    failedLangs.add(lang);
    console.info(
      `[shiki] language "${lang}" not available, fallback to text`,
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** 语言别名表（OpenCode 文档常见简写） */
const LANG_ALIASES: Record<string, BundledLanguage> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  htm: "html",
  vue: "javascript",
  kt: "kotlin",
  rb: "ruby",
  rs: "rust",
  toml: "ini",
  dockerfile: "dockerfile",
  objc: "cpp",
  "objective-c": "cpp",
  "c#": "csharp",
  cs: "csharp",
};

/**
 * 渲染代码块为 HTML 字符串
 * @param code 源码
 * @param lang 语言标识（如 'typescript'，未识别时 fallback 到 'text'）
 * @param theme 主题：'light' | 'dark'
 */
export async function highlightCode(
  code: string,
  lang: string,
  theme: "light" | "dark",
): Promise<string> {
  const h = await getHighlighter();
  const themeName = theme === "dark" ? "github-dark" : "github-light";

  // 解析 lang → 标准 BundledLanguage
  const normalized = (lang || "").toLowerCase().trim();
  const langToUse = await resolveLang(normalized, h);

  return h.codeToHtml(code, {
    lang: langToUse as BundledLanguage,
    theme: themeName,
  });
}

/**
 * 把用户写的 lang 字符串解析成 Shiki 支持的 BundledLanguage。
 * 解析失败时回退到 "text"（永不抛错），调用方拿到的永远是合法 lang。
 */
async function resolveLang(
  normalized: string,
  h: Highlighter,
): Promise<string> {
  if (!normalized) return "text";
  const supported = h.getLoadedLanguages();

  // 1) 直接命中已加载的语言
  if (supported.includes(normalized as BundledLanguage)) {
    return normalized as BundledLanguage;
  }

  // 2) 查别名表 → 尝试按需加载
  const alias = LANG_ALIASES[normalized];
  if (alias) {
    if (!loadedLangs.has(alias) && !failedLangs.has(alias)) {
      await loadLanguage(alias);
    }
    if (loadedLangs.has(alias)) return alias;
    return "text";
  }

  // 3) 原值不在别名表里、也不在已加载里 → 尝试按需加载
  if (!loadedLangs.has(normalized as BundledLanguage) && !failedLangs.has(normalized)) {
    const ok = await loadLanguage(normalized as BundledLanguage);
    if (ok) return normalized as BundledLanguage;
  }

  // 4) 兜底
  return "text";
}
