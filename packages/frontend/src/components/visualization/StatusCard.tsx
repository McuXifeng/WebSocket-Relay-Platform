import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Tag, Typography, Button, Spin, Alert, Space } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  getDeviceData,
  type VisualizationCard,
  type LatestData,
  type CardConfig,
} from '@/services/visualization.service';

const { Text } = Typography;

interface StatusCardProps {
  card: VisualizationCard;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 状态卡片颜色类型
 */
type StatusColor = 'success' | 'warning' | 'error' | 'default' | 'processing';

/**
 * 状态配置
 */
interface StatusMapping {
  color: StatusColor;
  text: string;
}

/**
 * 状态指示器卡片组件 - 展示设备数据的状态信息
 *
 * 功能:
 * - 使用 Ant Design Badge 组件显示状态灯(颜色:green/yellow/red/blue/gray)
 * - 使用 Ant Design Tag 组件显示状态文本
 * - 支持数值映射(如:0=离线/红色,1=在线/绿色)
 * - 支持文本映射(如:"online" → 绿色 + "在线","offline" → 红色 + "离线")
 * - 状态灯动画效果(使用 Badge 的 status 属性)
 * - 定时轮询刷新数据(默认5秒,可配置)
 */
const StatusCard: React.FC<StatusCardProps> = ({ card, onEdit, onDelete }) => {
  const [data, setData] = useState<LatestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

    console.log('[StatusCard] 卡片配置解析:', {
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.cardType,
      config: parsedConfig,
    });

    return parsedConfig;
  }, [card.config, card.id, card.title, card.cardType]);

  /**
   * 获取状态配置(根据数值或文本映射到状态)
   */
  const getStatusConfig = (): StatusMapping => {
    if (!data) {
      // 未获取到数据时,使用默认状态
      return config.statusConfig?.defaultStatus || { color: 'default', text: '未知' };
    }

    // 查找状态映射配置
    const statusMap = config.statusConfig?.statusMap || {};
    const dataValue = data.value.toString();

    // 优先匹配精确值
    if (statusMap[dataValue]) {
      return statusMap[dataValue];
    }

    // 尝试数值映射(兼容数字类型)
    const numValue = parseFloat(data.value);
    if (!isNaN(numValue) && statusMap[numValue.toString()]) {
      return statusMap[numValue.toString()];
    }

    // 未匹配到状态时,使用默认状态
    return config.statusConfig?.defaultStatus || { color: 'default', text: data.value };
  };

  /**
   * 加载设备数据
   */
  const loadDeviceData = async (isInitial: boolean = false) => {
    console.log('[StatusCard] 开始加载数据:', {
      isInitial,
      endpointId: card.endpointId,
      deviceId: card.deviceId,
      dataKey: card.dataKey,
    });

    if (!card.endpointId || !card.deviceId || !card.dataKey) {
      console.error('[StatusCard] 卡片配置不完整');
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
      console.log('[StatusCard] 数据加载成功:', response);

      // 查找匹配的数据字段
      const matchedData = response.data.find((d) => d.key === card.dataKey);

      if (matchedData) {
        setData(matchedData);
      } else {
        // 未找到数据时,保持 data 为 null(等待设备上报数据)
        setData(null);
      }
    } catch (err) {
      console.error('[StatusCard] 数据加载失败:', err);
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
   * 格式化更新时间
   */
  const formatUpdateTime = (): string => {
    if (!data) return '--';

    try {
      const timestamp = new Date(data.timestamp);
      return formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });
    } catch (err) {
      return '--';
    }
  };

  // 获取当前状态配置
  const statusConfig = getStatusConfig();

  return (
    <Card
      className="status-card"
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

      {/* 卡片内容 - 状态指示器 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Spin size="small" />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                加载中...
              </Text>
            </div>
          </div>
        ) : error ? (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            style={{ fontSize: '12px' }}
          />
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '8px 0', overflow: 'auto' }}>
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
              style={{ textAlign: 'left' }}
            />
          </div>
        ) : (
          <div style={{ overflow: 'hidden', textAlign: 'center' }}>
            {/* 状态灯和标签 - 添加动画效果 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '12px',
                transition: 'all 0.3s ease',
              }}
            >
              <Badge status={statusConfig.color} style={{ marginRight: '8px' }} />
              <Tag
                color={
                  statusConfig.color === 'success'
                    ? 'green'
                    : statusConfig.color === 'warning'
                      ? 'orange'
                      : statusConfig.color === 'error'
                        ? 'red'
                        : statusConfig.color === 'processing'
                          ? 'blue'
                          : 'default'
                }
                style={{
                  fontSize: '16px',
                  padding: '4px 12px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                }}
              >
                {statusConfig.text}
              </Tag>
            </div>

            {/* 更新时间 - 添加渐变动画 */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.3s ease',
              }}
            >
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {formatUpdateTime()}
              </Text>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatusCard;
