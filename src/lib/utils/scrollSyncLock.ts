/**
 * 滚动同步锁：防止编辑器↔预览同步时互相触发形成循环
 * 程序主动写 scrollTop 前置锁，对方的 scroll handler 检测到锁就跳过
 */
let syncing = false;
let unlockTimer: ReturnType<typeof setTimeout> | null = null;

/** 标记"正在程序同步"，在 trailing 时机解锁（等当前同步触发的 scroll 事件消化完）
 *  duration：锁窗口。编辑器→预览（同步直写 scrollTop）用默认 60ms；
 *  预览→编辑器方向用 CM scrollIntoView（下一帧才实际滚动，异步），需传更长窗口如 120ms 防回环 */
export function lockScrollSync(duration = 60) {
  syncing = true;
  if (unlockTimer) clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => {
    syncing = false;
    unlockTimer = null;
  }, duration);
}

/** 是否处于程序同步中（scroll handler 据此跳过） */
export function isScrollSyncing() {
  return syncing;
}
