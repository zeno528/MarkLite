// 翻译脚本：读 en/messages.po，调 DeepSeek 批量翻译空 msgstr，写回。
// 用法：直接 pnpm translate；脚本会自动从 .env.example 复制 .env（如果不存在），
//       并引导填 API key。
//
// 关键约束：
//   - 只翻译 msgstr 为空的条目（已翻译的不动，可重复运行）
//   - 占位符 {xxx} 和 <0>...</0> 必须原样保留
//   - 一次性 batch 30 条，保持术语一致
//   - 写回后自动 lingui compile
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PO_PATH = path.join(ROOT, "src", "locales", "en", "messages.po");
const ENV_PATH = path.join(ROOT, ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT, ".env.example");
const LINGUI_BIN = path.join(ROOT, "node_modules", "@lingui", "cli", "dist", "lingui.js");

// === Onboarding：自动准备 .env + 引导填 API key ===
async function ensureApiKey() {
  // 1) .env 不存在 → 自动从 .env.example 复制
  if (!fs.existsSync(ENV_PATH)) {
    if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
      console.error("❌ .env 和 .env.example 都不存在，项目结构异常");
      process.exit(1);
    }
    fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log("✅ 已自动从 .env.example 创建 .env\n");
  }

  // 2) 读当前 key
  let m = fs.readFileSync(ENV_PATH, "utf-8").match(/^LLM_API_KEY=(.*)$/m);
  let key = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";

  // 3) key 无效 → 打开编辑器阻塞等待用户填
  if (!key || key === "sk-your-key-here" || !key.startsWith("sk-")) {
    console.log("📝 检测到 LLM_API_KEY 未填写");
    console.log("   正在打开 .env，填入你的 API key（以 sk- 开头），保存关闭后自动继续\n");

    let editor, args;
    if (process.platform === "win32") {
      editor = "notepad"; args = [ENV_PATH];
    } else if (process.platform === "darwin") {
      editor = "open"; args = ["-W", "-t", ENV_PATH];
    } else {
      editor = "xdg-open"; args = [ENV_PATH];
    }
    spawnSync(editor, args, { stdio: "inherit" });

    m = fs.readFileSync(ENV_PATH, "utf-8").match(/^LLM_API_KEY=(.*)$/m);
    key = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";

    if (!key || key === "sk-your-key-here" || !key.startsWith("sk-")) {
      console.error("\n❌ LLM_API_KEY 仍未填写有效值");
      console.error("   期望格式：以 sk- 开头的字符串（如 sk-abc123...）");
      process.exit(1);
    }

    process.env.LLM_API_KEY = key;
    console.log("✅ 已读取 API key，开始翻译\n");
  }
}

const API_URL = process.env.LLM_API_URL || "https://api.deepseek.com/v1/chat/completions";
const MODEL = process.env.LLM_MODEL || "deepseek-v4-pro";

// 简易 .po 解析
function parsePo(text) {
  const headerMatch = text.match(/^(msgid ""\s*msgstr ""\s*"[\s\S]*?")\n\n/m);
  const header = headerMatch ? headerMatch[1] + "\n" : "";
  const body = header ? text.slice(header.length) : text;
  const entries = body.split(/\n\n+/).filter(Boolean);
  return { header, entries };
}

function extractMsg(entry) {
  const idMatch = entry.match(/^msgid\s+"((?:[^"\\]|\\.)*)"/m);
  const strMatch = entry.match(/^msgstr\s+"((?:[^"\\]|\\.)*)"/m);
  if (!idMatch) return null;
  return {
    id: JSON.parse(`"${idMatch[1]}"`),
    str: strMatch ? JSON.parse(`"${strMatch[1]}"`) : "",
  };
}

// === 增强版解析（修复"全部静默丢失"） ===
// DeepSeek 偶尔会：漏行、重行、加代码块、夹解释文字
function parseTranslations(rawContent, expectedCount) {
  const stripped = rawContent.replace(/\`\`\`[a-z]*\n?/gi, "").replace(/\`\`\`/g, "").trim();
  const lines = stripped.split(/\n/).map(l => l.trim()).filter(Boolean);

  const numbered = new Array(expectedCount).fill(undefined);
  let numberedHits = 0;
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s*(.*?)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < expectedCount) {
        numbered[idx] = m[2];
        numberedHits++;
      }
    }
  }
  if (numberedHits >= Math.ceil(expectedCount * 0.5)) {
    const unmatched = [];
    numbered.forEach((t, i) => { if (t === undefined) unmatched.push(`#${i + 1}`); });
    return { translations: numbered, unmatched, mode: "numbered" };
  }

  if (lines.length === expectedCount) {
    return { translations: lines, unmatched: [], mode: "ordered" };
  }

  return { translations: new Array(expectedCount).fill(undefined), unmatched: lines, mode: "failed" };
}

