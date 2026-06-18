import type { ComponentType } from "react";
import { Palette, Code2, FileText, Info } from "lucide-react";
import { AppearanceSection } from "./sections/AppearanceSection";
import { EditorSection } from "./sections/EditorSection";
import { MarkdownSection } from "./sections/MarkdownSection";
import { AboutSection } from "./sections/AboutSection";

/** 单个设置分类的注册项 */
export interface SettingsSection {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  Component: ComponentType;
}

/** 分类注册表 —— 新增分类只需在此数组 push 一行 + 建 section 组件 */
export const SECTIONS: SettingsSection[] = [
  { id: "appearance", label: "外观", icon: Palette, Component: AppearanceSection },
  { id: "editor", label: "编辑器", icon: Code2, Component: EditorSection },
  { id: "markdown", label: "Markdown", icon: FileText, Component: MarkdownSection },
  { id: "about", label: "关于", icon: Info, Component: AboutSection },
];

export type SectionId = (typeof SECTIONS)[number]["id"];
