/**
 * 关于页面：项目信息、版本号
 */
import { ExternalLink } from "lucide-react";
import logoSvg from "@/assets/logo.svg";
import { version } from "../../../../package.json";
import { openUrl as openSystemUrl } from "@tauri-apps/plugin-opener";

export function AboutSection() {
  const handleGitHub = async () => {
    await openSystemUrl("https://github.com/zeno528/MarkLite");
  };

  const handleDefaultApps = async () => {
    // 打开 Windows「设置 → 应用 → 默认应用」页，引导用户手动将 .md 关联到 MarkLite
    // Windows 8+ 禁止程序自动改默认关联，只能引导用户手动设置
    try {
      await openSystemUrl("ms-settings:defaultapps");
    } catch (e) {
      console.error("[About] open default apps failed:", e);
    }
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

      {/* 设为默认 .md 程序 */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          设为默认 Markdown 程序
        </h3>
        <div className="rounded-lg bg-[var(--color-bg-muted)] p-4">
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            如需将 MarkLite 设为 Markdown 文件的默认打开程序，请在系统「默认应用」中，将
            <code className="mx-0.5 rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]">.md</code>
            与
            <code className="mx-0.5 rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]">.markdown</code>
            的默认应用指定为 MarkLite，设置完成后即可通过双击文件直接打开。
          </p>
          <button
            onClick={handleDefaultApps}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
          >
            打开系统设置
            <ExternalLink size={12} className="text-[var(--color-text-subtle)]" />
          </button>
        </div>
      </div>

    </div>
  );
}