async function translateBatch(items) {
  const lines = items.map((it, i) => `${i + 1}. ${it.id}`).join("\n");
  const prompt = `You are a professional UI string translator. Translate the following Chinese UI strings to English for a Markdown editor app called "MarkLite".

Strict rules:
- Output format is STRICTLY "N. translation" where N starts at 1, one per line.
  Example for 3 inputs:
    1. Open File
    2. Save
    3. Close
  Do NOT omit line numbers. Do NOT output translations without their number prefix.
- No code blocks, no preamble, no explanation, no trailing commentary. ONLY the numbered list.
- Keep ALL placeholders EXACTLY as-is. Two formats exist:
    * ICU-style: {title}, {name}, {count}
    * JSX-style: <0>...</0>, <0>(Ctrl+S)</0>, <0>Ctrl+F</0>, <0>(Ctrl+\\)</0>
  Correct examples (notice placeholders are kept verbatim):
    保存 <0>(Ctrl+S)</0>   ->   Save <0>(Ctrl+S)</0>      (NOT "Save (Ctrl+S)")
    搜索 <0>Ctrl+F</0>      ->   Search <0>Ctrl+F</0>        (NOT "Search Ctrl+F")
    切换侧栏 <0>(Ctrl+\\)</0> -> Toggle Sidebar <0>(Ctrl+\\)</0>
- Keep Markdown, punctuation, and spacing exactly where they appear.
- For UI terms, use these consistent translations:
    文件 = File, 文件夹 = Folder, 编辑 = Edit, 视图 = View, 设置 = Settings,
    帮助 = Help, 关于 = About, 侧栏 = Sidebar, 保存 = Save, 搜索 = Search,
    预览 = Preview, 打开 = Open, 关闭 = Close, 删除 = Delete, 重命名 = Rename,
    刷新 = Refresh, 自动 = Auto, 主题 = Theme, 配色 = Color,
    快捷键 = Keyboard Shortcuts, 资源管理器 = Explorer, 双栏 = Split, 切换 = Toggle,
    展开 = Expand, 收起 = Collapse
- Do NOT add quotes or extra punctuation. Each line is just the translation.

Strings:
${lines}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${t}`);
  }
  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content ?? "";
  const { translations, unmatched, mode } = parseTranslations(rawContent, items.length);

  if (process.env.TRANSLATE_DEBUG) {
    console.log("\n----- DeepSeek 原始返回 -----");
    console.log(rawContent);
    console.log("----- 解析后 translations -----");
    console.log(JSON.stringify(translations, null, 2));
    console.log(`----- 解析模式: ${mode} -----`);
  if (unmatched.length) console.log("----- 未匹配 -----", unmatched);
    console.log("-------------------------------\n");
  }
  return { translations, unmatched };
}

async function main() {
  await ensureApiKey();

  console.log("📖 Reading", PO_PATH);
  const text = fs.readFileSync(PO_PATH, "utf-8");
  const { header, entries } = parsePo(text);

  const targets = [];
  entries.forEach((entry, i) => {
    const m = extractMsg(entry);
    if (m && m.id && m.str === "") {
      targets.push({ index: i, id: m.id });
    }
  });

  if (targets.length === 0) {
    console.log("✅ 没有空 msgstr，无需翻译");
    return;
  }
  console.log(`🔍 找到 ${targets.length} 条待翻译`);

  const BATCH = 30;
  const translations = new Map();

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const range = `${i + 1}~${Math.min(i + BATCH, targets.length)}`;
    console.log(`  → 翻译 ${range} / ${targets.length}`);
    try {
      const { translations: trs, unmatched } = await translateBatch(batch);
      const filled = trs.filter(Boolean).length;
      const missing = batch.length - filled;
      console.log(`     ✓ 解析 ${filled}/${batch.length}` + (missing ? `, ⚠️  ${missing} 条未匹配` : ""));
      if (unmatched.length) {
        const preview = unmatched.slice(0, 3).join(" | ");
        console.log(`     未匹配行（前 3）: ${preview}${unmatched.length > 3 ? " ..." : ""}`);
      }
      batch.forEach((t, j) => {
        if (trs[j]) translations.set(t.index, trs[j]);
      });
    } catch (e) {
      console.error(`  ⚠️  batch ${range} 失败: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (translations.size === 0) {
    console.log("\n❌ 所有批次都没解析成功，PO 文件未修改");
    console.log("   设置 TRANSLATE_DEBUG=1 重跑可以看 DeepSeek 原始返回");
    process.exit(1);
  }

  let updated = 0;
  const newEntries = entries.map((entry, i) => {
    if (!translations.has(i)) return entry;
    updated++;
    const tr = translations.get(i);
    return entry.replace(
      /^msgstr\s+""/m,
      `msgstr "${tr.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    );
  });

  const newText = header + newEntries.join("\n\n") + "\n";
  fs.writeFileSync(PO_PATH, newText, "utf-8");
  console.log(`\n✅ 翻译 ${updated}/${targets.length} 条，写回 PO 文件`);

  // 直接调 lingui 二进制（绕开 pnpm ELIFECYCLE 误判）
  console.log("🔨 运行 lingui compile ...");
  const r = spawnSync(process.execPath, [LINGUI_BIN, "compile", "--typescript"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`❌ lingui compile 退出码 ${r.status}`);
    if (r.stdout) console.error("STDOUT:", r.stdout.toString());
    if (r.stderr) console.error("STDERR:", r.stderr.toString());
    process.exit(r.status || 1);
  }
  console.log("🎉 全部完成！dev 里切到英文看效果");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});