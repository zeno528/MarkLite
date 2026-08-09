# Fullscreen Drop Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small drag card with a theme-aware full-window “释放以打开” feedback layer and prevent browser-only sessions from registering Tauri drag listeners.

**Architecture:** Keep the existing `dragging: boolean` state and Tauri `onDragDropEvent` flow in `App.tsx`. Render one pointer-transparent overlay from that state and add one CSS animation with a reduced-motion override; no new component, store, or dependency.

**Tech Stack:** React 19, TypeScript, Tauri 2 window events, Tailwind CSS v4, existing CSS theme variables.

## Global Constraints

- File and folder drops use the same text: “释放以打开”.
- Do not add dependencies, stores, progress UI, item counting, type detection, or success animation.
- Preserve the existing `openTarget` drop behavior.
- Do not use `backdrop-filter`.
- Keep the feedback layer pointer-transparent and compatible with all color schemes.

---

### Task 1: Full-window drag feedback

**Files:**
- Modify: `src/App.tsx:260-302,494-507`
- Modify: `src/styles/globals.css:306-315`
- Modify: `src/locales/{zh-CN,en}/messages.po`
- Modify: `src/locales/{zh-CN,en}/messages.ts`

**Interfaces:**
- Consumes: existing `dragging: boolean`, `setDragging(boolean)`, and `openTarget(path): Promise<boolean>`.
- Produces: browser-safe listener registration and a full-window visual layer controlled only by `dragging`.

- [ ] **Step 1: Record the failing browser check**

Open `http://localhost:1420/` outside Tauri and confirm the current Vite client log contains:

```text
[drag-drop] webview listener failed: TypeError: Cannot read properties of undefined (reading 'metadata')
```

- [ ] **Step 2: Guard Tauri-only listener registration**

At the start of the drag/drop `useEffect`, return early when `window.__TAURI_INTERNALS__` is unavailable:

```ts
if (!(window as any).__TAURI_INTERNALS__) return;
```

Keep the existing `enter`, `over`, `leave`, and `drop` branches unchanged.

- [ ] **Step 3: Replace the compact card with the approved full-window layer**

Render a fixed, pointer-transparent overlay with a low-opacity accent/background mix, a 12px inset dashed frame, a circular import icon, the main text “释放以打开”, and helper text “支持 Markdown 文件与文件夹”. Use existing theme variables only.

- [ ] **Step 4: Add the minimal animation and motion fallback**

Add one `drop-feedback-in` keyframe that fades and scales the inner feedback content over 150ms. Disable that animation under:

```css
@media (prefers-reduced-motion: reduce) {
  .drop-feedback-content { animation: none; }
}
```

- [ ] **Step 5: Synchronize localized feedback text**

Wrap both user-visible strings with `Trans`, run `pnpm lingui:sync`, translate the two new English entries as “Release to Open” and “Supports Markdown Files and Folders”, then compile the catalogs.

- [ ] **Step 6: Run automated verification**

Run:

```powershell
& $taskNode node_modules\typescript\bin\tsc --noEmit
& $taskNode $taskPnpm build
git diff --check
```

Expected: all commands exit `0`; the build may retain the already-known large-chunk and ineffective-dynamic-import warnings.

- [ ] **Step 7: Verify both runtimes**

- Browser: refresh `http://localhost:1420/` and confirm no new Tauri metadata drag-listener error.
- Tauri: drag a Markdown file and a folder over the window; the feedback covers the full window and disappears on leave/drop.
- Themes: confirm the overlay stays readable in the current light/dark scheme.

- [ ] **Step 8: Review the final diff**

Confirm only the intended sections of `src/App.tsx` and `src/styles/globals.css` changed, with no new dependency or state module.
