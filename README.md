# MarkLite

![Version](https://img.shields.io/badge/version-0.2.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D30707)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)
![Zustand](https://img.shields.io/badge/Zustand-5-443E58)

> 轻量、秒开的跨平台 Markdown 编辑器。

## 特性

- 支持 .md / .markdown / .mdx 格式
- 极小体积，安装包不到 10MB
- 秒级启动，大文档编辑流畅
- 多种配色方案，可跟随系统
- 编辑器与预览实时同步滚动
- 自动保存，支持自动刷新

## 技术栈

| 类别 | 选型 |
|---|---|
| 桌面框架 | Tauri 2.x (Rust) |
| 前端 | React 19 + TypeScript + Vite 7 |
| 样式 | Tailwind CSS 4 |
| 编辑器 | CodeMirror 6 |
| Markdown | marked + Shiki |
| 状态管理 | Zustand 5 |

## 配置文件

用户设置（编辑器偏好、自动保存、自动刷新等）保存在 Tauri 应用数据目录：

| 平台 | 路径 |
|---|---|
| Windows | `C:\Users\{用户名}\AppData\Roaming\com.zwf.marklite\settings.json` |
| macOS | `~/Library/Application Support/com.zwf.marklite/settings.json` |
| Linux | `~/.local/share/com.zwf.marklite/settings.json` |
| macOS | `~/Library/Application Support/com.zwf.marklite/settings.json` |
| Linux | `~/.local/share/com.zwf.marklite/settings.json` |

卸载重装不会丢失配置；手动删除该文件可恢复默认设置。

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
