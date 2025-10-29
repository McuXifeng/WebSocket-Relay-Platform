/**
 * DeviceListCard Component
 * 显示端点的连接设备列表,支持设备名称内联编辑
 * Story 3.11: 连接设备管理和自定义名称永久化
 */

import { useState } from 'react';
import { Card, Table, Badge, Button, Input, Space, message } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Device } from '@websocket-relay/shared';
import { getEndpointDevices, updateDeviceName } from '../../services/device.service';
import { usePolling } from '../../hooks/usePolling';

interface Props {
  endpointId: string;
}

/**
 * 设备列表卡片组件
 */
function DeviceListCard({ endpointId }: Props): JSX.Element {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingDeviceId, setSavingDeviceId] = useState<string | null>(null);

  /**
   * 获取设备列表（支持静默刷新）
   * @param silent - 是否静默刷新（不显示 loading 状态）
   */
  async function fetchDevices(silent = false): Promise<void> {
    try {
      // 非静默模式才显示 loading
      if (!silent) {
        setLoading(true);
      }

      // getEndpointDevices 已经在 service 层处理了数据提取
      // 直接返回 { devices: Device[] } 格式
      const data = await getEndpointDevices(endpointId);
      setDevices(data.devices);
    } catch (err: unknown) {
      void message.error('加载设备列表失败');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  // 使用智能轮询 Hook，每 3 秒静默刷新一次（页面可见时）
  // 页面不可见时自动暂停，重新可见时立即刷新
  usePolling(() => fetchDevices(true), {
    interval: 3000, // 3 秒间隔，更快地反映设备连接/断开状态
    enabled: true,
  });

  /**
   * 开始编辑设备名称
   */
  function handleStartEdit(device: Device): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    setEditingDeviceId(device.device_id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    setEditingName(device.custom_name);
  }

  /**
   * 取消编辑
   */
  function handleCancelEdit(): void {
    setEditingDeviceId(null);
    setEditingName('');
  }

  /**
   * 保存设备名称
   */
  async function handleSaveName(deviceId: string): Promise<void> {
    if (editingName.trim().length === 0) {
      void message.error('设备名称不能为空');
      return;
    }

    if (editingName.length > 100) {
      void message.error('设备名称不能超过100个字符');
      return;
    }

    try {
      setSavingDeviceId(deviceId);
      await updateDeviceName(endpointId, deviceId, editingName);
      void message.success('设备名称已更新');
      setEditingDeviceId(null);
      await fetchDevices(); // 刷新列表
    } catch (err: unknown) {
      void message.error('更新失败');
    } finally {
      setSavingDeviceId(null);
    }
  }

  // 定义表格列
  const columns = [
    {
      title: '设备名称',
      dataIndex: 'custom_name',
      key: 'custom_name',
      render: (name: string, record: Device) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (editingDeviceId === record.device_id) {
          return (
            <Space>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                style={{ width: 200 }}
                maxLength={100}
                onPressEnter={() =>
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                  void handleSaveName(record.device_id)
                }
              />
              <Button
                icon={<CheckOutlined />}
                size="small"
                type="primary"
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                loading={savingDeviceId === record.device_id}
                onClick={() =>
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                  void handleSaveName(record.device_id)
                }
              />
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={handleCancelEdit}
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                disabled={savingDeviceId === record.device_id}
              />
            </Space>
          );
        }
        return (
          <Space>
            {name}
            <Button
              icon={<EditOutlined />}
              size="small"
              type="link"
              onClick={() => handleStartEdit(record)}
            />
          </Space>
        );
      },
    },
    {
      title: '在线状态',
      dataIndex: 'is_online',
      key: 'is_online',
      render: (isOnline: boolean) => (
        <Badge status={isOnline ? 'success' : 'default'} text={isOnline ? '在线' : '离线'} />
      ),
    },
    {
      title: '最后连接时间',
      dataIndex: 'last_connected_at',
      key: 'last_connected_at',
      render: (time: string) =>
        formatDistanceToNow(new Date(time), {
          addSuffix: true,
          locale: zhCN,
        }),
    },
  ];

  return (
    <Card
      title="连接设备"
      extra={
        <Button onClick={() => void fetchDevices(false)} loading={loading}>
          刷新
        </Button>
      }
    >
      <Table
        dataSource={devices}
        columns={columns}
        loading={loading}
        rowKey="device_id"
        locale={{ emptyText: '暂无连接设备' }}
        pagination={false}
      />
    </Card>
  );
}

export default DeviceListCard;
