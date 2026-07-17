import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { lingui } from "@lingui/vite-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // plugin-react 6 用 Oxc 替代 Babel，但 @lingui/babel-plugin-lingui-macro
    // 是 babel 插件。用 @rolldown/plugin-babel 独立接入以支持 lingui 宏。
    // 必须在 react() 之后、lingui() 之前。
    babel({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    }),
    tailwindcss(),
    lingui(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // 性能优化：代码分割（按需懒加载大型库）
  // Vite 8 切换到 Rolldown 引擎，output.manualChunks 对象形式被移除。
  // 改用函数形式 manualChunks（Vite 8 deprecated 但仍支持）——
  // 通过返回 chunk 名映射到 vendor，最稳，可最大化 HTTP 缓存复用。
  build: {
    target: "esnext",
    // Vite 8 默认 minify 是 Oxc（Rust 实现，比 esbuild 更快）
    cssMinify: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // 通过路径里包名判断归属（兼容 pnpm 软链结构）
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react-vendor";
          }
          if (id.includes("/@uiw/") || id.includes("/@codemirror/") || id.includes("/@lezer/")) {
            return "codemirror-vendor";
          }
          if (id.includes("/marked/") || id.includes("/shiki/") || id.includes("/dompurify/") || id.includes("/marked-footnote/")) {
            return "markdown-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
