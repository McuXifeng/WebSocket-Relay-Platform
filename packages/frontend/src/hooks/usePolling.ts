/**
 * usePolling Hook
 * 智能轮询 Hook，支持页面可见性检测和自动暂停/恢复
 *
 * 功能：
 * - 页面可见时自动轮询
 * - 页面不可见时暂停轮询，节省资源
 * - 页面重新可见时立即执行一次回调
 * - 组件卸载时自动清理定时器
 */

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  /** 轮询间隔（毫秒） */
  interval: number;
  /** 是否启用轮询（默认 true） */
  enabled?: boolean;
  /** 页面不可见时是否继续轮询（默认 false） */
  pollWhenHidden?: boolean;
}

/**
 * 智能轮询 Hook
 *
 * @param callback - 轮询回调函数
 * @param options - 轮询配置
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePolling(
 *     () => fetchData(),
 *     { interval: 5000 } // 每 5 秒轮询一次
 *   );
 * }
 * ```
 */
export function usePolling(callback: () => void | Promise<void>, options: UsePollingOptions): void {
  const { interval, enabled = true, pollWhenHidden = false } = options;

  const savedCallback = useRef(callback);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);

  // 保存最新的 callback 到 ref（避免闭包问题）
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // 清理定时器的函数
  const clearPollingInterval = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // 启动定时器的函数
  const startPollingInterval = useCallback(() => {
    clearPollingInterval();
    intervalIdRef.current = setInterval(() => {
      void savedCallback.current();
    }, interval);
  }, [interval, clearPollingInterval]);

  // 监听页面可见性变化
  useEffect(() => {
    if (pollWhenHidden) {
      // 如果允许后台轮询，不需要监听可见性
      return;
    }

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isPageVisibleRef.current = isVisible;

      if (isVisible) {
        // 页面变为可见：立即执行一次回调，然后恢复轮询
        void savedCallback.current();
        if (enabled) {
          startPollingInterval();
        }
      } else {
        // 页面变为不可见：暂停轮询
        clearPollingInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pollWhenHidden, startPollingInterval, clearPollingInterval]);

  // 主轮询逻辑
  useEffect(() => {
    if (!enabled) {
      clearPollingInterval();
      return;
    }

    // 如果页面不可见且不允许后台轮询，不启动定时器
    if (!isPageVisibleRef.current && !pollWhenHidden) {
      return;
    }

    // 立即执行一次回调
    void savedCallback.current();

    // 启动定时器
    startPollingInterval();

    // 组件卸载时清理定时器
    return () => {
      clearPollingInterval();
    };
  }, [enabled, interval, pollWhenHidden, startPollingInterval, clearPollingInterval]);
}
