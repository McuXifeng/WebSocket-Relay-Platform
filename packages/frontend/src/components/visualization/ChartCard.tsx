import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Spin, Alert, Space, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useECharts } from '@/hooks/useECharts';
import type { EChartsOption } from 'echarts';
import {
  getDeviceDataHistory,
  type VisualizationCard,
  type DeviceDataHistoryResponse,
  type CardConfig,
} from '@/services/visualization.service';

const { Text } = Typography;

interface ChartCardProps {
  card: VisualizationCard;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 图表卡片组件 - 展示设备数据的时间序列图表（折线图、柱状图）
 *
 * 功能：
 * - 支持折线图和柱状图两种图表类型
 * - 支持时间范围选择（快捷选项：1小时、24小时、7天、自定义）
 * - 支持多设备数据对比（同一图表显示多条曲线）
 * - 支持实时数据流更新（定时轮询）
 * - 支持图表交互（缩放、平移、悬停提示）
 * - 响应式布局（自适应卡片尺寸）
 */
const ChartCard: React.FC<ChartCardProps> = ({ card, onEdit, onDelete }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartDataList, setChartDataList] = useState<DeviceDataHistoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 使用自定义钩子初始化 ECharts 实例
  const chart = useECharts(chartRef, {
    responsive: true,
    theme: 'light',
  });

  // 解析卡片配置
  const config: CardConfig = useMemo(() => {
    let parsedConfig: CardConfig;
    if (typeof card.config === 'string') {
      try {
        parsedConfig = JSON.parse(card.config) as CardConfig;
      } catch {
        parsedConfig = card.config as CardConfig;
      }
    } else {
      parsedConfig = card.config;
    }

    // 调试日志
    console.log('[ChartCard] 卡片配置解析:', {
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.cardType,
      config: parsedConfig,
      dataSources: parsedConfig.dataSources,
      timeRange: parsedConfig.timeRange,
    });

    return parsedConfig;
  }, [card.config, card.id, card.title, card.cardType]);

  /**
   * 计算时间范围
   */
  const getTimeRange = (): { startTime: string; endTime: string } => {
    const now = new Date();
    const endTime = now.toISOString();

    if (config.timeRange?.type === 'quick') {
      let startTime: string;
      switch (config.timeRange.quick) {
        case '1h':
          startTime = new Date(now.getTime() - 3600000).toISOString();
          break;
        case '24h':
          startTime = new Date(now.getTime() - 86400000).toISOString();
          break;
        case '7d':
          startTime = new Date(now.getTime() - 604800000).toISOString();
          break;
        default:
          startTime = new Date(now.getTime() - 3600000).toISOString();
      }
      return { startTime, endTime };
    } else if (config.timeRange?.type === 'custom' && config.timeRange.custom) {
      return config.timeRange.custom;
    } else {
      // 默认：最近1小时
      return {
        startTime: new Date(now.getTime() - 3600000).toISOString(),
        endTime,
      };
    }
  };

  /**
   * 根据时间范围决定聚合粒度
   */
  const determineAggregation = (
    startTime: string,
    endTime: string
  ): 'minute' | 'hour' | 'day' | undefined => {
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = duration / 3600000;

    // 如果配置中明确指定了聚合粒度，优先使用配置
    if (config.aggregation) {
      return config.aggregation;
    }

    // 自动决策聚合粒度
    if (hours <= 1) return 'minute';
    if (hours <= 24) return 'hour';
    return 'day';
  };

