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



## 已知问题

### 🔴 中文输入法（IME）首次输入丢失（每个字要按两次）— Chromium 149 上游回归

**状态**：⏸️ 搁置（**应用层已确证无解**，等 WebView2 stable 跟进上游修复）
**记录时间**：2026-06（2026-06-17 二次查证更新）
**影响版本**：Chromium **149.0.7827.103+**（Windows 桌面）。注意 Edge/WebView2 的**产品版本号** 149.0.4022.x 对应的**内核版本**是 149.0.7827.x：
  - Edge 149.0.4022.52 = Chromium 149.0.7827.54（不受影响）
  - Edge 149.0.4022.62 = Chromium 149.0.7827.103（受影响）
  - 本机 WebView2 = **149.0.4022.69**（内核 ≥7827.103，**中招**）

#### 现象
- 中文 IME 打完拼音按空格确认，第一次的词**不进去**，要再确认一次（"每个字要按两次"）
- **不同输入法症状不同（同一个 bug）**：微软拼音 = 汉字一次成功、仅**中文标点**要按两次；搜狗 / QQ拼音 = **所有输入**都要按两次。日常打汉字觉得"微软拼音正常"，其实它标点也中招

#### 根因（2026-06-17 查 ale-160/web-text issue#2 铁证 + 读 @codemirror/view 源码确证）
**Chromium 149.0.7827.103+ 在 Windows 上首次 IME 组合时，连 DOM 文本都不写入、事件也完全不派发**：
- ale-160 团队在 `document` 根加监听验证：首次输入 `compositionstart / compositionend / beforeinput / input` **全部零输出**（第二次才正常）
- 读 CodeMirror 源码反证 DOM 不变：`DOMObserver` 的 MutationObserver callback（dist/index.js line 7078-7096）在桌面 Chrome 收到任何 contentDOM 变化**立即 `this.flush()`**（无 composing 门控）。若首次输入 DOM 真的变了，CodeMirror 当场就同步了，不会"按两次"——既然"按两次"，说明 **DOM 根本没变**
- 即**事件层 + DOM 层双失败**。JS 只能靠"事件 / MutationObserver / 轮询 DOM"三种方式感知输入，三者全失效 → **应用层无解**
- 不是 EditContext 问题（桌面默认不启用，line 7097 `browser.android`）；不是 React/@uiw 问题（绕过直接用 EditorView 仍复现）

参考证据：
- **ale-160/web-text issue#2**（专门为此 bug 建的仓库，穷尽 9 种方案 + 完整跨浏览器验证）：https://github.com/ale-160/web-text/issues/2
- Chromium 官方 issue **#523134891**：https://issues.chromium.org/issues/523134891
- 掘金深度分析：https://juejin.cn/post/7649337767211237382
- CodeMirror 论坛 #9741：https://discuss.codemirror.net/t/chinese-ime-punctuation-input-loses-every-other-keypress-requires-2-presses-per-character/9741

