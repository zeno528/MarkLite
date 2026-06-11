/**
 * Shiki 单例 + 启动后预热
 *
 * 设计要点：
 * 1. 单例模式 - 全应用共享一个 highlighter 实例，避免重复初始化（WASM 加载很贵）
 * 2. 预热 5 个最常用语言 - 启动后空闲时加载，覆盖 80% 场景
 * 3. 其他语言按需懒加载 - highlighter.loadLanguage()
 * 4. 主题动态切换 - light/dark 主题同时加载
 */
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
  type BundledTheme,
} from "shiki";

/** 预热语言（最常用的 5 个） */
const WARMUP_LANGS: BundledLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "json",
  "bash",
];

/** 预热主题（亮 + 暗） */
const WARMUP_THEMES: BundledTheme[] = ["github-light", "github-dark"];

/** Highlighter 单例 */
let highlighterPromise: Promise<Highlighter> | null = null;

/** 已加载的语言（用于按需懒加载） */
const loadedLangs = new Set<BundledLanguage>(WARMUP_LANGS);

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

/** 按需加载语言 */
export async function loadLanguage(lang: BundledLanguage): Promise<void> {
  if (loadedLangs.has(lang)) return;
  const h = await getHighlighter();
  await h.loadLanguage(lang);
  loadedLangs.add(lang);
}

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

  // 尝试匹配语言
  const normalized = (lang || "").toLowerCase().trim();
  const supported = h.getLoadedLanguages();
  let langToUse: string | null = null;
  if (normalized && supported.includes(normalized as BundledLanguage)) {
    langToUse = normalized;
  } else if (normalized) {
    // 尝试常见别名
    const aliases: Record<string, BundledLanguage> = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      yml: "yaml",
      md: "markdown",
    };
    const alias = aliases[normalized];
    if (alias) {
      if (!loadedLangs.has(alias)) {
        await loadLanguage(alias);
      }
      langToUse = alias;
    }
  }

  return h.codeToHtml(code, {
    lang: (langToUse ?? "text") as BundledLanguage,
    theme: themeName,
  });
}
