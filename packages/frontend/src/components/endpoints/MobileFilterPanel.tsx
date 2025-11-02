/**
 * MobileFilterPanel 组件
 *
 * 职责:移动端筛选面板(从底部弹出)
 *
 * 功能:
 * - 告警级别筛选
 * - 状态筛选
 * - 应用筛选按钮
 */

import { Button } from 'antd';
import { Popup, Selector } from 'antd-mobile';

interface MobileFilterPanelProps {
  visible: boolean;
  onClose: () => void;
  filters: {
    alert_level?: string;
    status?: string;
  };
  onFiltersChange: (filters: { alert_level?: string; status?: string }) => void;
}

function MobileFilterPanel({ visible, onClose, filters, onFiltersChange }: MobileFilterPanelProps) {
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{
        height: '50vh',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>筛选告警</h3>

        {/* 告警级别筛选 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            告警级别
          </label>
          <Selector
            options={[
              { label: '全部', value: '' },
              { label: '信息', value: 'info' },
              { label: '警告', value: 'warning' },
              { label: '严重', value: 'critical' },
            ]}
            value={[filters.alert_level || '']}
            onChange={(value) => {
              const newLevel = value[0] === '' ? undefined : value[0];
              onFiltersChange({ ...filters, alert_level: newLevel });
            }}
          />
        </div>

        {/* 状态筛选 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            状态
          </label>
          <Selector
            options={[
              { label: '全部', value: '' },
              { label: '未读', value: 'unread' },
              { label: '已读', value: 'read' },
              { label: '已处理', value: 'processed' },
            ]}
            value={[filters.status || '']}
            onChange={(value) => {
              const newStatus = value[0] === '' ? undefined : value[0];
              onFiltersChange({ ...filters, status: newStatus });
            }}
          />
        </div>

        {/* 应用筛选按钮 */}
        <Button
          type="primary"
          block
          onClick={onClose}
          style={{ minHeight: 44 }} // 触摸友好尺寸
        >
          应用筛选
        </Button>
      </div>
    </Popup>
  );
}

export default MobileFilterPanel;
