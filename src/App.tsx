/**
 * MarkLite 主应用
 * 布局：标题栏 + 工具栏 + 主体（侧边栏 + 双栏） + 状态栏
 */
import { useEffect, useState, useRef, lazy, Suspense, type MouseEvent as ReactMouseEvent } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { TitleBar } from "@/components/layout/TitleBar";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";
import { StatusBar } from "@/components/layout/StatusBar";
import { SidebarActivityBar, SidebarPanel } from "@/components/layout/Sidebar";
import { SplitView } from "@/components/layout/SplitView";
import { EditorPane } from "@/components/editor/EditorPane";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { notify } from "@/stores/notificationStore";
import { useUIStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileStore, FOLDERS_KEY, ACTIVE_FOLDER_KEY } from "@/stores/fileStore";
import { useEditorStore, ACTIVE_FILE_KEY } from "@/stores/editorStore";
import { FileService } from "@/lib/tauri/fs";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { warmupShiki } from "@/lib/markdown/shiki";
import { getMainWindow } from "@/lib/window";
import { getPlatformSync } from "@/lib/utils/platform";
import {
  newFile,
  openFileViaDialog,
  openFolderViaDialog,
  reloadCurrentFile,
  saveCurrentFile,
} from "@/lib/shortcuts/appShortcuts";
import { useRefreshStore } from "@/stores/refreshStore";

// 延迟加载非首屏组件
const SettingsDialog = lazy(() => import("@/components/settings/SettingsDialog").then(m => ({ default: m.SettingsDialog })));

const isMdPath = (p: string) => /\.(md|markdown|mdx)$/i.test(p);

/// 打开一个目标路径：.md 文件 → 载入编辑器；文件夹 → 加入侧边栏。
/// 供「命令行首启 / 文件关联首启 / 拖入窗口 / 已运行时收到 open-file 事件」四处复用，
/// 行为与拖入窗口的 drop 分支完全对齐（文件和文件夹都支持）。
async function openTarget(path: string): Promise<boolean> {
  try {
    const ok = await FileService.fileExists(path);
    if (!ok) {
      notify.error("无法打开：" + path);
      return false;
    }
    if (isMdPath(path)) {
      const content = await readTextFile(path);
      const title = path.split(/[/\\]/).pop()?.replace(/\.(md|markdown|mdx)$/i, "") ?? "untitled";
      useEditorStore.getState().openFile(path, title, content);
      useUIStore.getState().setFilesSubTab("recent");
      return true;
    }
    // 文件夹：加入侧边栏并切到文件树
    await useFileStore.getState().addFolder(path);
    useUIStore.getState().setSidebarTab("files");
    useUIStore.getState().setFilesSubTab("tree");
    return true;
  } catch (e) {
    console.error("[openTarget] failed:", path, e);
    notify.error("打开失败");
    return false;
  }
}

