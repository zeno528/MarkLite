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
import { Marked, Renderer } from "marked";
import markedFootnote from "marked-footnote";
import DOMPurify from "dompurify";
import { convertFileSrc } from "@tauri-apps/api/core";
import { highlightCode } from "./shiki";

/** 代码块占位符自增 id（每次解析重新计数） */
let nextCodeId = 0;

/**
 * 解析 Markdown → 安全的 HTML
 * @param md Markdown 源文
 * @param theme 主题：'light' | 'dark'
 * @param filePath 文件路径（用于解析相对图片路径）
 */
export async function parseMarkdown(
  md: string,
  theme: "light" | "dark",
  filePath?: string,
): Promise<string> {
  if (!md.trim()) return "";
  nextCodeId = 0; // 每次解析重置占位符 id

  // === 阶段 1：marked 解析 ===
  // 预处理每行起始 offset，供 walkTokens 反查块级 token 的源行号（滚动同步按行号映射）
  const lineStarts = buildLineStarts(md);
  const blockTypes = new Set(["heading", "paragraph", "code", "blockquote", "hr", "html", "list", "table"]);
  let srcCursor = 0;

  const syncMarked = new Marked({
    gfm: true,
    breaks: false,
    // 给块级 token 注入源行号 _sourceLine，供 renderer 输出 data-source-line
    // 仅处理块级 token，跳过 inline 子 token（避免嵌套递归回调污染字符游标）
    walkTokens(token: any) {
      if (!blockTypes.has(token.type)) return;
      const raw: string | undefined = token.raw;
      if (!raw) return;
      const start = md.indexOf(raw, srcCursor);
      if (start < 0) return;
      token._sourceLine = lineAt(lineStarts, start);
      srcCursor = start + raw.length; // 严格按 raw 长度推进，消除重复 raw 错位
    },
  });
  syncMarked.use(markedFootnote());

  // 自定义块级渲染器：开标签注入 data-source-line，供滚动同步按「编辑器行 ↔ 预览块」映射
  // heading/paragraph 是文档主体，必须标注；blockquote 内部走 this.parser.parse 递归（其子 paragraph 也会被标注）
  // list/table 未覆盖（默认渲染），其区域靠前后已标注块夹逼 + 段内回退百分比
  syncMarked.use({
    renderer: {
      code({ text, lang, _sourceLine }: any) {
        const id = `cb${nextCodeId++}`;
        const line = typeof _sourceLine === "number" ? _sourceLine : "";
        return `<pre class="shiki-placeholder" data-shiki-id="${id}" data-lang="${lang || ""}" data-source-line="${line}"><code>${escapeHtml(text)}</code></pre>`;
      },
      heading(this: any, { tokens, depth, _sourceLine }: any) {
        const line = typeof _sourceLine === "number" ? _sourceLine : "";
        return `<h${depth} data-source-line="${line}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      paragraph(this: any, { tokens, _sourceLine }: any) {
        const line = typeof _sourceLine === "number" ? _sourceLine : "";
        return `<p data-source-line="${line}">${this.parser.parseInline(tokens)}</p>\n`;
      },
      blockquote(this: any, { tokens, _sourceLine }: any) {
        const line = typeof _sourceLine === "number" ? _sourceLine : "";
        const body = this.parser.parse(tokens);
        return `<blockquote data-source-line="${line}">\n${body}</blockquote>\n`;
      },
      hr({ _sourceLine }: any) {
        const line = typeof _sourceLine === "number" ? _sourceLine : "";
        return `<hr data-source-line="${line}">\n`;
      },
      // list/table 调用默认渲染再注入属性（手写易破坏 li/单元格结构），增加锚点密度
      list(this: any, token: any) {
        const html = Renderer.prototype.list.call(this, token);
        const line = typeof token._sourceLine === "number" ? token._sourceLine : "";
        return line !== "" ? html.replace(/<(ul|ol)\b/, `<$1 data-source-line="${line}"`) : html;
      },
      table(this: any, token: any) {
        const html = Renderer.prototype.table.call(this, token);
        const line = typeof token._sourceLine === "number" ? token._sourceLine : "";
        return line !== "" ? html.replace(/<table\b/, `<table data-source-line="${line}"`) : html;
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
      "strong", "em", "del", "u", "b", "i",
      "ul", "ol", "li",
      "blockquote",
      "pre", "code",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "input",
      "span", "div",
      "details", "summary",
      "kbd", "sup", "sub",
      "section",
    ],
    ALLOWED_ATTR: [
      "href", "title", "alt", "src",
      "class", "id",
      "checked", "disabled", "type",
      "data-shiki-id", "data-lang", "data-source-line",
      "style",
      "align",
      "width", "height",
      "open",
    ],
    ALLOW_DATA_ATTR: true,
  });

  // === 阶段 4：解析相对图片路径 ===
  return filePath ? resolveRelativePaths(safeHtml, filePath) : safeHtml;
}

/** 异步替换占位符为 Shiki 高亮结果 */
async function enhanceCodeBlocks(
  html: string,
  theme: "light" | "dark",
): Promise<string> {
  // 占位符携带 data-source-line（第 3 捕获组），高亮后需回填到 Shiki 输出的 <pre，否则行号丢失
  const placeholderRegex = /<pre class="shiki-placeholder" data-shiki-id="([^"]+)" data-lang="([^"]*)" data-source-line="([^"]*)">([\s\S]*?)<\/pre>/g;

  const matches: { full: string; id: string; lang: string; line: string; code: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = placeholderRegex.exec(html)) !== null) {
    matches.push({
      full: m[0],
      id: m[1],
      lang: m[2],
      line: m[3],
      code: m[4],
    });
  }

  if (matches.length === 0) return html;

  // 并发高亮
  const highlighted = await Promise.all(
    matches.map(async ({ full, lang, line, code }) => {
      try {
        // 反转义 & 还原代码
        const unescaped = unescapeHtml(code.replace(/^<code>|<\/code>$/g, ""));
        const shikiHtml = await highlightCode(unescaped, lang, theme);
        // 把源行号注入 Shiki 首个 <pre（Shiki 输出形如 <pre class="shiki ..." ...>）
        return line ? injectSourceLine(shikiHtml, line) : shikiHtml;
      } catch (e) {
        console.error("[shiki] highlight failed:", e);
        return full; // fallback：原占位符已含 data-source-line
      }
    }),
  );

  let result = html;
  matches.forEach((match, i) => {
    result = result.replace(match.full, highlighted[i]);
  });

  return result;
}

/** 把 data-source-line 注入 HTML 首个 <pre 标签（前瞻匹配 <pre 后跟空白或 >，不消耗字符） */
function injectSourceLine(html: string, line: string): string {
  return html.replace(/<pre(?=[\s>])/, `<pre data-source-line="${line}"`);
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

/** 把 HTML 中的相对路径（img src、a href）转成基于文件目录的绝对路径 */
function resolveRelativePaths(html: string, filePath: string): string {
  // 提取文件所在目录
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  return html.replace(
    /(<(?:img|a)\b[^>]*\b(?:src|href)=")([^"]+)(")/gi,
    (match, prefix, url, suffix) => {
      // 跳过已经是绝对路径或协议 URL
      if (/^(https?|asset|data|blob):/.test(url) || /^[/\\]/.test(url)) {
        return match;
      }
      // 相对路径 → 绝对路径 → Tauri asset URL
      const absPath = `${dir}/${url}`.replace(/\\/g, "/");
      const assetUrl = convertFileSrc(absPath);
      return `${prefix}${assetUrl}${suffix}`;
    },
  );
}

/** 预计算每行起始字符 offset（lineStarts[0]=0 即第 1 行起点），供按 offset 反查行号 */
function buildLineStarts(md: string): number[] {
  const starts = [0];
  for (let i = 0; i < md.length; i++) {
    if (md.charCodeAt(i) === 10) starts.push(i + 1); // 10 = '\n'
  }
  return starts;
}

/** 二分查 offset 所在行号（1-based）：最后一个 lineStarts[i] <= offset 的 i + 1 */
function lineAt(lineStarts: number[], offset: number): number {
  let lo = 0;
  let hi = lineStarts.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= offset) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans + 1;
}
