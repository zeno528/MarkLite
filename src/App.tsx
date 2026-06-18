/**
 * MarkLite 主应用
 * 布局：标题栏 + 工具栏 + 主体（侧边栏 + 双栏） + 状态栏
 */
import { useEffect, useState, lazy, Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SplitView } from "@/components/layout/SplitView";
import { EditorPane } from "@/components/editor/EditorPane";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { notify } from "@/stores/notificationStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileStore, FOLDERS_KEY, ACTIVE_FOLDER_KEY } from "@/stores/fileStore";
import { useEditorStore, ACTIVE_FILE_KEY } from "@/stores/editorStore";
import { FileService } from "@/lib/tauri/fs";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { warmupShiki } from "@/lib/markdown/shiki";
import { getMainWindow } from "@/lib/window";
import {
  openFileViaDialog,
  openFolderViaDialog,
  reloadCurrentFile,
  saveCurrentFile,
} from "@/lib/shortcuts/appShortcuts";
import { useRefreshStore } from "@/stores/refreshStore";

// 延迟加载非首屏组件
const SettingsDialog = lazy(() => import("@/components/settings/SettingsDialog").then(m => ({ default: m.SettingsDialog })));

export default function App() {
  const layout = useUIStore((s) => s.layout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval);
  const setReloading = useRefreshStore((s) => s.setReloading);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 初始化设置（延迟到首帧后，不阻塞渲染）
  useEffect(() => {
    const ric =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 1));
    const id = ric(() => {
      useSettingsStore.getState().init();
    });
    return () => {
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  // 自动刷新轮询
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      // 没有打开文件夹则跳过
      const { folders } = useFileStore.getState();
      if (folders.length === 0) return;

      // 静默模式刷新
      reloadCurrentFile(true).then((hasChanges) => {
        // 只有文件有变化时才显示动画和通知
        if (hasChanges) {
          setReloading(true);
          setTimeout(() => {
            setReloading(false);
            notify.info("已刷新");
          }, 500);
        }
      });
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, autoRefreshInterval, setReloading]);

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

        // 并行加载：所有文件夹的树 + 恢复上次打开的文件
        const promises: Promise<void>[] = [];

        // 读所有文件夹的树
        for (const folder of folders) {
          promises.push(
            FileService.readFolderTree(folder.path).then((tree) => {
              useFileStore.setState((state) => ({
                folders: state.folders.map((f) => (f.path === folder.path ? { ...f, fileTree: tree } : f)),
              }));
            }).catch((e) => {
              console.error("[App] restore read tree failed:", folder.path, e);
            })
          );
        }

        // 恢复上次打开的文件
        const lastFile = localStorage.getItem(ACTIVE_FILE_KEY);
        if (lastFile) {
          promises.push(
            (async () => {
              try {
                const ok = await FileService.fileExists(lastFile);
                if (!ok) {
                  localStorage.removeItem(ACTIVE_FILE_KEY);
                  notify.info("上次打开的文件已不存在");
                } else {
                  const content = await readTextFile(lastFile);
                  const title = lastFile.split(/[/\\]/).pop()!.replace(/\.(md|markdown|mdx)$/i, "");
                  useEditorStore.getState().openFile(lastFile, title, content);
                }
              } catch (e) {
                console.error("[App] restore active file failed:", e);
                localStorage.removeItem(ACTIVE_FILE_KEY);
              }
            })()
          );
        }

        // 等待所有并行任务完成
        await Promise.all(promises);
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
        case "f":
        case "F":
          e.preventDefault();
          useUIStore.getState().setSidebarTab("search");
          useUIStore.getState().setShowSidebar(true);
          useUIStore.getState().triggerSearchFocus();
          break;
        case "n":
        case "N":
          e.preventDefault();
          openFolderViaDialog();
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
      <ScrollToTop />
      <Suspense fallback={null}>
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>
      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
}
