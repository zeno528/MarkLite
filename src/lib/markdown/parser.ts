/**
 * Markdown 解析器
 *
 * 流程：
 * 1. marked.parse() 同步解析为 HTML（< 10ms）
 * 2. 异步用 Shiki 替换代码块（首次 200-500ms，缓存后 < 5ms）
 * 3. DOMPurify 净化 XSS
 *
 * 同步解析 + 异步增强 + 同步净化 → 整体 < 50ms（首次 < 300ms）
 */
import { Marked } from "marked";
import DOMPurify from "dompurify";
import { highlightCode } from "./shiki";

/** 代码块占位符自增 id（每次解析重新计数） */
let nextCodeId = 0;

/**
 * 解析 Markdown → 安全的 HTML
 * @param md Markdown 源文
 * @param theme 主题：'light' | 'dark'
 */
export async function parseMarkdown(
  md: string,
  theme: "light" | "dark",
): Promise<string> {
  if (!md.trim()) return "";
  nextCodeId = 0; // 每次解析重置占位符 id

  // === 阶段 1：marked 解析 ===
  const syncMarked = new Marked({
    gfm: true,
    breaks: false,
  });

  // 自定义代码渲染器：输出带唯一 id 的占位符，供 enhanceCodeBlocks 替换为 Shiki 高亮
  syncMarked.use({
    renderer: {
      code({ text, lang }) {
        const id = `cb${nextCodeId++}`;
        return `<pre class="shiki-placeholder" data-shiki-id="${id}" data-lang="${lang || ""}"><code>${escapeHtml(text)}</code></pre>`;
      },
    },
  });

  const rawHtml = await syncMarked.parse(md);

  // === 阶段 2：异步替换 Shiki 高亮 ===
  const enhancedHtml = await enhanceCodeBlocks(rawHtml, theme);

  // === 阶段 3：DOMPurify XSS 防护 ===
  const safeHtml = DOMPurify.sanitize(enhancedHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "em", "del", "u",
      "ul", "ol", "li",
      "blockquote",
      "pre", "code",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "input",
      "span", "div",
    ],
    ALLOWED_ATTR: [
      "href", "title", "alt", "src",
      "class", "id",
      "checked", "disabled", "type",
      "data-shiki-id", "data-lang",
      "style",
      "align",
      "width", "height",
    ],
    ALLOW_DATA_ATTR: true,
  });

  return safeHtml;
}

/** 异步替换占位符为 Shiki 高亮结果 */
async function enhanceCodeBlocks(
  html: string,
  theme: "light" | "dark",
): Promise<string> {
  const placeholderRegex = /<pre class="shiki-placeholder" data-shiki-id="([^"]+)" data-lang="([^"]*)">([\s\S]*?)<\/pre>/g;

  const matches: { full: string; id: string; lang: string; code: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = placeholderRegex.exec(html)) !== null) {
    matches.push({
      full: m[0],
      id: m[1],
      lang: m[2],
      code: m[3],
    });
  }

  if (matches.length === 0) return html;

  // 并发高亮
  const highlighted = await Promise.all(
    matches.map(async ({ full, lang, code }) => {
      try {
        // 反转义 & 还原代码
        const unescaped = unescapeHtml(code.replace(/^<code>|<\/code>$/g, ""));
        return await highlightCode(unescaped, lang, theme);
      } catch (e) {
        console.error("[shiki] highlight failed:", e);
        return full; // fallback
      }
    }),
  );

  let result = html;
  matches.forEach((match, i) => {
    result = result.replace(match.full, highlighted[i]);
  });

  return result;
}

/** HTML 实体转义 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML 实体反转义 */
function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