  /**
   * 加载图表数据
   */
  const loadChartData = async (isInitial: boolean = false) => {
    console.log('[ChartCard] 开始加载数据:', {
      isInitial,
      endpointId: card.endpointId,
      dataSources: config.dataSources,
    });

    if (!card.endpointId) {
      console.error('[ChartCard] 缺少端点ID');
      setError('卡片配置不完整：缺少端点ID');
      setLoading(false);
      return;
    }

    // 检查是否配置了数据源
    if (!config.dataSources || config.dataSources.length === 0) {
      console.error('[ChartCard] 未配置数据源');
      setError('卡片配置不完整：未配置数据源');
      setLoading(false);
      return;
    }

    try {
      // 只在首次加载时显示 loading 状态
      if (isInitial) {
        setLoading(true);
      }
      setError(null);

      const { startTime, endTime } = getTimeRange();
      const aggregation = determineAggregation(startTime, endTime);

      console.log('[ChartCard] 时间范围:', { startTime, endTime, aggregation });

      // 批量加载多设备数据
      const dataPromises = config.dataSources.map((source) => {
        console.log('[ChartCard] 加载数据源:', source);
        return getDeviceDataHistory(
          card.endpointId!,
          source.deviceId,
          source.dataKey,
          startTime,
          endTime,
          aggregation,
          undefined, // aggregateType - 图表暂时使用默认的平均值
          config.maxDataPoints || 1000
        );
      });

      const results = await Promise.all(dataPromises);
      console.log('[ChartCard] 数据加载成功:', results);
      setChartDataList(results);
    } catch (err) {
      console.error('[ChartCard] 数据加载失败:', err);
      if (isInitial) {
        setError('加载图表数据失败: ' + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // 初始加载
  useEffect(() => {
    void loadChartData(true);
  }, [
    card.id,
    card.endpointId,
    JSON.stringify(config.dataSources),
    JSON.stringify(config.timeRange),
  ]);

  // 定时刷新（实时数据流更新）
  useEffect(() => {
    const refreshInterval = config.refreshInterval || 5000;

    if (!refreshInterval) {
      return; // 如果未配置刷新间隔，则不启动定时器
    }

    const interval = setInterval(() => {
      if (!document.hidden) {
        void loadChartData(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    card.id,
    config.refreshInterval,
    JSON.stringify(config.dataSources),
    JSON.stringify(config.timeRange),
  ]);

  /**
   * 构建 ECharts 配置
   */
  const buildEChartsOption = (): EChartsOption => {
    return {
      title: {
        text: card.title,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';

          interface TooltipParam {
            value: [string | number | Date, number];
            color: string;
            seriesName: string;
          }

          const typedParams = params as TooltipParam[];
          const time = new Date(typedParams[0].value[0]).toLocaleString('zh-CN');
          let result = `<div style="font-weight: bold; margin-bottom: 4px;">${time}</div>`;

          typedParams.forEach((param) => {
            const value = param.value[1];
            const unit = config.unit || '';
            result += `
              <div style="display: flex; align-items: center; margin-top: 4px;">
                <span style="display:inline-block;margin-right:8px;border-radius:50%;width:10px;height:10px;background-color:${param.color};"></span>
                <span style="flex: 1;">${param.seriesName}:</span>
                <span style="font-weight: bold; margin-left: 8px;">${value} ${unit}</span>
              </div>
            `;
          });

          return result;
        },
      },
      legend: {
        data: config.dataSources?.map((ds) => ds.label) || [],
        bottom: 0,
        type: 'scroll',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value} ${config.unit || ''}`,
        },
      },
      series: chartDataList.map((data, index) => ({
        name: config.dataSources?.[index]?.label || data.dataKey,
        type: config.chartType || 'line',
        data: data.records.map((r) => [r.timestamp, r.value]),
        smooth: true,
        lineStyle: {
          color: config.dataSources?.[index]?.color || undefined,
          width: 2,
        },
        itemStyle: {
          color: config.dataSources?.[index]?.color || undefined,
        },
        areaStyle:
          config.chartType === 'line'
            ? {
                opacity: 0.1,
              }
            : undefined,
      })),
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: '区域缩放',
              back: '还原',
            },
          },
          restore: {
            title: '还原',
          },
          saveAsImage: {
            title: '保存为图片',
          },
        },
        right: '5%',
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          start: 0,
          end: 100,
          handleSize: '80%',
          height: 20,
        },
      ],
    };
  };

  // 渲染图表
  useEffect(() => {
    console.log('[ChartCard] 图表渲染检查:', {
      hasChart: !!chart,
      chartDataListLength: chartDataList.length,
      chartDataList,
      loading,
      error,
    });

    if (chart && chartDataList.length > 0 && !loading && !error) {
      // 确保图表容器已经显示（display: block）后再渲染
      // 使用 requestAnimationFrame 确保DOM更新完成
      requestAnimationFrame(() => {
        const option = buildEChartsOption();
        console.log('[ChartCard] 图表配置:', option);
        chart.setOption(option, true); // 使用 notMerge=true 完全替换配置

        // 调用 resize 确保图表填充整个容器
        setTimeout(() => {
          console.log('[ChartCard] 调用 resize');
          chart.resize();
          console.log('[ChartCard] 图表渲染完成');
        }, 100);
      });
    }
  }, [chart, chartDataList, config.chartType, config.unit, loading, error]);

  return (
    <Card
      className="chart-card"
      style={{
        height: '100%',
        width: '100%',
        borderColor: '#d9d9d9',
        borderWidth: '1px',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
      styles={{
        body: {
          padding: '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      hoverable
    >
      {/* 卡片头部 - 标题和操作按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          minHeight: '32px',
          overflow: 'hidden',
        }}
      >
        <div
          className="drag-handle"
          style={{
            flex: 1,
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Space size="small" style={{ minWidth: 0, overflow: 'hidden' }}>
            <DragOutlined style={{ fontSize: '14px', color: '#999', flexShrink: 0 }} />
            <Text
              strong
              style={{
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
              title={card.title}
            >
              {card.title}
            </Text>
          </Space>
        </div>
        <Space size="small" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={onDelete} danger />
        </Space>
      </div>

      {/* 卡片内容 - 图表 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* 图表容器 - 始终渲染以确保 ECharts 能正确初始化 */}
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
            display:
              loading ||
              error ||
              chartDataList.length === 0 ||
              chartDataList.every((data) => data.records.length === 0)
                ? 'none'
                : 'block',
          }}
        />

        {/* 加载状态 */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  加载图表数据中...
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {!loading && error && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }}
          >
            <Alert
              message="加载失败"
              description={error}
              type="error"
              showIcon
              style={{ fontSize: '12px', width: '100%' }}
            />
          </div>
        )}

        {/* 无数据状态 */}
        {!loading &&
          !error &&
          (chartDataList.length === 0 ||
            chartDataList.every((data) => data.records.length === 0)) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
              }}
            >
              <Alert
                message="暂无数据"
                description="所选时间范围内暂无数据，请检查设备是否在线或调整时间范围"
                type="info"
                showIcon
                style={{ fontSize: '12px', width: '100%' }}
              />
            </div>
          )}
      </div>
    </Card>
  );
};

export default ChartCard;
