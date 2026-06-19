# MarkLite

轻量、秒开的跨平台 Markdown 编辑器。

## 特性

- ⚡ **轻量** — 安装包 < 10MB，内存 < 80MB，冷启动 < 300ms
- 🎨 **现代 UI** — 双栏布局、亮暗主题、流畅动效
- 🛠 **功能完整** — CodeMirror 6 编辑、Shiki 代码高亮、GFM 支持、自动保存
- 📁 **文件管理** — 文件树、多 Tab、滚动同步、查找替换

## 技术栈

| 类别 | 选型 |
|---|---|
| 桌面框架 | Tauri 2.x (Rust) |
| 前端 | React 19 + TypeScript + Vite 7 |
| 样式 | Tailwind CSS 4 |
| 编辑器 | CodeMirror 6 |
| Markdown | marked + Shiki |
| 状态管理 | Zustand 5 |

## 开发

环境要求：Node.js ≥ 20、pnpm ≥ 9、Rust ≥ 1.77

```bash
pnpm install
pnpm tauri dev      # 开发模式
pnpm tauri build    # 构建发行版
```

## 平台支持

| 平台 | 状态 |
|---|---|
| Windows 10/11 | ✅ |
| macOS 11+ | ✅ |
| Linux | ⚠️ 未测试 |

## 许可

MIT
# MarkLite

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D30707)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)
![Zustand](https://img.shields.io/badge/Zustand-5-443E0)

> 轻量、秒开、跨平台（macOS + Windows）的现代化 Markdown 编辑器

## ✨ 特性

- ⚡ **轻量** — 基于 Tauri 2.x + Rust + 系统 WebView，安装包 < 10MB，内存 < 80MB
- 🚀 **秒开** — 冷启动 < 300ms，所见即所得
- 🎨 **现代化 UI** — 双栏布局、亮/暗/跟随系统主题、流畅动效
- 🛠 **完整功能** — CodeMirror 6 编辑器、Shiki 代码高亮（VSCode 同款）、GFM 表格/任务列表、自动保存
- 📁 **文件管理** — 文件树、多 Tab、跨平台路径处理
- 🔍 **高效编辑** — 滚动同步、查找替换、字数统计（中英混合）
- 💾 **设置持久化** — 字体、字号、自动保存等持久化到本地

## 🏗 技术栈

| 类别 | 选型 |
|---|---|
| 桌面壳 | **Tauri 2.x** (Rust) |
| 前端 | **React 19** + **TypeScript** + **Vite 7** |
| 样式 | **Tailwind CSS 4** + CSS 变量主题系统 |
| 编辑器 | **CodeMirror 6** (`@uiw/react-codemirror`) |
| Markdown | **marked** + **Shiki** (懒加载 + 预热) |
| 状态 | **Zustand 5** |
| 图标 | **lucide-react** |

## 📦 开发

### 环境要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Rust** ≥ 1.77（用 `rustup` 安装）
- **Windows**：VS 2022 Build Tools + C++ 工作负载 + WebView2 Runtime
- **macOS**：Xcode Command Line Tools

### 安装与运行

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发模式（首次会下载 Rust 依赖，可能较慢）
pnpm tauri dev

# 3. 构建发布包
pnpm tauri build
```

### 启动性能（开发模式）

```
Vite 启动:  377ms
Cargo 编译: 4.25s（增量，依赖已缓存）
应用内存:  61.6MB
```

## 🪟 跨平台

| 平台 | 状态 |
|---|---|
| Windows 10/11 | ✅ WebView2 引导器内嵌（+1.8MB），Win10 首次安装自动下载 |
| macOS 11+ | ✅ 自定义标题栏（保留红绿灯），WKWebView 原生体验 |
| Linux | ⚠️ WebKitGTK（理论上支持，未测试） |

## 📁 项目结构

```
marklite/
├── src/                          # 前端源码
│   ├── App.tsx                   # 根组件
│   ├── main.tsx                  # 入口
│   ├── components/
│   │   ├── editor/               # CodeMirror 集成 + 5 个扩展
│   │   ├── preview/              # Markdown 预览 + Shiki
│   │   ├── layout/               # 标题栏/工具栏/状态栏/侧边栏/分割视图
│   │   ├── file/                 # 文件树/多 Tab
│   │   └── settings/             # 设置面板
│   ├── lib/
│   │   ├── tauri/                # Tauri fs/dialog 封装
│   │   ├── markdown/             # marked 解析 + Shiki 单例
│   │   └── utils/                # cn/debounce/throttle/platform
│   ├── stores/                   # Zustand: ui/editor/file/settings
│   └── styles/globals.css        # Tailwind 入口 + CSS 变量
│
└── src-tauri/                    # Rust 后端
    ├── Cargo.toml                # 4 个 Tauri 插件
    ├── tauri.conf.json           # WebView2 + macOS Overlay
    └── src/lib.rs                # 插件注册
```

## ⚙️ 配置项

- **主题**：亮 / 暗 / 跟随系统（持久化）
- **编辑器**：字号（10-24px）、字体（JetBrains Mono / SF Mono 等 6 种）、行号、自动换行、Tab 大小
- **自动保存**：可关闭，默认 2 秒防抖
- **滚动同步**：编辑 ↔ 预览，默认开
- **窗口状态**：位置/大小/最大化（`@tauri-apps/plugin-window-state`）

## 🚧 Roadmap

### M1（已完成）
- ✅ 双栏布局 + 5 个 CodeMirror 扩展
- ✅ marked + Shiki 渲染（带预热）
- ✅ 文件树 + 多 Tab
- ✅ 主题切换（亮/暗/系统）
- ✅ 自动保存 + 滚动同步
- ✅ 设置面板

### M2（待做）
- 性能调优：Shiki 懒加载优化、bundle 体积 < 10MB
- 跨平台打包（macOS .dmg / Windows .msi）
- 应用图标 + 关于页面
- 国际化（i18n）
- CI/CD（GitHub Actions）

## 📄 许可

MIT