export default function App() {
  const layout = useUIStore((s) => s.layout);
  const showSidebar = useUIStore((s) => s.showSidebar);
  const autoRefresh = useSettingsStore((s) => s.autoRefresh);
  const autoRefreshInterval = useSettingsStore((s) => s.autoRefreshInterval);
  const setReloading = useRefreshStore((s) => s.setReloading);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, w: SIDEBAR_DEFAULT_WIDTH });

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
        // 文件有变化时只转一下刷新图标——自动刷新不打扰（外部频繁改动时通知条会刷屏）；
        // 手动刷新的「已刷新」反馈由 StatusBar 自行弹出
        if (hasChanges) {
          setReloading(true);
          setTimeout(() => setReloading(false), 500);
        }
      });
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, autoRefreshInterval, setReloading]);

  // 侧边栏宽度拖拽（仿 VSCode）：mousedown 锁定起点，mousemove 直接改 CSS 变量（零 re-render 最丝滑），
  // mouseup 写一次 store 持久化。用增量 delta，不依赖活动栏等布局偏移。
  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault();
    resizeStart.current = { x: e.clientX, w: useUIStore.getState().sidebarWidth };
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStart.current.x;
      const w = resizeStart.current.w + delta;
      const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, w));
      document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
    };
    const onUp = () => {
      const raw = document.documentElement.style.getPropertyValue("--sidebar-width");
      const w = parseFloat(raw);
      if (Number.isFinite(w)) useUIStore.getState().setSidebarWidth(w);
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

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

       // 命令行打开的文件（文件关联双击启动）——即使没有文件夹也要加载
       const initialFile = await invoke<string | null>("get_initial_file").catch(() => null);
       if (initialFile) {
          await openTarget(initialFile);
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

        // 恢复上次打开的文件（跳过已通过命令行打开的文件）
        const lastFile = initialFile ? null : localStorage.getItem(ACTIVE_FILE_KEY);
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

  // 已运行时收到 open-file 事件（single-instance 回调 emit）：拖文件到桌面图标/双击关联文件，
  // 第二个实例被单例插件拦截 → 文件路径转给当前实例打开
  useEffect(() => {
   const unlistenPromise = listen<string>("open-file", (event) => {
      openTarget(event.payload);
   });
    return () => { unlistenPromise.then((fn) => fn()); };
  }, []);

  // 拖拽文件到窗口：Tauri webview 事件做视觉反馈 + 文件读取
  // 依赖 tauri.conf.json 的 app.dragDropEnabled: true（默认）——若改为 false 以启用 HTML5 拖放，本监听将不触发
 useEffect(() => {
   const unlistenPromise = (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        return getCurrentWebview().onDragDropEvent(async (event) => {
          switch (event.payload.type) {
            case "enter":
              // enter 带 paths：任何内容都显示覆盖层，放下时再过滤
              setDragging(event.payload.paths.length > 0);
              break;
            case "over":
              // over 只带 position（无 paths），沿用 enter 的判断结果，无需改动
              break;
            case "leave":
              setDragging(false);
              break;
           case "drop": {
             setDragging(false);
             const paths = event.payload.paths;
             let handled = false;

              // 复用 openTarget（与首启/事件路径同一逻辑：.md 文件打开，文件夹加入侧边栏）
              for (const p of paths) {
                if (await openTarget(p)) handled = true;
              }

             if (!handled) {
               notify.warning("仅支持 .md 文件或文件夹");
             }
             break;
           }
          }
        });
      } catch (e) {
        console.error("[drag-drop] webview listener failed:", e);
        return null;
      }
    })();

    return () => { unlistenPromise.then((fn) => fn?.()); };
  }, []);

  // 启动时窗口防白屏：等首帧后 show()
  useEffect(() => {
    const showWindow = async () => {
      const win = getMainWindow();
      if (!win) return;
      try {
        // Windows/Linux：关闭系统装饰，改用自定义标题栏
        // macOS 保留原生装饰 + titleBarStyle:Overlay（红绿灯叠加）
        if (getPlatformSync() !== "macos") {
          await win.setDecorations(false);
        }
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
          if (e.shiftKey) {
            openFolderViaDialog();
          } else {
            newFile();
          }
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [settingsOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar
        onOpenSettings={() => setSettingsOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* 活动栏 - 始终可见 */}
        <SidebarActivityBar collapsed={!showSidebar} onToggle={() => useUIStore.getState().setShowSidebar(!showSidebar)} />
        {/* 面板 - 可折叠 */}
        <div
          className="flex shrink-0 overflow-hidden"
          style={{
            width: showSidebar ? "var(--sidebar-width)" : "0px",
            transition: isResizing ? "none" : "width 450ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="flex shrink-0"
            style={{
              width: "var(--sidebar-width)",
              transform: showSidebar ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <SidebarPanel />
          </div>
        </div>
        {/* 侧边栏宽度拖拽条（仿 VSCode）：拖动调节宽度，双击重置默认 */}
        {showSidebar && (
          <div
            onMouseDown={startResize}
            onDoubleClick={() => useUIStore.getState().setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
           title="拖动调节宽度（双击重置）"
           className="group relative w-0 shrink-0 cursor-col-resize before:absolute before:-inset-x-[3px] before:inset-y-0 before:cursor-col-resize before:content-['']"
         >
         </div>
        )}
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
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastContainer />
      <ConfirmDialog />
      {/* 拖拽文件覆盖层 */}
      {dragging && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-bg-elevated)] px-12 py-8 shadow-lg">
            <svg className="h-10 w-10 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <span className="text-sm font-medium text-[var(--color-accent)]">释放以打开文件</span>
          </div>
        </div>
      )}
    </div>
  );
}

