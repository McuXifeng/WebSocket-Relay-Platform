import { Card, Statistic, Row, Col, Badge, Skeleton } from 'antd';
import { useRef, useEffect, useState } from 'react';
import type { EndpointStatsResponse } from '@websocket-relay/shared/types/endpoint.types';
import { formatRelativeTime } from '@/utils/formatTime';

/**
 * 端点统计数据展示组件
 *
 * 职责：
 * - 以卡片形式展示端点的实时统计数据
 * - 使用 Ant Design Statistic 组件展示各项指标
 * - 使用 Badge 组件指示当前连接状态
 * - 计算并显示消息速率（消息数/分钟）
 *
 * Props:
 * - stats: 统计数据（可能为 null）
 * - loading: 加载状态
 */

interface EndpointStatsCardProps {
  stats: EndpointStatsResponse | null;
  loading: boolean;
}

export default function EndpointStatsCard({ stats, loading }: EndpointStatsCardProps) {
  // 消息速率状态
  const [messageRate, setMessageRate] = useState<number>(0);

  // 使用 useRef 存储上一次的消息数和时间戳
  const lastStatsRef = useRef<{
    totalMessages: number;
    timestamp: number;
  } | null>(null);

  /**
   * 计算消息速率（消息数/分钟）
   */
  useEffect(() => {
    if (!stats) {
      setMessageRate(0);
      return;
    }

    const now = Date.now();
    const currentMessages = stats.total_messages;

    if (lastStatsRef.current) {
      const { totalMessages: lastMessages, timestamp: lastTime } = lastStatsRef.current;
      const timeDiffInMinutes = (now - lastTime) / 60000; // 转换为分钟

      if (timeDiffInMinutes > 0) {
        const messageDiff = currentMessages - lastMessages;
        const rate = messageDiff / timeDiffInMinutes;
        // 保留1位小数
        setMessageRate(Math.round(rate * 10) / 10);
      }
    }

    // 更新缓存
    lastStatsRef.current = {
      totalMessages: currentMessages,
      timestamp: now,
    };
  }, [stats]);
  // 加载状态显示骨架屏
  if (loading) {
    return (
      <Card title="实时统计" bordered={false}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  // 无数据时显示占位内容
  if (!stats) {
    return (
      <Card title="实时统计" bordered={false}>
        <p style={{ color: '#999', textAlign: 'center' }}>暂无统计数据</p>
      </Card>
    );
  }

  return (
    <Card title="实时统计" bordered={false}>
      <Row gutter={[16, 16]}>
        {/* 当前连接数（带状态指示器和颜色样式） */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <>
                当前连接数 <Badge status={stats.current_connections > 0 ? 'success' : 'default'} />
              </>
            }
            value={stats.current_connections}
            valueStyle={{
              color: stats.current_connections > 0 ? '#52c41a' : '#d9d9d9',
              fontWeight: 'bold',
            }}
          />
        </Col>

        {/* 累计连接数 */}
        <Col xs={24} sm={12} md={6}>
          <Statistic title="累计连接数" value={stats.total_connections} />
        </Col>

        {/* 累计消息数 */}
        <Col xs={24} sm={12} md={6}>
          <Statistic title="累计消息数" value={stats.total_messages} />
        </Col>

        {/* 消息速率（新增指标） */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="消息速率"
            value={messageRate}
            suffix="条/分钟"
            valueStyle={{
              color: '#1890ff',
              fontWeight: 'bold',
            }}
          />
        </Col>

        {/* 最后活跃时间 */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="最后活跃"
            value={formatRelativeTime(
              stats.last_active_at ? stats.last_active_at.toString() : null
            )}
          />
        </Col>
      </Row>
    </Card>
  );
}
