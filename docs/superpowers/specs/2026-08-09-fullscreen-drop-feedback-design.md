# 全屏拖放反馈设计

## 目标

将现有居中小卡片改为覆盖整个 MarkLite 窗口的拖放反馈，让用户在拖入 Markdown 文件或文件夹时立即知道窗口已接收拖放。文件与文件夹统一显示“释放以打开”。

## 交互

- Tauri 收到 `enter` 且包含路径时显示反馈层。
- `over` 保持当前反馈，不触发额外渲染。
- `leave` 或 `drop` 时立即隐藏反馈层。
- `drop` 后继续复用现有 `openTarget` 流程，不改变文件和文件夹的打开行为。
- 普通浏览器环境不注册 Tauri 拖放监听，避免缺少 Tauri metadata 时产生控制台错误。

## 视觉

- 使用 `fixed inset-0` 覆盖整个应用窗口，保持 `pointer-events-none`，不抢占拖放事件。
- 背景使用配色方案的 accent 色与应用背景做低比例混合，不使用 `backdrop-filter`。
- 距窗口边缘保留 12px，内部显示大圆角虚线边框。
- 中央显示放大的导入图标、主文案“释放以打开”和辅助文案“支持 Markdown 文件与文件夹”。
- 进入时执行约 150ms 的淡入和轻微缩放；`prefers-reduced-motion: reduce` 时关闭动画。

## 实现边界

- 继续使用 `App.tsx` 现有 `dragging` 布尔状态，不新增 store、组件或依赖。
- 复用当前主题 CSS 变量和 Tailwind v4 工具类。
- 仅在确有必要时向 `globals.css` 增加一个拖放反馈动画。
- 不加入拖放进度、文件数量、文件类型识别或成功动画。

## 验证

- `npx tsc --noEmit` 与生产构建通过。
- 普通浏览器打开 `http://localhost:1420/` 时不再出现 Tauri metadata 拖放监听错误。
- Tauri 窗口拖入文件或文件夹时反馈覆盖整窗，离开或放下后立即消失。
- 明暗主题和 reduced-motion 设置下均保持可读。
