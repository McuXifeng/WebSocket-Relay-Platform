import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Spin, Alert, Space, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useECharts } from '@/hooks/useECharts';
import type { EChartsOption } from 'echarts';
import {
  getDeviceData,
  type VisualizationCard,
  type LatestData,
  type CardConfig,
} from '@/services/visualization.service';

const { Text } = Typography;

interface GaugeCardProps {
  card: VisualizationCard;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 仪表盘卡片组件 - 展示设备数据的百分比或范围数据
 *
 * 功能:
 * - 使用 echarts gauge 图表类型展示百分比或范围数据(0-100%)
 * - 支持自定义最小值/最大值范围
 * - 支持三色阈值区间(绿色=正常，黄色=警告，红色=危险)
 * - 支持自定义单位配置(%, °C等)
 * - 定时轮询刷新数据(默认5秒,可配置)
 * - 响应式布局(自适应卡片尺寸)
 */
const GaugeCard: React.FC<GaugeCardProps> = ({ card, onEdit, onDelete }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<LatestData | null>(null);
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

    console.log('[GaugeCard] 卡片配置解析:', {
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.cardType,
      config: parsedConfig,
    });

    return parsedConfig;
  }, [card.config, card.id, card.title, card.cardType]);

  /**
   * 加载设备数据
   */
  const loadDeviceData = async (isInitial: boolean = false) => {
    console.log('[GaugeCard] 开始加载数据:', {
      isInitial,
      endpointId: card.endpointId,
      deviceId: card.deviceId,
      dataKey: card.dataKey,
    });

    if (!card.endpointId || !card.deviceId || !card.dataKey) {
      console.error('[GaugeCard] 卡片配置不完整');
      setError('卡片配置不完整:缺少端点ID、设备ID或数据字段');
      setLoading(false);
      return;
    }

    try {
      // 只在首次加载时显示 loading 状态
      if (isInitial) {
        setLoading(true);
      }
      setError(null);

      const response = await getDeviceData(card.endpointId, card.deviceId);
      console.log('[GaugeCard] 数据加载成功:', response);

      // 查找匹配的数据字段
      const matchedData = response.data.find((d) => d.key === card.dataKey);

      if (matchedData) {
        setData(matchedData);
      } else {
        // 未找到数据时,保持 data 为 null(等待设备上报数据)
        setData(null);
      }
    } catch (err) {
      console.error('[GaugeCard] 数据加载失败:', err);
      if (isInitial) {
        setError('加载数据失败: ' + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // 初始加载
  useEffect(() => {
    void loadDeviceData(true);
  }, [card.id, card.endpointId, card.deviceId, card.dataKey]);

  // 定时刷新(实时数据流更新)
  useEffect(() => {
    const refreshInterval = config.refreshInterval || 5000;

    if (!refreshInterval) {
      return; // 如果未配置刷新间隔,则不启动定时器
    }

    const interval = setInterval(() => {
      if (!document.hidden) {
        void loadDeviceData(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [card.id, config.refreshInterval, card.endpointId, card.deviceId, card.dataKey]);

  /**
   * 构建仪表盘 ECharts 配置
   */
  const buildGaugeOption = (): EChartsOption => {
    // 解析数据值
    const value = data ? parseFloat(data.value) : 0;
    const min = config.gaugeConfig?.min ?? 0;
    const max = config.gaugeConfig?.max ?? 100;
    const unit = config.gaugeConfig?.unit || config.unit || '%';

    // 计算阈值区间(默认三色区间:0-60%绿色,60-80%黄色,80-100%红色)
    const colorRanges = config.gaugeConfig?.colorRanges || [
      { threshold: 0.6, color: '#52c41a' }, // 绿色 0-60%
      { threshold: 0.8, color: '#faad14' }, // 黄色 60-80%
      { threshold: 1.0, color: '#ff4d4f' }, // 红色 80-100%
    ];

    return {
      series: [
        {
          type: 'gauge',
          min,
          max,
          splitNumber: 10,
          radius: '80%',
          axisLine: {
            lineStyle: {
              width: 20,
              color: colorRanges.map((range) => [range.threshold, range.color]),
            },
          },
          pointer: {
            itemStyle: {
              color: 'auto',
            },
            width: 4,
          },
          axisTick: {
            distance: -20,
            length: 6,
            lineStyle: {
              color: '#fff',
              width: 1,
            },
          },
          splitLine: {
            distance: -20,
            length: 20,
            lineStyle: {
              color: '#fff',
              width: 2,
            },
          },
          axisLabel: {
            color: 'auto',
            distance: 25,
            fontSize: 10,
          },
          detail: {
            valueAnimation: true,
            formatter: `{value} ${unit}`,
            color: 'auto',
            fontSize: 16,
            offsetCenter: [0, '70%'],
          },
          title: {
            show: false,
          },
          data: [{ value: isNaN(value) ? 0 : value }],
        },
      ],
    };
  };

  // 渲染图表
  useEffect(() => {
    console.log('[GaugeCard] 图表渲染检查:', {
      hasChart: !!chart,
      hasData: !!data,
      loading,
      error,
    });

    if (chart && data && !loading && !error) {
      // 确保图表容器已经显示(display: block)后再渲染
      requestAnimationFrame(() => {
        const option = buildGaugeOption();
        console.log('[GaugeCard] 图表配置:', option);
        chart.setOption(option, true); // 使用 notMerge=true 完全替换配置

        // 调用 resize 确保图表填充整个容器
        setTimeout(() => {
          console.log('[GaugeCard] 调用 resize');
          chart.resize();
          console.log('[GaugeCard] 图表渲染完成');
        }, 100);
      });
    }
  }, [chart, data, config.gaugeConfig, config.unit, loading, error]);

  return (
    <Card
      className="gauge-card"
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

      {/* 卡片内容 - 仪表盘图表 */}
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
            minHeight: '150px',
            display: loading || error || !data ? 'none' : 'block',
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
                  加载仪表盘数据中...
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
        {!loading && !error && !data && (
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
              message="等待数据"
              description={
                <div style={{ fontSize: '12px' }}>
                  <div>
                    设备尚未上报字段 <Text code>{card.dataKey}</Text>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      请确保设备发送的数据中包含此字段
                    </Text>
                  </div>
                </div>
              }
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

export default GaugeCard;
