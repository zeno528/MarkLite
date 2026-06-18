/**
 * MarkLite 主应用
 * 布局：标题栏 + 工具栏 + 主体（侧边栏 + 双栏） + 状态栏
 */
import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SplitView } from "@/components/layout/SplitView";
import { EditorPane } from "@/components/editor/EditorPane";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ToastContainer } from "@/components/ui/Toast";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileStore, FOLDERS_KEY, ACTIVE_FOLDER_KEY } from "@/stores/fileStore";
import { FileService } from "@/lib/tauri/fs";
import { warmupShiki } from "@/lib/markdown/shiki";
import { getMainWindow } from "@/lib/window";
import {
  openFileViaDialog,
  reloadCurrentFile,
  saveCurrentFile,
} from "@/lib/shortcuts/appShortcuts";

export default function App() {
  const layout = useUIStore((s) => s.layout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 初始化设置
  useEffect(() => {
    useSettingsStore.getState().init();
  }, []);

  // 启动恢复上次打开的文件夹列表（多文件夹持久化），并读激活文件夹的树
  useEffect(() => {
    const restore = async () => {
      try {
        let folders: { path: string; fileTree: never[]; expanded: string[]; selectedPath: null }[] = [];
        let active: string | null = null;
        const metaJson = localStorage.getItem(FOLDERS_KEY);
        if (metaJson) {
          const meta = JSON.parse(metaJson);
          folders = meta.map((m: { path: string; expanded?: string[]; selectedPath?: string | null }) => ({
            path: m.path,
            fileTree: [],
            expanded: m.expanded ?? [],
            selectedPath: m.selectedPath ?? null,
          }));
          active = localStorage.getItem(ACTIVE_FOLDER_KEY) ?? folders[0]?.path ?? null;
        } else {
          // 兼容旧 marklite:rootfolder（单文件夹）迁移
          const old = localStorage.getItem("marklite:rootfolder");
          if (old) {
            folders = [{ path: old, fileTree: [], expanded: [], selectedPath: null }];
            active = old;
          }
        }
        if (folders.length === 0) return;
        useFileStore.setState({ folders, activeFolderPath: active });
        // 读激活文件夹的树
        if (active) {
          try {
            const tree = await FileService.readFolderTree(active);
            useFileStore.setState((state) => ({
              folders: state.folders.map((f) => (f.path === active ? { ...f, fileTree: tree } : f)),
            }));
          } catch (e) {
            console.error("[App] restore read tree failed:", e);
          }
        }
      } catch (e) {
        console.error("[App] restore folders failed:", e);
      }
    };
    restore();
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

  // 监听系统明暗变化（仅当配色方案为「跟随系统」时生效）
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      useUIStore.getState().applySystemScheme(e.matches);
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

  // 全局快捷键（不依赖编辑器焦点，任何位置都生效）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === "Escape" && settingsOpen) setSettingsOpen(false);
        return;
      }
      switch (e.key) {
        case ",":
          e.preventDefault();
          setSettingsOpen((v) => !v);
          break;
        case "o":
        case "O":
          e.preventDefault();
          openFileViaDialog();
          break;
        case "s":
        case "S":
          e.preventDefault(); // 阻止浏览器/Tauri 默认保存
          saveCurrentFile();
          break;
        case "r":
        case "R":
          e.preventDefault(); // 阻止浏览器刷新页面
          reloadCurrentFile();
          break;
        case "\\":
          e.preventDefault();
          useUIStore.getState().toggleSidebar();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [settingsOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
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
      <ToastContainer />
    </div>
  );
}
