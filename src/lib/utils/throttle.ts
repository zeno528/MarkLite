/**
 * 节流：限制函数在 delay ms 内最多执行一次
 * 用 trailing 模式保证最后一次一定执行
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): T & { cancel: () => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  const throttled = ((...args: any[]) => {
    const now = Date.now();
    const remaining = delay - (now - last);
    lastArgs = args;

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn(...args);
      lastArgs = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  return throttled;
}
