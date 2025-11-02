/**
 * MobileAlertCard 组件
 *
 * 职责:移动端告警卡片展示
 *
 * 功能:
 * - 显示告警详情(设备、规则、数据、时间)
 * - 左滑显示操作按钮(已读/删除)
 * - 告警级别色条显示
 */

import { useState } from 'react';
import { Card, Tag, Space } from 'antd';
import { useSwipeable } from 'react-swipeable';
import type { AlertHistoryWithDetails } from '@websocket-relay/shared';
import { formatTimeForMobile } from '../../utils/time.util';
import styles from './MobileAlertCard.module.css';

interface MobileAlertCardProps {
  alert: AlertHistoryWithDetails;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function MobileAlertCard({ alert, onMarkAsRead, onDelete }: MobileAlertCardProps) {
  const [showActions, setShowActions] = useState(false);

  // 左滑操作 Handler
  const handlers = useSwipeable({
    onSwipedLeft: () => setShowActions(true),
    onSwipedRight: () => setShowActions(false),
    trackMouse: false, // 仅跟踪触摸事件,不跟踪鼠标(移动端专用)
  });

  // 告警级别颜色映射(左侧 4px 色条)
  const levelColorMap: Record<string, string> = {
    info: '#1890ff',
    warning: '#faad14',
    critical: '#ff4d4f',
  };

  // 状态标签颜色映射
  const statusColorMap: Record<string, string> = {
    unread: 'red',
    read: 'blue',
    processed: 'green',
  };

  const statusLabelMap: Record<string, string> = {
    unread: '未读',
    read: '已读',
    processed: '已处理',
  };

  return (
    <div {...handlers} className={styles.cardContainer}>
      {/* 左侧告警级别色条(4px 宽) */}
      <div
        className={styles.colorBar}
        style={{
          backgroundColor: levelColorMap[alert.alert_level] || '#d9d9d9',
        }}
      />

      {/* 卡片内容 */}
      <Card
        size="small"
        style={{
          paddingLeft: 8, // 为左侧色条留空间
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* 顶部:规则名称 + 状态标签 */}
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 16 }}>{alert.alert_rule?.rule_name || '未知规则'}</strong>
          <Tag color={statusColorMap[alert.status]}>
            {statusLabelMap[alert.status] || alert.status}
          </Tag>
        </Space>

        {/* 中间:设备 + 数据字段 + 触发值/阈值 */}
        <div style={{ fontSize: 14, color: '#666', lineHeight: '20px' }}>
          <div>设备: {alert.device?.custom_name || alert.device?.device_id || '-'}</div>
          <div>
            {alert.data_key}: {alert.triggered_value} (阈值: {alert.threshold})
          </div>
        </div>

        {/* 底部:相对时间 */}
        <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
          {formatTimeForMobile(alert.triggered_at)}
        </div>
      </Card>

      {/* 左滑显示的操作按钮区域 */}
      <div
        className={styles.actionsContainer}
        style={{
          right: showActions ? 0 : -160, // 160px = 两个按钮宽度
        }}
      >
        {/* 已读按钮(绿色) */}
        {alert.status === 'unread' && (
          <button
            className={`${styles.actionButton} ${styles.readButton}`}
            onClick={() => {
              onMarkAsRead(alert.id);
              setShowActions(false);
            }}
          >
            已读
          </button>
        )}

        {/* 删除按钮(红色) */}
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => {
            onDelete(alert.id);
            setShowActions(false);
          }}
        >
          删除
        </button>
      </div>
    </div>
  );
}

export default MobileAlertCard;
