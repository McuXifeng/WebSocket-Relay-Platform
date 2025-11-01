import React, { useState, useEffect } from 'react';
import { Card, Statistic, Typography, Button, Spin, Alert, Space } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  getDeviceData,
  type VisualizationCard,
  type LatestData,
} from '@/services/visualization.service';

const { Text } = Typography;

interface DataStatisticCardProps {
  card: VisualizationCard;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * 数值卡片组件
 *
 * 功能：
 * - 展示设备数据的实时数值
 * - 支持单位和精度配置
 * - 显示数据更新时间
 * - 根据阈值配置显示不同颜色（绿色/橙色/红色）
 * - 支持编辑和删除操作
 * - 可拖拽
 */
const DataStatisticCard: React.FC<DataStatisticCardProps> = ({ card, onEdit, onDelete }) => {
  const [data, setData] = useState<LatestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 加载设备数据（首次加载）
  useEffect(() => {
    loadDeviceData(true); // 首次加载时传入 true
  }, [card.deviceId, card.dataKey, card.endpointId]);

  // 定时轮询逻辑（每5秒刷新数据）
  useEffect(() => {
    // 获取配置的刷新间隔，默认5000ms（5秒）
    const refreshInterval = card.config.refreshInterval || 5000;

    // 页面可见性检查
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时，清除定时器
        if (intervalId) {
          clearInterval(intervalId);
        }
      } else {
        // 页面可见时，立即刷新数据并重新启动定时器
        loadDeviceData(false); // 后续刷新时传入 false
        startPolling();
      }
    };

    // 启动轮询
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(() => {
        if (!document.hidden) {
          loadDeviceData(false); // 后续刷新时传入 false
        }
      }, refreshInterval);
    };

    // 初始启动轮询
    startPolling();

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [card.deviceId, card.dataKey, card.endpointId, card.config.refreshInterval]);

  /**
   * 从服务器加载设备数据
   * @param isInitial - 是否为首次加载（首次加载显示 loading，后续刷新不显示）
   */
  const loadDeviceData = async (isInitial: boolean = false) => {
    if (!card.endpointId || !card.deviceId || !card.dataKey) {
      setError('卡片配置不完整');
      setLoading(false);
      return;
    }

    try {
      // 只在首次加载时显示 loading 状态，后续刷新时静默更新
      if (isInitial) {
        setLoading(true);
      }
      setError(null);
      const response = await getDeviceData(card.endpointId, card.deviceId);

      // 查找匹配的数据字段
      const matchedData = response.data.find((d) => d.key === card.dataKey);

      if (matchedData) {
        setData(matchedData);
      } else {
        // 未找到数据时，保持 data 为 null（等待设备上报数据）
        setData(null);
      }
    } catch (err) {
      console.error('Failed to load device data:', err);
      // 只在首次加载失败时显示错误，后续刷新失败时保持原有数据
      if (isInitial) {
        setError('加载数据失败');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  /**
   * 计算卡片颜色（基于阈值）
   * @returns 颜色代码或 undefined
   */
  const getCardColor = (): string | undefined => {
    if (!data || !card.config.threshold) return card.config.color;

    const value = parseFloat(data.value);
    if (isNaN(value)) return card.config.color;

    const { warning, danger } = card.config.threshold;

    if (danger !== undefined && value >= danger) {
      return '#ff4d4f'; // 红色 - 危险
    }
    if (warning !== undefined && value >= warning) {
      return '#faad14'; // 橙色 - 警告
    }
    return '#52c41a'; // 绿色 - 正常
  };

  /**
   * 计算数值样式（基于阈值）
   * @returns 数值颜色
   */
  const getValueStyle = () => {
    const color = getCardColor();
    return { color: color || '#1890ff', fontWeight: 600 };
  };

  /**
   * 获取卡片边框颜色
   */
  const getBorderColor = (): string => {
    const color = getCardColor();
    return color || '#d9d9d9';
  };

  /**
   * 格式化数值
   */
  const formatValue = (): string | number => {
    if (!data) return 0;

    const value = parseFloat(data.value);
    if (isNaN(value)) return data.value;

    const precision = card.config.precision !== undefined ? card.config.precision : 1;
    return value.toFixed(precision);
  };

  /**
   * 获取数据单位（优先使用卡片配置的单位）
   */
  const getUnit = (): string | undefined => {
    return card.config.unit || data?.unit;
  };

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

  return (
    <Card
      className="data-statistic-card"
      style={{
        height: '100%',
        width: '100%',
        borderColor: getBorderColor(),
        borderWidth: '2px',
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

      {/* 卡片内容 */}
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
          <div style={{ overflow: 'hidden' }}>
            {/* 数值显示 - 添加平滑过渡动画 */}
            <Statistic
              value={formatValue()}
              suffix={getUnit()}
              valueStyle={{
                ...getValueStyle(),
                fontSize: 'clamp(18px, 4vw, 28px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.3s ease, font-size 0.2s ease', // 添加平滑过渡
              }}
              style={{ textAlign: 'center' }}
            />

            {/* 更新时间 - 添加渐变动画 */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.3s ease', // 添加透明度过渡
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

export default DataStatisticCard;
