/**
 * MarkLite 主应用
 * 布局：标题栏 + 工具栏 + 主体（侧边栏 + 双栏） + 状态栏
 */
import { useEffect, useState } from "react";
import { TitleBar } from "@/components/layout/TitleBar";
import { EditorToolbar } from "@/components/layout/EditorToolbar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SplitView } from "@/components/layout/SplitView";
import { EditorPane } from "@/components/editor/EditorPane";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { warmupShiki } from "@/lib/markdown/shiki";
import { getMainWindow } from "@/lib/window";

export default function App() {
  const layout = useUIStore((s) => s.layout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 初始化设置
  useEffect(() => {
    useSettingsStore.getState().init();
  }, []);

  // 启动后预热 Shiki（idle 时）
  useEffect(() => {
    const ric =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 100));
    const id = ric(() => {
      warmupShiki();
    });
    return () => {
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const theme = useUIStore.getState().theme;
      if (theme === "system") {
        useUIStore.getState().setResolvedTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 启动时窗口防白屏：等首帧后 show()
  useEffect(() => {
    const showWindow = async () => {
      const win = getMainWindow();
      if (!win) return;
      try {
        await win.show();
      } catch (e) {
        console.error("[App] show window failed:", e);
      }
    };
    requestAnimationFrame(() => {
      showWindow();
    });
  }, []);

  // 全局快捷键：Cmd/Ctrl+, 打开设置
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((v) => !v);
      }
      if (e.key === "Escape" && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [settingsOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar />
      <EditorToolbar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {layout === "split" && (
            <SplitView left={<EditorPane />} right={<MarkdownPreview />} />
          )}
          {layout === "editor-only" && <EditorPane />}
          {layout === "preview-only" && <MarkdownPreview />}
        </main>
      </div>
      <StatusBar />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
