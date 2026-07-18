# MarkLite

![Version](https://img.shields.io/badge/version-0.2.11-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2-24f8c7?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D30707)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss)
![Zustand](https://img.shields.io/badge/Zustand-5-443E58)
![Bundle](https://img.shields.io/badge/bundle-%3C10MB-4ade80)

> 轻量、秒开的跨平台 Markdown 编辑器。基于 Tauri 2 + React 19 + CodeMirror 6。

[English](./README.en.md) · 中文

---

## 截图

| 亮色主题 · 双栏布局 | 暗色主题 · 预览模式 |
|---|---|
| ![light](https://img.shields.io/badge/预览-亮色_双栏-f0f0f0) | ![dark](https://img.shields.io/badge/预览-暗色_预览-1a1a2e) |

> *截图待补充，可自行运行 `pnpm tauri dev` 体验。*

---

## 特性

### 📝 编辑体验
- 支持 `.md` / `.markdown` / `.mdx` 格式
- **三种布局**：纯编辑、双栏（默认）、纯预览 — 快捷键 `Ctrl+L` 一键切换
- **多标签页**：Edge 风格自适应标签，自动收缩、脏状态指示
- **文档大纲**：从 Markdown 标题提取目录树，点击跳转
- **字数统计**：中英文混合计数，状态栏实时显示
- **行号 / 自动换行 / Tab 缩进**：全部可配置
- **Ctrl+单击链接**：在编辑器内直接打开 URL
- **查找替换**：CodeMirror 内置搜索面板（`Ctrl+F`）

### 🎨 外观定制
- **8 种配色方案**：薰衣草 / 纸白 / 琥珀 / 子夜 / 余烬 / Notion / GitHub / 墨
- **跟随系统**：自动匹配系统明暗
- **可调字号与字体**：JetBrains Mono、Fira Code、Maple Mono 等 9 种等宽字体
- **配色即外观**：单一 data-scheme 驱动全部 CSS 变量，编辑器/预览/组件全联动

### 📂 文件管理
- **打开文件夹**：浏览文件树，展开/折叠目录
- **最近文件**：固定常用文件，一键清空历史
- **全文搜索**：在文件夹中搜索所有 Markdown 文件内容
- **文件重命名**：右键 → 原地编辑文件名
- **多文件夹工作区**：同时管理多个目录
- **自动保存**：防抖写入磁盘，延迟可调
- **自动刷新**：从磁盘同步文件变更，间隔可调
- **恢复上次会话**：启动时自动打开上次编辑的文件

### 🔄 预览
- **实时预览**：marked 解析 → Shiki 代码高亮 → DOMPurify 安全净化
- **滚动同步**：编辑器 ↔ 预览双向联动，60ms 锁防循环
- **代码块复制**：悬停显示复制按钮
- **脚注支持**：marked-footnote 插件
- **链接跳转**：Markdown 相对链接在编辑器内打开，外部链接走系统浏览器

### 🖥️ 界面
- **自定义标题栏**：品牌 Logo + 菜单栏（文件/视图/主题）+ 窗口控件
- **顶部栏**：面包屑路径 + 布局切换 + 侧栏开关 + 设置入口
- **状态栏**：光标位置 / 字数 / 文件状态 / 刷新按钮
- **可拖拽分栏**：双栏比例任意调节，双击重置
- **可拖拽侧栏**：活动栏 + 面板布局
- **快捷键一览**：`Ctrl+Shift+H` 呼出帮助面板

---

## 配色方案一览

| 方案 | 明暗 | 预览底色 |
|:---|:---:|:---|
| 薰衣草 (violet) | ☀️ 亮色 | `#eef0f7` |
| 纸白 (paper) | ☀️ 亮色 | `#faf9f6` |
| 琥珀 (amber) | ☀️ 亮色 | `#f8f5ef` |
| Notion | ☀️ 亮色 | `#ffffff` |
| GitHub | ☀️ 亮色 | `#f6f8fa` |
| 子夜 (midnight) | 🌙 暗色 | `#1b1f27` |
| 余烬 (ember) | 🌙 暗色 | `#241e18` |
| 墨 (ink) | 🌙 暗色 | `#1a1a1a` |

---

## 技术栈

| 类别 | 选型 |
|---|---|
| 桌面框架 | Tauri 2 (Rust) — 5 插件注册，无业务命令，极薄壳 |
| 前端 | React 19 + TypeScript 5.8 + Vite 7 |
| 编辑器 | CodeMirror 6（@uiw/react-codemirror 4.25） |
| Markdown | marked 18 → Shiki 4 高亮 → DOMPurify 3 净化 |
| 样式 | Tailwind CSS 4（CSS-first, @tailwindcss/vite） |
| 状态管理 | Zustand 5 |
| 图标 | lucide-react |
| 构建产物 | manualChunks 分割（react / codemirror / markdown 三类） |

### 架构亮点

- **防吞字符**：CodeEditor 用 `key={path}` 重建 + 稳定 value + `cbRef` 回调，避免 @uiw 频繁 reconfigure
- **大文档性能**：预览 `.markdown-body > *` 用 `content-visibility: auto` 跳过屏幕外渲染
- **滚动同步防循环**：`scrollSyncLock.ts` 60ms 锁 + `scrollSource` 来源标记
- **Rust 后端极薄**：所有文件操作走 Tauri 插件 JS API，`lib.rs` 无业务命令

---

## 配置文件

用户设置（配色方案、编辑器偏好、自动保存、自动刷新等）分别保存在：

| 存储 | 位置 | 内容 |
|:---|:---|:---|
| localStorage | WebView 本地 | 配色方案 (`marklite:colorscheme`)、上次打开文件等 |
| Tauri Store | 应用数据目录 | 编辑器详细设置 (`settings.json`) |
| 纯内存 | Zustand Store | 文件内容 / 文件树 / 光标 / 滚动 |

**settings.json 路径**（卸载重装不会丢失，手动删除可恢复默认）：

| 平台 | 路径 |
|---|---|
| Windows | `C:\Users\{用户名}\AppData\Roaming\com.zwf.marklite\settings.json` |
| macOS | `~/Library/Application Support/com.zwf.marklite/settings.json` |
| Linux | `~/.local/share/com.zwf.marklite/settings.json` |

---

## 开发

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9
- Rust ≥ 1.77
- 系统：Windows 10/11、macOS 11+、Linux

### 命令

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm tauri dev

# 构建发行版
pnpm tauri build          # NSIS + MSI 安装包
pnpm tauri build --no-bundle  # 便携版（约 6MB）
```

### 项目结构

```
src/
├── components/
│   ├── editor/       # CodeMirror 编辑器、标签栏、扩展
│   ├── file/         # 文件树、大纲、最近文件、搜索面板
│   ├── layout/       # 标题栏、顶部栏、侧栏、分栏、状态栏
│   ├── preview/      # Markdown 预览
│   ├── settings/     # 设置面板
│   └── ui/           # 通用 UI 组件
├── lib/
│   ├── markdown/     # 解析器、Shiki 高亮
│   ├── shortcuts/    # 快捷键绑定
│   ├── tauri/        # Tauri 文件操作封装
│   ├── theme/        # 配色方案系统
│   └── utils/        # 工具函数
├── stores/           # Zustand 状态管理
└── styles/           # 全局样式
```

---

## 平台支持

| 平台 | 状态 |
|---|---|
| Windows 10/11 | ✅ 完全支持 |
| macOS 11+ | ✅ 完全支持（含自定义红绿灯布局） |
| Linux | ⚠️ 未充分测试，欢迎反馈 |

---

## 许可

[MIT](./LICENSE) © 2025 Zeno528
