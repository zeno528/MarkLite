/**
 * className 合并工具（shadcn/ui 标准）
 * 合并 className，自动去重 Tailwind 类名
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
