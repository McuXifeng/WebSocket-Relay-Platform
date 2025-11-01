/**
 * DeviceControlTab Component
 * 设备控制页面的主容器组件,包含设备选择器、控制面板、控制历史表格
 * Story 6.4: 设备控制和指令下发
 */

import { useState, useEffect } from 'react';
import { Form, Select, Card, Empty, Alert, message, Tag, Space, Typography, Divider } from 'antd';
import type { Device } from '@websocket-relay/shared';
import { getEndpointDevices } from '../../services/device.service';
import { sendControlCommand, getControlCommandHistory } from '../../services/control.service';
import type { ControlCommand } from '../../services/control.service';
import ControlPanel from './ControlPanel';
import ControlHistoryTable from './ControlHistoryTable';

const { Option } = Select;
const { Title } = Typography;

interface DeviceControlTabProps {
  endpointId: string;
}

/**
 * 设备控制Tab组件
 */
function DeviceControlTab({ endpointId }: DeviceControlTabProps): JSX.Element {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceDbId, setSelectedDeviceDbId] = useState<string | null>(null);
  const [deviceOnline, setDeviceOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<ControlCommand[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /**
   * 加载设备列表
   */
  async function loadDevices(): Promise<void> {
    try {
      setLoading(true);
      const response = await getEndpointDevices(endpointId);
      setDevices(response.devices);
    } catch (error) {
      void message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  }

  /**
   * 检查设备是否在线（根据最后连接时间判断）
   * 规则：如果最后连接时间在 60 秒内，认为在线
   */
  function isDeviceOnline(device: Device): boolean {
    if (!device.last_connected_at) {
      return false;
    }
    const lastConnectedTime = new Date(device.last_connected_at).getTime();
    const now = Date.now();
    const diffSeconds = (now - lastConnectedTime) / 1000;
    return diffSeconds < 60; // 60 秒内认为在线
  }

  /**
   * 加载控制指令历史
   */
  async function loadCommandHistory(deviceDbId: string): Promise<void> {
    try {
      setHistoryLoading(true);
      const response = await getControlCommandHistory(endpointId, deviceDbId, 1, 20);
      setCommandHistory(response.commands);
    } catch (error) {
      void message.error('加载控制历史失败');
    } finally {
      setHistoryLoading(false);
    }
  }

  /**
   * 发送控制指令
   */
  async function handleSendCommand(
    command: string,
    params: Record<string, unknown>
  ): Promise<string> {
    if (!selectedDeviceDbId) {
      throw new Error('未选择设备');
    }

    try {
      setLoading(true);
      const response = await sendControlCommand(endpointId, selectedDeviceDbId, command, params);
      void message.success('控制指令已发送');

      // 刷新控制历史
      await loadCommandHistory(selectedDeviceDbId);

      return response.commandId;
    } catch (error: unknown) {
      // 处理不同类型的错误
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'DEVICE_OFFLINE') {
          void message.error('设备离线，无法发送控制指令');
        } else if (errorCode === 'INVALID_COMMAND') {
          void message.error('控制指令格式错误');
        } else {
          void message.error('控制指令发送失败，请重试');
        }
      } else {
        void message.error('控制指令发送失败，请重试');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  /**
   * 组件挂载时加载设备列表
   */
  useEffect(() => {
    void loadDevices();
  }, [endpointId]);

  /**
   * 设备变化时检查在线状态并加载控制历史
   */
  useEffect(() => {
    if (selectedDeviceDbId) {
      const device = devices.find((d) => d.id === selectedDeviceDbId);
      if (device) {
        const online = isDeviceOnline(device);
        setDeviceOnline(online);
        void loadCommandHistory(selectedDeviceDbId);
      }
    }
  }, [selectedDeviceDbId, devices]);

  /**
   * 获取选中的设备对象
   */
  const selectedDevice = devices.find((d) => d.id === selectedDeviceDbId);

  return (
    <div className="device-control-tab" style={{ padding: '16px 0' }}>
      <Title level={4}>设备控制</Title>
      <Divider />

      {/* 设备选择器 */}
      <Form layout="inline" style={{ marginBottom: 24 }}>
        <Form.Item label="目标设备" required>
          <Select
            value={selectedDeviceDbId}
            onChange={setSelectedDeviceDbId}
            placeholder="选择要控制的设备"
            style={{ width: 300 }}
            showSearch
            loading={loading}
            filterOption={(input, option) => {
              const label = option?.label;
              if (typeof label === 'string') {
                return label.toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
          >
            {devices.map((d) => (
              <Option key={d.id} value={d.id} label={d.custom_name || d.device_id}>
                <Space>
                  {d.custom_name || d.device_id}
                  <Tag color={isDeviceOnline(d) ? 'green' : 'red'}>
                    {isDeviceOnline(d) ? '在线' : '离线'}
                  </Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>

      {/* 设备离线警告 */}
      {selectedDevice && !deviceOnline && (
        <Alert
          message="设备离线"
          description="当前设备离线，无法发送控制指令。请确保设备已连接到WebSocket服务器。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 控制面板 */}
      {selectedDevice && deviceOnline && (
        <Card
          title={`控制面板 - ${selectedDevice.custom_name || selectedDevice.device_id}`}
          style={{ marginBottom: 16 }}
        >
          <ControlPanel
            deviceId={selectedDevice.id}
            onSendCommand={handleSendCommand}
            loading={loading}
          />
        </Card>
      )}

      {/* 控制历史表格 */}
      {selectedDevice && (
        <Card title="控制历史" style={{ marginBottom: 16 }}>
          <ControlHistoryTable
            commands={commandHistory}
            loading={historyLoading}
            onRefresh={() => void loadCommandHistory(selectedDevice.id)}
          />
        </Card>
      )}

      {/* 空状态提示 */}
      {!selectedDevice && (
        <Empty
          description="请选择要控制的设备"
          style={{ marginTop: 48 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
}

export default DeviceControlTab;
