/**
 * Shiki 语法高亮（shiki/core 路径，bundle 不含冷门 langs）
 *
 * 用 createHighlighterCore + 显式 import 10 个常用 lang + 2 个 theme + oniguruma 引擎，
 * rollup 静态分析时只会把 10 个 lang + 2 theme 打进去；冷门 lang 按需 dynamic import。
 */
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import jsLang from "shiki/langs/javascript.mjs";
import tsLang from "shiki/langs/typescript.mjs";
import pyLang from "shiki/langs/python.mjs";
import jsonLang from "shiki/langs/json.mjs";
import bashLang from "shiki/langs/bash.mjs";
import yamlLang from "shiki/langs/yaml.mjs";
import mdLang from "shiki/langs/markdown.mjs";
import htmlLang from "shiki/langs/html.mjs";
import cssLang from "shiki/langs/css.mjs";
import sqlLang from "shiki/langs/sql.mjs";
import glTheme from "shiki/themes/github-light.mjs";
import gdTheme from "shiki/themes/github-dark.mjs";
import onigWasm from "shiki/wasm";

/** Highlighter 单例 */
let highlighterPromise: Promise<HighlighterCore> | null = null;

/** 已加载的语言名 */
const loadedLangs = new Set<string>();

/** 加载失败的语言（避免反复重试） */
const failedLangs = new Set<string>();

/** 启动时预热（main.tsx 同步触发，与 React first paint 并行） */
export async function warmupShiki(): Promise<void> {
  if (highlighterPromise) {
    await highlighterPromise;
    return;
  }
  highlighterPromise = createHighlighterCore({
    themes: [glTheme, gdTheme],
    langs: [jsLang, tsLang, pyLang, jsonLang, bashLang, yamlLang, mdLang, htmlLang, cssLang, sqlLang],
    engine: createOnigurumaEngine(onigWasm),
  });
  await highlighterPromise;
  for (const l of [jsLang, tsLang, pyLang, jsonLang, bashLang, yamlLang, mdLang, htmlLang, cssLang, sqlLang]) {
    loadedLangs.add((l as any).name || (l as any).id || "");
  }
}

/** 获取 Highlighter（懒加载兜底） */
export function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterPromise) return highlighterPromise;
  return warmupShiki().then(() => highlighterPromise!);
}

/** 语言别名表 */
const LANG_ALIASES: Record<string, string> = {
  js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python",
  sh: "bash", shell: "bash", zsh: "bash",
  yml: "yaml", md: "markdown", htm: "html",
  vue: "javascript", kt: "kotlin", rb: "ruby",
  rs: "rust", toml: "ini", dockerfile: "dockerfile",
  objc: "cpp", "objective-c": "cpp",
  "c#": "csharp", cs: "csharp",
};

/** 按需加载语言（dynamic import 拆 chunk） */
export async function loadLanguage(name: string): Promise<boolean> {
  if (loadedLangs.has(name)) return true;
  if (failedLangs.has(name)) return false;
  try {
    // @vite-ignore 模板字符串拼接的 dynamic import Vite 不能静态分析，运行时仍按需加载 shiki langs chunk
    const mod = await import(`shiki/langs/${name}.mjs` as any);
    const h = await getHighlighter();
    await h.loadLanguage(mod.default as any);
    loadedLangs.add(name);
    return true;
  } catch (e) {
    failedLangs.add(name);
    console.info(
      `[shiki] language "${name}" not available, fallback to text`,
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** 把 lang 字符串解析成 Shiki 支持的语言名（永不抛错） */
async function resolveLang(normalized: string): Promise<string> {
  if (!normalized) return "text";
  if (loadedLangs.has(normalized)) return normalized;
  const alias = LANG_ALIASES[normalized];
  const target = alias || normalized;
  if (target && loadedLangs.has(target)) return target;
  if (await loadLanguage(target)) return target;
  return "text";
}

/** 渲染代码块为 HTML 字符串 */
export async function highlightCode(
  code: string,
  lang: string,
  theme: "light" | "dark",
): Promise<string> {
  const h = await getHighlighter();
  const themeName = theme === "dark" ? "github-dark" : "github-light";
  const normalized = (lang || "").toLowerCase().trim().split(/\s+/)[0];
  const langToUse = await resolveLang(normalized);
  return h.codeToHtml(code, { lang: langToUse as any, theme: themeName });
}