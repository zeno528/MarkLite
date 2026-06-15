# MarkLite 项目说明

基于 Tauri 2 + React 19 + TypeScript + CodeMirror 6 的轻量级跨平台 Markdown 编辑器。

## 技术栈全景

```
前端栈:  React 19.2 + TypeScript 5.8 + Zustand 5.0
  ├─ 编辑器:  CodeMirror 6 (@uiw/react-codemirror 4.25)
  ├─ 预览:    marked 18 → Shiki 4 高亮 → DOMPurify 3 净化
  ├─ 样式:    Tailwind CSS v4 (CSS-first, @tailwindcss/vite)
  │           data-scheme 驱动 oklch CSS 变量 + @theme radius token
  │           3 配色方案 (violet/paper/midnight) + system 跟随
  └─ 图标:    lucide-react 1.17

Tauri 桥: @tauri-apps/api 2.11 + 插件 (fs/dialog/store/os/window-state/opener)

后端栈:  Rust (edition 2021) + Tauri 2
         lib.rs 极薄壳 (5 插件注册, 无业务命令)
         release: LTO + opt-level=s + strip → <10MB

构建链:  pnpm → Vite 7.3 (esbuild) → tsc 类型检查
         manualChunks 分割: react-vendor / codemirror-vendor / markdown-vendor

状态分层:
  localStorage  → 配色方案 (marklite:colorscheme)
  Tauri Store   → 编辑器设置 (settings.json, 磁盘)
  纯内存        → 文件内容/文件树/光标/滚动 (3 个 store)
```

**关键架构点**：
- **配色即外观（Typora 式）**：单一 `data-scheme` 属性驱动全部 CSS 变量，编辑器/预览/组件全联动；`resolvedTheme` 由方案 mode 派生，供 CodeMirror/Shiki 选亮暗
- **防吞字符**：CodeEditor/EditorPane 用 `key={path}` 重建 + 稳定 value + `cbRef` 稳定回调，避免 @uiw 因 props 变化频繁 reconfigure 导致打字吞字符
- **滚动同步防循环**：`scrollSyncLock.ts` 60ms 锁 + `scrollSource` 来源标记，编辑器↔预览双向同步不死循环
- **大文档性能**：预览 `.markdown-body > *` 用 `content-visibility:auto` 跳过屏幕外渲染；滚动用 rAF 节流
- **Rust 后端极薄**：所有文件操作走 Tauri 插件 JS API，`lib.rs` 无业务命令

**遗留/未接入代码**（清理候选）：`extensions/scrollSync.ts`（被内联替代）、`layout/TitleBar.tsx`+`EditorToolbar.tsx`（被 TopBar 合并替代）、`file/FileTabs.tsx`（多 Tab 已实现但未接入主界面）、`class-variance-authority`+`@codemirror/theme-one-dark` 依赖声明但未用。

## 🎯 核心要求（最高优先级，不可违背）

> **这个项目存在的根本理由是：极好的性能 + 占用小 + 启动快 + 轻量。**
>
> **任何维护、优化、新功能、技术选型决策，都不得违背这些核心要素。当其他目标与之冲突时，性能与轻量优先。**

维护本项目时必须始终满足：

| 核心要素 | 含义 | 违背即为技术债 |
|:---|:---|:---|
| **性能极好** | 大文档（100KB+）滚动/编辑丝滑不卡顿；输入无延迟 | 引入卡顿、丢帧、输入抖动 |
| **占用小** | 内存占用低、安装包体积小、CPU 占用低 | 引入重量级依赖、内存泄漏、常驻高 CPU |
| **启动速度快** | 冷启动到可交互时间极短 | 启动时做重活（大量同步 IO、全量解析、阻塞渲染）|
| **轻量** | 依赖精简、架构克制、不过度设计 | 滥用依赖、过度抽象、堆功能不考虑成本 |

### 维护准则（落实核心要素）

1. **加依赖前三思**：能否用现有依赖/原生实现？每个依赖都增加体积和潜在性能负担。能用 CodeMirror/Zustand 等已有方案就不引入新库。
2. **渲染路径要轻**：避免高频 setState、全量重渲染、大 DOM。滚动/输入这类热路径用 rAF 节流、虚拟化、`content-visibility` 等手段。
3. **启动别做重活**：耗时初始化（字体加载、大量预热、全量 IO）延后到 `requestIdleCallback` 或按需，不阻塞首帧。
4. **大文档友好**：任何处理 markdown 全文的逻辑（解析、搜索、大纲）都要考虑 100KB+ 场景，防抖/增量/虚拟化。
5. **不为了功能牺牲性能**：一个功能如果明显拖慢性能或增加显著体积，要么换更轻的实现，要么不做。
6. **重构时守住轻量**：发现问题可以重构，但不能让重构后的代码比原来更重、更慢。

