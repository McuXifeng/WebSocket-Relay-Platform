/**
 * ConfigurableControlItem Component
 * 可配置的控制组件项，根据配置渲染不同类型的控制组件
 * Story 6.4: 设备控制和指令下发（可视化整合版）
 */

import { useState } from 'react';
import { Space, Typography, Switch, InputNumber, Button, Slider, Card, Tooltip } from 'antd';
import { BulbOutlined, ThunderboltOutlined, FireOutlined, ApiOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 控制配置类型定义
 */
export interface ControlConfig {
  id: string; // 唯一标识
  type: 'switch' | 'number' | 'slider' | 'button'; // 控制类型
  label: string; // 显示标签
  command: string; // 发送的指令类型
  defaultValue?: boolean | number; // 默认值
  min?: number; // 最小值（number/slider）
  max?: number; // 最大值（number/slider）
  step?: number; // 步长（number/slider）
  unit?: string; // 单位（number/slider）
  icon?: 'bulb' | 'thunder' | 'fire' | 'api'; // 图标
  danger?: boolean; // 是否为危险操作（button）
}

interface ConfigurableControlItemProps {
  config: ControlConfig;
  onSendCommand: (command: string, params: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * 可配置的控制组件项
 */
function ConfigurableControlItem({
  config,
  onSendCommand,
  loading = false,
  disabled = false,
}: ConfigurableControlItemProps): JSX.Element {
  const [value, setValue] = useState<boolean | number>(
    config.defaultValue ?? (config.type === 'switch' ? false : config.type === 'slider' ? 50 : 0)
  );
  const [sending, setSending] = useState(false);

  /**
   * 获取图标组件
   */
  const getIcon = () => {
    switch (config.icon) {
      case 'bulb':
        return <BulbOutlined />;
      case 'thunder':
        return <ThunderboltOutlined />;
      case 'fire':
        return <FireOutlined />;
      case 'api':
        return <ApiOutlined />;
      default:
        return <ApiOutlined />;
    }
  };

  /**
   * 发送控制指令
   */
  const sendCommand = async (params: Record<string, unknown>) => {
    if (disabled || loading || sending) return;

    try {
      setSending(true);
      await onSendCommand(config.command, params);
    } finally {
      setSending(false);
    }
  };

  /**
   * 渲染不同类型的控制组件
   */
  const renderControl = () => {
    switch (config.type) {
      case 'switch':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space align="center">
              {getIcon()}
              <Text strong>{config.label}</Text>
            </Space>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Tooltip title={`切换 ${config.label} 状态`}>
                <Switch
                  checked={value as boolean}
                  onChange={(checked) => {
                    setValue(checked);
                    void sendCommand({ state: checked ? 'on' : 'off' });
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  loading={sending}
                  disabled={disabled || loading}
                />
              </Tooltip>
              <Text type="secondary">{(value as boolean) ? '已开启' : '已关闭'}</Text>
            </div>
          </Space>
        );

      case 'number':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space align="center">
              {getIcon()}
              <Text strong>
                {config.label}
                {config.unit && <Text type="secondary"> ({config.unit})</Text>}
              </Text>
            </Space>
            <Space>
              <Tooltip title={`范围: ${config.min ?? 0} - ${config.max ?? 100}`}>
                <InputNumber
                  value={value as number}
                  onChange={(val) => val !== null && setValue(val)}
                  min={config.min ?? 0}
                  max={config.max ?? 100}
                  step={config.step ?? 1}
                  disabled={disabled || loading || sending}
                  style={{ width: 120 }}
                />
              </Tooltip>
              <Tooltip title={`发送 ${config.label} 设置指令`}>
                <Button
                  type="primary"
                  onClick={() => void sendCommand({ value })}
                  loading={sending}
                  disabled={disabled || loading}
                >
                  设置
                </Button>
              </Tooltip>
            </Space>
          </Space>
        );

      case 'slider':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space align="center">
              {getIcon()}
              <Text strong>
                {config.label}（{value as number}
                {config.unit ?? '%'}）
              </Text>
            </Space>
            <Tooltip title={`拖动滑块调节 ${config.label}，松开鼠标后自动发送指令`}>
              <Slider
                value={value as number}
                onChange={setValue}
                onAfterChange={(val) => void sendCommand({ value: val })}
                disabled={disabled || loading || sending}
                min={config.min ?? 0}
                max={config.max ?? 100}
                step={config.step ?? 1}
              />
            </Tooltip>
          </Space>
        );

      case 'button':
        return (
          <Tooltip title={`执行 ${config.label} 操作`}>
            <Button
              type={config.danger ? 'primary' : 'default'}
              danger={config.danger}
              icon={getIcon()}
              onClick={() => void sendCommand({})}
              loading={sending}
              disabled={disabled || loading}
              block
            >
              {config.label}
            </Button>
          </Tooltip>
        );

      default:
        return <Text type="danger">未知的控制类型</Text>;
    }
  };

  return (
    <Card size="small" bordered style={{ marginBottom: 8 }} bodyStyle={{ padding: 12 }}>
      {renderControl()}
    </Card>
  );
}

export default ConfigurableControlItem;
