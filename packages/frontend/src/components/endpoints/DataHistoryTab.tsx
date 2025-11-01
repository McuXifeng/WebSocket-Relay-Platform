import React, { useState, useEffect } from 'react';
import {
  Form,
  Select,
  DatePicker,
  Button,
  Radio,
  Space,
  Empty,
  message,
  Spin,
  Collapse,
  Card,
  Divider,
  Row,
  Col,
  Popconfirm,
  Tag,
} from 'antd';
import {
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import * as visualizationService from '../../services/visualization.service';
import { sendControlCommand, getControlCommandDetail } from '../../services/control.service';
import DataHistoryTable from './DataHistoryTable';
import { getDevicesOnlineStatus } from '../../services/visualization.service';
import { exportToCSV } from '../../utils/exportToCSV';
import { exportToJSON } from '../../utils/exportToJSON';
import ConfigurableControlItem from './ConfigurableControlItem';
import type { ControlConfig } from './ConfigurableControlItem';
import ControlConfigModal from './ControlConfigModal';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface Device {
  id: string;
  device_id: string;
  custom_name: string;
  last_connected_at?: string | Date;
}

interface DataHistoryRecord {
  timestamp: string;
  value: number;
  count?: number;
}

interface DataHistoryTabProps {
  endpointId: string;
}

const DataHistoryTab: React.FC<DataHistoryTabProps> = ({ endpointId }) => {
  // 数据查询状态
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [dataKeys, setDataKeys] = useState<string[]>([]);
  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(24, 'hour'),
    dayjs(),
  ]);
  const [aggregation, setAggregation] = useState<'none' | 'minute' | 'hour' | 'day'>('none');
  const [aggregateType, setAggregateType] = useState<'avg' | 'max' | 'min'>('avg');
  const [historyData, setHistoryData] = useState<DataHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [dataKeysLoading, setDataKeysLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // 设备控制状态
  const [controlConfigs, setControlConfigs] = useState<ControlConfig[]>([]);
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ControlConfig | null>(null);
  const [controlLoading, setControlLoading] = useState(false);
  const [selectedControlDevice, setSelectedControlDevice] = useState<string | null>(null);

  // 设备在线状态（实时检测WebSocket连接）
  const [devicesOnlineStatus, setDevicesOnlineStatus] = useState<Record<string, boolean>>({});

  // 加载设备列表（组件挂载时）
  useEffect(() => {
    void loadDevices();
    loadControlConfigs();
    void loadDevicesOnlineStatus(); // 加载初始在线状态
  }, [endpointId]);

  // 定期刷新设备在线状态（每5秒）
  useEffect(() => {
    const interval = setInterval(() => {
      void loadDevicesOnlineStatus();
    }, 5000); // 5秒刷新一次

    return () => clearInterval(interval);
  }, [endpointId]);

  // 从 localStorage 加载控制配置
  const loadControlConfigs = () => {
    try {
      const key = `control_configs_${endpointId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const configs = JSON.parse(saved) as ControlConfig[];
        setControlConfigs(configs);
      }
    } catch (error) {
      console.error('加载控制配置失败:', error);
    }
  };

  // 保存控制配置到 localStorage
  const saveControlConfigs = (configs: ControlConfig[]) => {
    try {
      const key = `control_configs_${endpointId}`;
      localStorage.setItem(key, JSON.stringify(configs));
      setControlConfigs(configs);
    } catch (error) {
      console.error('保存控制配置失败:', error);
      void message.error('保存控制配置失败');
    }
  };

  // 设备变化时加载数据字段
  useEffect(() => {
    if (selectedDevice) {
      void loadDataKeys(selectedDevice);
    } else {
      setDataKeys([]);
      setSelectedDataKey(null);
    }
  }, [selectedDevice]);

  // 加载设备列表
  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const response = await visualizationService.getEndpointDevices(endpointId);
      setDevices(response.devices || []);
    } catch (error) {
      void message.error('加载设备列表失败');
      console.error('Failed to load devices:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  // 加载设备数据字段
  const loadDataKeys = async (deviceId: string) => {
    setDataKeysLoading(true);
    try {
      const response = await visualizationService.getDeviceDataKeys(endpointId, deviceId);
      setDataKeys(response.dataKeys?.map((dk: { key: string }) => dk.key) || []);
      setSelectedDataKey(null);
    } catch (error) {
      void message.error('加载数据字段失败');
      console.error('Failed to load data keys:', error);
    } finally {
      setDataKeysLoading(false);
    }
  };

  // 加载设备在线状态（实时检测WebSocket连接）
  const loadDevicesOnlineStatus = async () => {
    try {
      const response = await getDevicesOnlineStatus(endpointId);
      setDevicesOnlineStatus(response.onlineStatus);
    } catch (error) {
      console.error('Failed to load devices online status:', error);
      // 静默失败，不影响主流程
    }
  };

  // 查询历史数据
  const handleQuery = async () => {
    if (!selectedDevice || !selectedDataKey) {
      void message.warning('请选择设备和数据字段');
      return;
    }

    setLoading(true);
    try {
      const [startTime, endTime] = timeRange;
      const response = await visualizationService.getDeviceDataHistory(
        endpointId,
        selectedDevice,
        selectedDataKey,
        startTime.toISOString(),
        endTime.toISOString(),
        aggregation === 'none' ? undefined : aggregation,
        aggregation === 'none' ? undefined : aggregateType
      );
      setHistoryData(response.records || []);
      setPagination({ current: 1, pageSize: pagination.pageSize });

      if (response.records?.length === 0) {
        void message.info('未查询到历史数据');
      } else {
        void message.success(`查询成功，共 ${response.records?.length || 0} 条数据`);
      }
    } catch (error) {
      void message.error('查询失败，请重试');
      console.error('Failed to query history data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 导出为CSV
  const handleExportCSV = () => {
    if (historyData.length === 0) {
      void message.warning('没有可导出的数据');
      return;
    }

    try {
      const device = devices.find((d) => d.id === selectedDevice);
      exportToCSV(historyData, {
        deviceName: device?.custom_name || device?.device_id || '未知设备',
        dataKey: selectedDataKey || '',
        timeRange,
        aggregation: aggregation === 'none' ? undefined : aggregation,
        aggregateType: aggregation === 'none' ? undefined : aggregateType,
      });
      void message.success('CSV 文件已生成');
    } catch (error) {
      void message.error('导出 CSV 失败');
      console.error('Failed to export CSV:', error);
    }
  };

  // 导出为JSON
  const handleExportJSON = () => {
    if (historyData.length === 0) {
      void message.warning('没有可导出的数据');
      return;
    }

    try {
      const device = devices.find((d) => d.id === selectedDevice);
      exportToJSON(historyData, {
        deviceId: selectedDevice || '',
        deviceName: device?.custom_name || device?.device_id || '未知设备',
        dataKey: selectedDataKey || '',
        timeRange,
        aggregation: aggregation === 'none' ? undefined : aggregation,
        aggregateType: aggregation === 'none' ? undefined : aggregateType,
      });
      void message.success('JSON 文件已生成');
    } catch (error) {
      void message.error('导出 JSON 失败');
      console.error('Failed to export JSON:', error);
    }
  };

  // ==================== 设备控制相关函数 ====================

  /**
   * 打开添加控制配置对话框
   */
  const handleAddControlConfig = () => {
    setEditingConfig(null);
    setControlModalOpen(true);
  };

  /**
   * 打开编辑控制配置对话框
   */
  const handleEditControlConfig = (config: ControlConfig) => {
    setEditingConfig(config);
    setControlModalOpen(true);
  };

  /**
   * 保存控制配置
   */
  const handleSaveControlConfig = (config: ControlConfig) => {
    const existingIndex = controlConfigs.findIndex((c) => c.id === config.id);

    if (existingIndex >= 0) {
      // 编辑模式：更新现有配置
      const newConfigs = [...controlConfigs];
      newConfigs[existingIndex] = config;
      saveControlConfigs(newConfigs);
    } else {
      // 新增模式：添加新配置
      saveControlConfigs([...controlConfigs, config]);
    }
  };

  /**
   * 删除控制配置
   */
  const handleDeleteControlConfig = (configId: string) => {
    const newConfigs = controlConfigs.filter((c) => c.id !== configId);
    saveControlConfigs(newConfigs);
    void message.success('控制配置已删除');
  };

  /**
   * 发送控制指令
   */
  const handleSendControlCommand = async (
    command: string,
    params: Record<string, unknown>
  ): Promise<void> => {
    if (!selectedControlDevice) {
      void message.error('请先选择控制设备');
      throw new Error('未选择设备');
    }

    try {
      setControlLoading(true);
      const response = await sendControlCommand(endpointId, selectedControlDevice, command, params);
      void message.success('控制指令已发送，等待设备响应...');

      // 启动状态轮询机制（每1秒查询一次，最多5秒）
      pollCommandStatus(endpointId, selectedControlDevice, response.commandId, 5);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message || '控制指令发送失败';

      if (errorCode === 'DEVICE_OFFLINE') {
        void message.error('设备离线，无法发送控制指令');
      } else {
        void message.error(errorMessage);
      }
      throw error;
    } finally {
      setControlLoading(false);
    }
  };

  /**
   * 轮询控制指令状态（短期高频轮询）
   *
   * @param endpointId - 端点ID
   * @param deviceId - 设备ID
   * @param commandId - 指令ID
   * @param maxAttempts - 最大尝试次数（默认5次，即5秒）
   */
  const pollCommandStatus = (
    endpointId: string,
    deviceId: string,
    commandId: string,
    maxAttempts: number = 5
  ): void => {
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        const detail = await getControlCommandDetail(endpointId, deviceId, commandId);

        // 检查状态是否已更新
        if (detail.status === 'success') {
          void message.success(
            `✅ 控制指令执行成功${detail.duration ? ` (${detail.duration}ms)` : ''}`
          );
          return; // 停止轮询
        }

        if (detail.status === 'failed') {
          void message.error(`❌ 控制指令执行失败: ${detail.errorMessage || '未知错误'}`);
          return; // 停止轮询
        }

        if (detail.status === 'timeout') {
          void message.warning('⏰ 控制指令超时，设备未响应');
          return; // 停止轮询
        }

        // 状态仍然是 pending，继续轮询
        if (attempts < maxAttempts) {
          setTimeout(() => {
            void poll();
          }, 1000); // 1秒后再次查询
        } else {
          // 达到最大尝试次数，停止轮询
          void message.warning('⏰ 控制指令状态查询超时，请稍后手动刷新');
        }
      } catch (error) {
        console.error('查询控制指令状态失败:', error);
        // 查询失败时，继续轮询（可能是网络问题）
        if (attempts < maxAttempts) {
          setTimeout(() => {
            void poll();
          }, 1000);
        }
      }
    };

    // 延迟500ms后开始第一次轮询（给后端一点时间处理）
    setTimeout(() => {
      void poll();
    }, 500);
  };

  /**
   * 检查设备是否在线（使用实时WebSocket连接状态）
   */
  const isDeviceOnline = (device: Device): boolean => {
    // 使用实时在线状态检测（通过后端ConnectionManager检查WebSocket连接）
    return devicesOnlineStatus[device.id] === true;
  };

  return (
    <div className="data-history-tab" style={{ padding: '16px 0' }}>
      {/* 查询表单 */}
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="设备" required>
          <Select
            value={selectedDevice}
            onChange={setSelectedDevice}
            placeholder="选择设备"
            style={{ width: 200 }}
            showSearch
            loading={devicesLoading}
            optionFilterProp="children"
          >
            {devices.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.custom_name || d.device_id}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="数据字段" required>
          <Select
            value={selectedDataKey}
            onChange={setSelectedDataKey}
            placeholder="选择数据字段"
            style={{ width: 150 }}
            disabled={!selectedDevice}
            loading={dataKeysLoading}
          >
            {dataKeys.map((k) => (
              <Option key={k} value={k}>
                {k}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="时间范围" required>
          <RangePicker
            value={timeRange}
            onChange={(dates) => {
              if (dates) {
                setTimeRange(dates as [Dayjs, Dayjs]);
              }
            }}
            showTime
            format="YYYY-MM-DD HH:mm"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            onClick={() => void handleQuery()}
            loading={loading}
            disabled={!selectedDevice || !selectedDataKey}
          >
            查询
          </Button>
        </Form.Item>
      </Form>

      {/* 快捷时间范围按钮 */}
      <Space style={{ marginBottom: 16 }}>
        <Button size="small" onClick={() => setTimeRange([dayjs().subtract(1, 'hour'), dayjs()])}>
          最近1小时
        </Button>
        <Button size="small" onClick={() => setTimeRange([dayjs().subtract(24, 'hour'), dayjs()])}>
          最近24小时
        </Button>
        <Button size="small" onClick={() => setTimeRange([dayjs().subtract(7, 'day'), dayjs()])}>
          最近7天
        </Button>
      </Space>

      {/* 数据聚合选项 */}
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="数据聚合">
          <Radio.Group
            value={aggregation}
            onChange={(e) => {
              const val = e.target.value as 'none' | 'minute' | 'hour' | 'day';
              setAggregation(val);
            }}
          >
            <Radio value="none">原始数据</Radio>
            <Radio value="minute">按分钟</Radio>
            <Radio value="hour">按小时</Radio>
            <Radio value="day">按天</Radio>
          </Radio.Group>
        </Form.Item>

        {aggregation !== 'none' && (
          <Form.Item label="聚合类型">
            <Select value={aggregateType} onChange={setAggregateType} style={{ width: 120 }}>
              <Option value="avg">平均值</Option>
              <Option value="max">最大值</Option>
              <Option value="min">最小值</Option>
            </Select>
          </Form.Item>
        )}
      </Form>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="正在查询数据..." />
        </div>
      )}

      {/* 数据表格 */}
      {!loading && historyData.length > 0 && (
        <>
          <DataHistoryTable
            data={historyData}
            loading={loading}
            pagination={pagination}
            onPaginationChange={setPagination}
            aggregation={aggregation}
            aggregateType={aggregateType}
          />

          {/* 导出按钮 */}
          <Space style={{ marginTop: 16 }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={historyData.length === 0}
            >
              导出为CSV
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportJSON}
              disabled={historyData.length === 0}
            >
              导出为JSON
            </Button>
          </Space>
        </>
      )}

      {/* 空数据提示 */}
      {!loading && historyData.length === 0 && (
        <Empty
          description="暂无历史数据，请选择设备和数据字段后点击查询"
          style={{ marginTop: 48 }}
        />
      )}

      {/* 设备控制面板区域 */}
      <Divider />
      <Collapse
        defaultActiveKey={['control']}
        style={{ marginTop: 24 }}
        items={[
          {
            key: 'control',
            label: (
              <Space>
                <ControlOutlined />
                <span style={{ fontWeight: 'bold' }}>设备控制面板</span>
              </Space>
            ),
            extra: (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddControlConfig();
                }}
              >
                添加控制
              </Button>
            ),
            children: (
              <div>
                {/* 设备选择器 */}
                <Form layout="inline" style={{ marginBottom: 16 }}>
                  <Form.Item label="控制设备" required>
                    <Select
                      value={selectedControlDevice}
                      onChange={setSelectedControlDevice}
                      placeholder="选择要控制的设备"
                      style={{ width: 250 }}
                      showSearch
                      loading={devicesLoading}
                      optionFilterProp="children"
                    >
                      {devices.map((d) => (
                        <Option key={d.id} value={d.id}>
                          {d.custom_name || d.device_id}
                          <span style={{ marginLeft: 8 }}>
                            {isDeviceOnline(d) ? (
                              <Tag color="green">在线</Tag>
                            ) : (
                              <Tag color="red">离线</Tag>
                            )}
                          </span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Form>

                {/* 设备离线警告 */}
                {selectedControlDevice &&
                  !isDeviceOnline(
                    devices.find((d) => d.id === selectedControlDevice) || ({} as Device)
                  ) && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        backgroundColor: '#fff7e6',
                        borderColor: '#ffa940',
                      }}
                    >
                      <Space>
                        <span style={{ color: '#fa8c16' }}>⚠️</span>
                        <span style={{ color: '#fa8c16' }}>
                          当前设备离线，无法发送控制指令。请确保设备已连接到WebSocket服务器。
                        </span>
                      </Space>
                    </Card>
                  )}

                {/* 控制组件网格 */}
                {controlConfigs.length > 0 && selectedControlDevice ? (
                  <Row gutter={[16, 16]}>
                    {controlConfigs.map((config) => (
                      <Col xs={24} sm={12} md={8} lg={6} key={config.id}>
                        <div style={{ position: 'relative' }}>
                          <ConfigurableControlItem
                            config={config}
                            onSendCommand={handleSendControlCommand}
                            loading={controlLoading}
                            disabled={
                              !selectedControlDevice ||
                              !isDeviceOnline(
                                devices.find((d) => d.id === selectedControlDevice) ||
                                  ({} as Device)
                              )
                            }
                          />
                          {/* 配置管理按钮 */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              display: 'flex',
                              gap: 4,
                              zIndex: 10,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              padding: '2px',
                              borderRadius: '4px',
                            }}
                          >
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => handleEditControlConfig(config)}
                            />
                            <Popconfirm
                              title="确认删除此控制配置？"
                              onConfirm={() => handleDeleteControlConfig(config.id)}
                              okText="确认"
                              cancelText="取消"
                            >
                              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty
                    description={
                      selectedControlDevice
                        ? '暂无控制配置，请点击"添加控制"按钮创建'
                        : '请先选择控制设备'
                    }
                    style={{ padding: '40px 0' }}
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 控制配置对话框 */}
      <ControlConfigModal
        open={controlModalOpen}
        onClose={() => {
          setControlModalOpen(false);
          setEditingConfig(null);
        }}
        onSave={handleSaveControlConfig}
        editingConfig={editingConfig}
      />
    </div>
  );
};

export default DataHistoryTab;
