# MarkLite

![Version](https://img.shields.io/badge/version-0.2.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D30707)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)
![Zustand](https://img.shields.io/badge/Zustand-5-443E58)

> 轻量、秒开的跨平台 Markdown 编辑器。

## 特性

- ⚡ **轻量** 
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
