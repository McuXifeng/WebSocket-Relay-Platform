/**
 * MobileBottomBar 组件
 *
 * 职责:移动端底部固定操作栏
 *
 * 功能:
 * - 全部已读按钮
 * - 筛选按钮
 */

import { Button, Space } from 'antd';
import { CheckOutlined, FilterOutlined } from '@ant-design/icons';

interface MobileBottomBarProps {
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onOpenFilter: () => void;
  loading: boolean;
}

function MobileBottomBar({
  unreadCount,
  onMarkAllAsRead,
  onOpenFilter,
  loading,
}: MobileBottomBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '12px 16px',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        {unreadCount > 0 ? (
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={onMarkAllAsRead}
            loading={loading}
            style={{ minHeight: 44 }} // 触摸友好尺寸
          >
            全部已读 ({unreadCount})
          </Button>
        ) : (
          <div /> // 占位符,保持筛选按钮在右侧
        )}
        <Button
          icon={<FilterOutlined />}
          onClick={onOpenFilter}
          style={{ minHeight: 44 }} // 触摸友好尺寸
        >
          筛选
        </Button>
      </Space>
    </div>
  );
}

export default MobileBottomBar;