> 一句话：**这个项目宁可少一个功能，也不能慢一点、重一点。**

---



## 已知问题（搁置中，等待上游修复）

### 🔴 中文输入法（IME）首次输入丢失 — Chromium 149 上游 bug

**状态**：⏸️ 搁置（等 Chromium/WebView2 修复，非项目代码问题）
**记录时间**：2026-06
**影响版本**：WebView2 / Chrome / Edge ≥ **149.0.7827.103**（Chromium 149.0.7827.103 起回归）

#### 现象
- 用中文拼音输入法打字，打完拼音按**空格确认**时，第一次的词**不进去**，必须再打一次空格/再输入一次才生效
- "每个字要按两次"的体感

#### 根因（多方铁证，非项目 bug）
这是 **Chromium 149 内核的 IME 回归 bug**，不是 MarkLite 的代码问题：
- Chromium 在首次 IME 组合时**静默吞掉** `compositionstart` / `beforeinput` / `input` / `compositionend` 事件
- 影响所有基于 **CodeMirror 6**（及任何 contenteditable 编辑器）在 **Windows + 中文/日文/韩文 IME** 下的使用
- 参考证据：
  - 掘金深度分析：https://juejin.cn/post/7649337767211237382
  - CodeMirror 论坛 #9741：https://discuss.codemirror.net/t/chinese-ime-punctuation-input-loses-every-other-keypress-requires-2-presses-per-character/9741
  - ale-160/web-text issue #2（含 Google Chromium issue 521205128 链接）

#### 已验证无效的项目侧方案（不要再重复尝试）
| 方案 | 结果 |
|:---|:---|
| 改 `onChange` 受控同步逻辑（value 回灌） | ❌ 对此 bug 无效（但顺手修了**另一个**英文空格吞字符的 bug，那个是真项目 bug，已修） |
| 强制 CodeMirror 走 EditContext（patch `@codemirror/view` line 7097 去掉 `browser.android &&`）| ❌ 实测无效，bug 不在 contenteditable vs EditContext 这层 |
| `onChange` 加 `!update.composing` 守卫 + `compositionend` 用 `setTimeout(0)` | ❌ 掘金作者团队已验证无效 |
| React 层合成事件守卫 | ❌ 同上，穷尽 JS/React 层方案均无效 |

社区结论（掘金 + ale-160）：**在 Chromium 修复前，应用层无可靠绕过方案**。

#### 为何搁置
1. **上游会修**：Google 已收到 issue，下个 Chromium 版本大概率修复，WebView2 会跟进
2. **有自愈属性**：用户 WebView2 更新到修复版后自动恢复，无需重新分发
3. **分发影响有限**：只有 WebView2 ≥ 149.0.7827.103 的用户中招；等正式分发时 Chromium 多半已修
4. **继续投入性价比低**：已验证所有项目侧方案无效

#### 何时重新检查（移除本记录的触发条件）
- 当 WebView2 / Chrome 更新到 **149.0.7827.114 之后的新稳定版**（如 150+）时，重新测试中文输入
- 若已正常 → 说明 Chromium 修复了，本记录可删除
- 验证方法：Tauri app 里用中文拼音连续打字 + 空格确认，每个字应一次成功

#### 相关文件（若未来要重新尝试项目侧修复）
- `src/components/editor/CodeEditor.tsx` — CodeMirror 包装
- `node_modules/.pnpm/@codemirror+view@6.43.1/.../dist/index.js` line 7097 — EditContext 启用判断（`browser.android` 限制桌面不启用）
- `src/components/editor/EditorPane.tsx` — 已用 `key={path}` + 非受控 value 修了**英文空格**吞字符（与 IME bug 不同，勿混淆）

---

## 开发约定

- 始终用中文回复，技术术语/代码标识符保持原文
- 改代码前先完整读相关文件（DRY 前提）
- 涉及技术判断先查证（context7 / GitHub issues / 官方文档），不凭记忆
- 系统组件（WebView2/注册表/服务）只读查询，任何修改须先征得用户同意
