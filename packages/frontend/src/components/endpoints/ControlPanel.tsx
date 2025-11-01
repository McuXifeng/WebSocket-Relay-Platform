/**
 * ControlPanel Component
 * 设备控制面板,包含各种控制组件(开关、按钮、滑块、数值输入)
 * Story 6.4: 设备控制和指令下发
 */

import { useState } from 'react';
import { Space, Typography, Switch, InputNumber, Button, Slider, Tooltip } from 'antd';
import { BulbOutlined, ThunderboltOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ControlPanelProps {
  deviceId?: string; // 可选参数，当前未使用但保留供未来扩展
  onSendCommand: (command: string, params: Record<string, unknown>) => Promise<string>;
  loading: boolean;
}

/**
 * 控制面板组件
 */
function ControlPanel({ onSendCommand, loading }: ControlPanelProps): JSX.Element {
  const [lightState, setLightState] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(25);
  const [brightness, setBrightness] = useState<number>(50);
  const [sendingCommand, setSendingCommand] = useState<string | null>(null);

  /**
   * 开关灯控制
   */
  async function handleLightSwitch(checked: boolean): Promise<void> {
    try {
      setSendingCommand('setLight');
      setLightState(checked);
      await onSendCommand('setLight', { state: checked ? 'on' : 'off' });
    } catch (error) {
      // 发送失败时恢复原状态
      setLightState(!checked);
    } finally {
      setSendingCommand(null);
    }
  }

  /**
   * 温度设置
   */
  async function handleTemperatureChange(): Promise<void> {
    try {
      setSendingCommand('setTemperature');
      await onSendCommand('setTemperature', { temperature });
    } finally {
      setSendingCommand(null);
    }
  }

  /**
   * 亮度调节（滑块释放后发送）
   */
  async function handleBrightnessChange(value: number): Promise<void> {
    try {
      setSendingCommand('setBrightness');
      await onSendCommand('setBrightness', { brightness: value });
    } finally {
      setSendingCommand(null);
    }
  }

  /**
   * 快捷操作：重启设备
   */
  async function handleRestart(): Promise<void> {
    try {
      setSendingCommand('restart');
      await onSendCommand('restart', {});
    } finally {
      setSendingCommand(null);
    }
  }

  /**
   * 快捷操作：恢复出厂设置
   */
  async function handleReset(): Promise<void> {
    try {
      setSendingCommand('reset');
      await onSendCommand('reset', {});
    } finally {
      setSendingCommand(null);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 开关控制 */}
      <div>
        <Text strong>
          <BulbOutlined style={{ marginRight: 8 }} />
          灯光控制
        </Text>
        <div style={{ marginTop: 8 }}>
          <Space>
            <Switch
              checked={lightState}
              onChange={(checked) => void handleLightSwitch(checked)}
              checkedChildren="开"
              unCheckedChildren="关"
              loading={loading || sendingCommand === 'setLight'}
            />
            <Text type="secondary">{lightState ? '已开启' : '已关闭'}</Text>
          </Space>
        </div>
      </div>

      {/* 温度设置 */}
      <div>
        <Text strong>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          温度设置（°C）
        </Text>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
          <InputNumber
            value={temperature}
            onChange={(value) => value !== null && setTemperature(value)}
            min={0}
            max={100}
            disabled={loading}
            style={{ width: 120 }}
          />
          <Tooltip title="发送温度设置指令">
            <Button
              type="primary"
              onClick={() => void handleTemperatureChange()}
              loading={sendingCommand === 'setTemperature'}
              disabled={loading}
            >
              设置
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 亮度调节 */}
      <div>
        <Text strong>亮度调节（{brightness}%）</Text>
        <div style={{ marginTop: 8 }}>
          <Slider
            value={brightness}
            onChange={setBrightness}
            onAfterChange={(value) => void handleBrightnessChange(value)}
            disabled={loading || sendingCommand === 'setBrightness'}
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* 快捷操作按钮 */}
      <div>
        <Text strong>快捷操作</Text>
        <div style={{ marginTop: 8 }}>
          <Space>
            <Tooltip title="重启设备">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void handleRestart()}
                loading={sendingCommand === 'restart'}
                disabled={loading}
              >
                重启设备
              </Button>
            </Tooltip>
            <Tooltip title="恢复设备出厂设置（危险操作）">
              <Button
                icon={<UndoOutlined />}
                onClick={() => void handleReset()}
                danger
                loading={sendingCommand === 'reset'}
                disabled={loading}
              >
                恢复出厂设置
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>
    </Space>
  );
}

export default ControlPanel;
