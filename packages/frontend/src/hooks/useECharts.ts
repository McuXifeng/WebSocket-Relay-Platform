import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

/**
 * useECharts Hook 配置选项
 */
interface UseEChartsOptions {
  /**
   * 是否启用响应式（窗口大小变化时自动调整图表尺寸）
   * @default true
   */
  responsive?: boolean;

  /**
   * ECharts 主题
   * @default undefined - 使用默认主题
   */
  theme?: string;
}

/**
 * useECharts - 封装 ECharts 初始化和销毁逻辑的 React Hook
 *
 * 功能：
 * - 自动初始化和销毁 ECharts 实例
 * - 响应式支持（窗口大小变化时自动调整图表尺寸）
 * - 主题支持
 * - 内存泄漏防护
 *
 * @param chartRef - 图表容器的 React ref
 * @param options - 配置选项
 * @returns ECharts 实例
 *
 * @example
 * ```tsx
 * const chartRef = useRef<HTMLDivElement>(null);
 * const chart = useECharts(chartRef, { responsive: true });
 *
 * useEffect(() => {
 *   if (chart) {
 *     chart.setOption({
 *       xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
 *       yAxis: { type: 'value' },
 *       series: [{ data: [120, 200, 150], type: 'line' }]
 *     });
 *   }
 * }, [chart]);
 * ```
 */
export function useECharts(
  chartRef: React.RefObject<HTMLDivElement>,
  options: UseEChartsOptions = {}
): echarts.ECharts | null {
  const { responsive = true, theme } = options;

  // 存储 ECharts 实例
  const [chart, setChart] = useState<echarts.ECharts | null>(null);

  // 存储 resize 监听器的引用（用于清理）
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  // 初始化和销毁 ECharts 实例
  useEffect(() => {
    console.log('[useECharts] 初始化检查:', {
      hasRef: !!chartRef,
      hasCurrent: !!chartRef.current,
      currentElement: chartRef.current,
      theme,
      responsive,
    });

    // 检查容器是否已挂载
    if (!chartRef.current) {
      console.warn('[useECharts] 容器DOM未准备好，跳过初始化');
      return;
    }

    console.log('[useECharts] 开始初始化 ECharts 实例');

    // 初始化 ECharts 实例
    const instance = echarts.init(chartRef.current, theme);
    console.log('[useECharts] ECharts 实例初始化成功:', instance);
    setChart(instance);

    // 响应式支持
    if (responsive) {
      const handleResize = () => {
        // 使用 requestAnimationFrame 优化性能
        requestAnimationFrame(() => {
          instance.resize();
        });
      };

      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);
    }

    // 清理函数 - 销毁 ECharts 实例和移除事件监听器
    return () => {
      console.log('[useECharts] 清理 ECharts 实例');
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }

      instance.dispose();
      setChart(null);
    };
  }, [chartRef, theme, responsive]);

  return chart;
}