#### 已验证无效的项目侧方案（不要再重复尝试）
| 方案 | 结果 |
|:---|:---|
| 改 `onChange` 受控同步逻辑（value 回灌） | ❌ 无效（但顺手修了另一个英文空格吞字符 bug，已修） |
| 强制 CodeMirror 走 EditContext（patch line 7097 `browser.android`→`(browser.android\|\|browser.chrome)`）| ❌ EditContext 已启用但 bug 仍复现（2026-06-16 实测） |
| `onChange` 加 `!update.composing` 守卫 + `compositionend` `setTimeout(0)` | ❌ 掘金 / ale-160 验证无效 |
| React 层合成事件守卫 | ❌ 穷尽 JS/React 层方案均无效 |
| ~~`imeFix.ts` 轮询 `contentDOM.textContent` 对比 doc 手动 dispatch~~（已删）| ❌ contentDOM 每行是 `.cm-line` div，`textContent` 拼接丢失换行符，多行文档永久 no-op；且根因是 DOM 不变，轮询也读不到差异 |
| ~~`imeCompat.ts` compositionend 后强制 `observer.flush()`~~（已删）| ❌ 基于"records 偏晚"的错误前提；实测无效——根因是 compositionend 根本不触发 + DOM 不变，flush 无 records 可读 |
| 裸 MutationObserver 监听 contentDOM 变化触发 flush | ❌ **理论上不成立**：CodeMirror 自带 MutationObserver 收到变化就立即 flush（line 7095），若此路有效 CodeMirror 自己早生效了；DOM 不变 → 任何 MutationObserver 都收不到 |
| ~~换 Ace editor（textarea 架构，react-ace + ace-builds）~~（已回退到 CodeMirror）| ❌ **最关键的一次验证**：Chrome 浏览器里 Ace textarea 一次成功（证明 textarea 在纯 Chromium 免疫），但 **Tauri WebView2 里 Ace textarea 同样按两次**。诊断日志显示搜狗确认时**不走 composition 事件、首次 `beforeinput/input data=null`**。结论：**Chrome 浏览器与 WebView2 控件虽同 Chromium 149 内核，IME 集成不一样**（微软 WebView2 封装把首次确认吞成空）→ textarea 在 Chrome 免疫、在 WebView2 不免疫 → 换 Ace 无效，已回退 |

社区结论（ale-160 团队 + 掘金 + 本项目四次实测，含换 Ace）：**Chromium 修复前，应用层无可靠绕过方案**——contenteditable 与 textarea 在 Tauri WebView2 下**均踩**首次确认丢失，只有 Chrome 浏览器里 textarea 免疫（但 app 只能用 WebView2，没法用 Chrome）。

#### 上游修复进度（2026-06-16 查证）
- Chromium issue **#523134891**：Fixed ✅，commit `ea0cc344`（2026-06-15，Microsoft 工程师），改 `ui/base/ime/win/tsf_text_store.cc`
- 修复 2026-06-15 合入主干，距 2026-06-17 仅 2 天；按 Chromium ~6-12 周 stable 周期，预计 2026 年 7-8 月到达 Edge / WebView2 stable

#### 为何搁置
1. **应用层确证无解**：事件 + DOM 双失败，JS 三种感知方式全失效（上表 7 种方案全败）
2. **上游已修**：等 Edge / WebView2 stable 跟进即可
3. **有自愈属性**：用户 WebView2 更新到修复版后自动恢复，无需重新分发
4. **分发影响有限**：仅 Chromium 7827.103+ ~ 修复版之间的用户中招

#### 何时重新检查（移除本记录的触发条件）
- WebView2 Runtime 更新到含 commit `ea0cc344` 的 stable（理论 149.0.7827.115+ 或 150+）后重新测试
  - 检查本机版本：`(Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}').pv`（注意这是**产品版本号**，对应内核 7827.x）
  - 若搜狗一次输入成功 → 上游已修，本记录可删除
- 验证方法：Tauri app 里用**搜狗**连续打字 + 空格确认，每个字一次成功；同时确认微软拼音标点也一次成功

#### 期间的用户侧缓解（非代码修复）
- 搜狗所有输入都要按两次；**微软拼音打汉字一次成功**（仅中文标点要按两次），日常可用微软拼音缓解
- 等 WebView2 stable 更新（Edge 自动更新会带动 WebView2 Runtime）

#### 相关文件
- `src/components/editor/CodeEditor.tsx` — CodeMirror 包装（已移除全部无效的 IME 扩展，保持原生状态）
- `node_modules/.pnpm/@codemirror+view@6.43.1/.../dist/index.js` line 7078-7096（DOMObserver 收到变化立即 flush → 反证首次输入 DOM 不变）、line 5220-5244（compositionend 处理）
- `src/components/editor/EditorPane.tsx` — `key={path}` + 非受控 value 修了英文空格吞字符（与 IME bug 不同，勿混淆）

---

## 开发约定

- 始终用中文回复，技术术语/代码标识符保持原文
- 改代码前先完整读相关文件（DRY 前提）
- 涉及技术判断先查证（context7 / GitHub issues / 官方文档），不凭记忆
- 系统组件（WebView2/注册表/服务）只读查询，任何修改须先征得用户同意
