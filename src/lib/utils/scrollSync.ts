/**
 * 滚动同步（编辑器 ↔ 预览）
 *
 * 核心原理：纯百分比映射
 * 编辑器滚动百分比 = 预览滚动百分比
 *
 * 为什么不用行号映射：
 * - 一行 `# 标题` 在编辑器是 1 行，在预览占 50px
 * - 一段 10 行文字在预览是一个块，高度远小于 10 行
 * - 编辑器有底部空白（可滚过最后一行），预览没有
 * - 行号→像素的映射是非线性的，无法精确对齐
 *
 * 百分比映射保证：
 * - 编辑器 0% ↔ 预览 0%
 * - 编辑器 100% ↔ 预览 100%
 * - 中间位置近似对齐（因为文档整体比例大致对应）
 *
 * 防回环：写对端前 lockScrollSync()，对端 scroll handler 入口 isScrollSyncing() 跳过。
 */
import { editorViewRef, previewContainerRef, previewBlocksRef } from "@/stores/editorStore";
import { lockScrollSync } from "./scrollSyncLock";

/** 预览块缓存项（供其他模块使用，如大纲高亮） */
export interface PreviewBlock {
  el: HTMLElement;
  line: number;
  top: number;
}

/**
 * 重建预览块缓存：解析后调用（供大纲等模块使用）
 */
export function rebuildPreviewBlocks(): void {
  const container = previewContainerRef.current;
  if (!container) {
    previewBlocksRef.current = [];
    return;
  }
  const containerTop = container.getBoundingClientRect().top;
  const els = container.querySelectorAll<HTMLElement>("[data-source-line]");
  const blocks: PreviewBlock[] = [];
  els.forEach((el) => {
    const line = parseInt(el.getAttribute("data-source-line") || "", 10);
    if (!Number.isFinite(line) || line <= 0) return;
    const top = el.getBoundingClientRect().top - containerTop + container.scrollTop;
    blocks.push({ el, line, top });
  });
  blocks.sort((a, b) => a.line - b.line);
  previewBlocksRef.current = blocks;
}

/** 编辑器→预览：百分比映射 */
export function syncPreviewFromEditor(): void {
  const view = editorViewRef.current;
  const container = previewContainerRef.current;
  if (!view || !container) return;
  const dom = view.scrollDOM;

  const editorMax = dom.scrollHeight - dom.clientHeight;
  const previewMax = container.scrollHeight - container.clientHeight;
  if (editorMax <= 0 || previewMax <= 0) return;

  const percent = dom.scrollTop / editorMax;
  lockScrollSync(60);
  container.scrollTop = previewMax * percent;
}

/** 预览→编辑器：百分比映射 */
export function syncEditorFromPreview(): void {
  const view = editorViewRef.current;
  const container = previewContainerRef.current;
  if (!view || !container) return;
  const dom = view.scrollDOM;

  const editorMax = dom.scrollHeight - dom.clientHeight;
  const previewMax = container.scrollHeight - container.clientHeight;
  if (editorMax <= 0 || previewMax <= 0) return;

  const percent = container.scrollTop / previewMax;
  lockScrollSync(120);
  dom.scrollTop = editorMax * percent;
}
