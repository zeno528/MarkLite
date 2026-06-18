/**
 * 关于页面：项目信息、版本号、技术栈
 */
import { ExternalLink } from "lucide-react";
import logoSvg from "@/assets/logo.svg";
import { version } from "../../../../package.json";
import { openUrl } from "@tauri-apps/plugin-opener";

export function AboutSection() {
  const handleGitHub = async () => {
    await openUrl("https://github.com/zeno528/MarkLite");
  };

  return (
    <div className="space-y-6">
      {/* Logo + 名称 */}
      <div className="flex items-center gap-3">
        <img src={logoSvg} alt="MarkLite" className="h-12 w-12" />
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">MarkLite</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
              版本 · v{version}
            </span>
            <button
              onClick={handleGitHub}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2.5 py-[2.3px] text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
              <ExternalLink size={11} className="text-[var(--color-text-subtle)]" />
            </button>
          </div>
        </div>
      </div>

      {/* 项目简介 */}
      <div className="rounded-lg bg-[var(--color-bg-muted)] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-text)]">
          基于 Tauri 2 + React 19 + CodeMirror 6 的轻量级跨平台 Markdown 编辑器。
          追求极好的性能、极小的占用和极快的启动速度。
        </p>
      </div>

      {/* 技术栈 */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          技术栈
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">前端：</span>
            <span className="text-[var(--color-text)]">React 19 + TypeScript</span>
          </div>
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">编辑器：</span>
            <span className="text-[var(--color-text)]">CodeMirror 6</span>
          </div>
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">框架：</span>
            <span className="text-[var(--color-text)]">Tauri 2</span>
          </div>
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">样式：</span>
            <span className="text-[var(--color-text)]">Tailwind CSS v4</span>
          </div>
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">状态：</span>
            <span className="text-[var(--color-text)]">Zustand 5</span>
          </div>
          <div className="rounded-md bg-[var(--color-bg-muted)] px-3 py-2">
            <span className="text-[var(--color-text-muted)]">构建：</span>
            <span className="text-[var(--color-text)]">Vite 7</span>
          </div>
        </div>
      </div>

      {/* 特性 */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          特性
        </h3>
        <ul className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />
            极小的安装包体积（&lt;10MB）
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />
            秒级启动，大文档不卡顿
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />
            3 种配色方案 + 系统跟随
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />
            编辑器与预览实时同步滚动
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" />
            自动保存 + 自动刷新
          </li>
        </ul>
      </div>

    </div>
  );
}
