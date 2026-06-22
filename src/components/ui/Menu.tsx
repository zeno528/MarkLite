/**
 * 轻量级下拉菜单组件（VSCode 风格）
 *
 * 支持：点击展开、点击外部关闭、hover 切换、Esc 关闭、子菜单飞出、勾选标记
 * 无第三方依赖，纯 React + CSS 实现
 */
import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MenuItem {
  type?: "item" | "separator" | "submenu";
  label?: string;
  shortcut?: string;
  icon?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  items?: MenuItem[];
}

interface MenuConfig {
  label: string;
  items: MenuItem[];
}

/** 水平菜单栏：渲染多个触发按钮，每个按钮对应一个下拉面板 */
export function MenuBar({ menus }: { menus: MenuConfig[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openIndex]);

  return (
    <div
      ref={containerRef}
      className="flex items-center"
      style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
    >
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            className={cn("titlebar-menu-trigger", openIndex === i && "active")}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onMouseEnter={() => { if (openIndex !== null && openIndex !== i) setOpenIndex(i); }}
          >
            {menu.label}
          </button>
          {openIndex === i && (
            <MenuPanel items={menu.items} onClose={() => setOpenIndex(null)} />
          )}
        </div>
      ))}
    </div>
  );
}

/** 下拉面板（含子菜单） */
function MenuPanel({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);

  return (
    <div className="titlebar-menu-panel">
      {items.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} className="titlebar-menu-separator" />;
        }

        const isSubmenu = item.type === "submenu";

        return (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => isSubmenu && setSubmenuIndex(i)}
            onMouseLeave={() => isSubmenu && setSubmenuIndex(null)}
          >
            <button
              className={cn(
                "titlebar-menu-item",
                item.disabled && "disabled",
              )}
              disabled={item.disabled}
              onClick={() => {
                if (!isSubmenu) {
                  item.onClick?.();
                  onClose();
                }
              }}
            >
              <span className="titlebar-menu-check">
                {item.checked && <Check size={13} />}
              </span>
              {item.icon && <span className="titlebar-menu-icon">{item.icon}</span>}
              <span className="titlebar-menu-label">{item.label}</span>
              {isSubmenu ? (
                <ChevronRight size={13} className="titlebar-menu-chevron" />
              ) : (
                item.shortcut && (
                  <span className="titlebar-menu-shortcut">{item.shortcut}</span>
                )
              )}
            </button>

            {/* 子菜单飞出 */}
            {isSubmenu && submenuIndex === i && item.items && (
              <div className="titlebar-menu-panel titlebar-submenu-panel">
                {item.items.map((sub, j) => {
                  if (sub.type === "separator") {
                    return <div key={j} className="titlebar-menu-separator" />;
                  }
                  return (
                    <button
                      key={j}
                      className={cn("titlebar-menu-item", sub.disabled && "disabled")}
                      disabled={sub.disabled}
                      onClick={() => {
                        sub.onClick?.();
                        onClose();
                      }}
                    >
                      <span className="titlebar-menu-check">
                        {sub.checked && <Check size={13} />}
                      </span>
                      {sub.icon && <span className="titlebar-menu-icon">{sub.icon}</span>}
                      <span className="titlebar-menu-label">{sub.label}</span>
                      {sub.shortcut && (
                        <span className="titlebar-menu-shortcut">{sub.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
