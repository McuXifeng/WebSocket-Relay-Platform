import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Table,
  Spin,
  message,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Card,
  Select,
  Tag,
  Row,
  Col,
  Statistic,
  Descriptions,
  Radio,
  DatePicker,
  Checkbox,
  Progress,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import {
  getDeviceGroupById,
  addDevicesToGroup,
  removeDevicesFromGroup,
  getGroupDataAggregation,
  sendBatchControlCommand,
  getBatchControlStatus,
  exportGroupDeviceData,
  downloadFile,
} from '@/services/device-group.service';
import { getEndpointDevices } from '@/services/device.service';
import type {
  DeviceGroupDetail,
  DeviceGroupDeviceInfo,
  GroupDataAggregation,
  DataKeyAggregation,
  Device,
  SendBatchControlRequest,
  ExportGroupDataParams,
} from '@websocket-relay/shared';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * DeviceGroupDetailPage 组件 - 设备分组详情页面
 *
 * 职责：
 * - 展示分组基本信息（名称、描述、设备数量、创建时间）
 * - 展示设备成员列表（支持添加/移除设备）
 * - 展示分组数据聚合视图（平均值、最大值、最小值）
 * - 支持批量控制分组内设备
 * - 支持批量导出分组内设备数据
 *
 * Story 6.6: 设备分组和批量管理
 */
function DeviceGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<DeviceGroupDetail | null>(null);
  const [aggregation, setAggregation] = useState<GroupDataAggregation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aggregationLoading, setAggregationLoading] = useState<boolean>(false);

  // 添加设备 Modal
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  // 批量控制 Modal
  const [isBatchControlModalOpen, setIsBatchControlModalOpen] = useState<boolean>(false);
  const [batchControlForm] = Form.useForm();
  const [batchControlLoading, setBatchControlLoading] = useState<boolean>(false);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // 批量导出 Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportForm] = Form.useForm();
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  /**
   * 加载分组详情和数据聚合
   */
  useEffect(() => {
    if (groupId) {
      void fetchGroupDetail();
      void fetchGroupDataAggregation();
    }
  }, [groupId]);

  /**
   * 定时刷新数据聚合（每30秒）
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (groupId) {
        void fetchGroupDataAggregation();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [groupId]);

  /**
   * 加载分组详情
   */
  const fetchGroupDetail = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await getDeviceGroupById(groupId);
      setGroup(data);
    } catch (error) {
      console.error('加载分组详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载分组数据聚合
   */
  const fetchGroupDataAggregation = async () => {
    if (!groupId) return;
    try {
      setAggregationLoading(true);
      const data = await getGroupDataAggregation(groupId);
      setAggregation(data);
    } catch (error) {
      console.error('加载数据聚合失败:', error);
    } finally {
      setAggregationLoading(false);
    }
  };

  /**
   * 打开添加设备 Modal
   */
  const handleOpenAddDeviceModal = async () => {
    if (!group) return;
    setIsAddDeviceModalOpen(true);
    setDevicesLoading(true);
    try {
      const data = await getEndpointDevices(group.endpoint_id);
      // 过滤掉已在分组中的设备
      const currentDeviceIds = group.devices.map((d) => d.id);
      const available = data.devices.filter((d) => !currentDeviceIds.includes(d.id));
      setAvailableDevices(available);
    } catch (error) {
      console.error('加载可用设备失败:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  /**
   * 添加设备到分组
   */
  const handleAddDevices = async () => {
    if (!groupId || selectedDeviceIds.length === 0) return;
    try {
      await addDevicesToGroup(groupId, { device_ids: selectedDeviceIds });
      void message.success(`成功添加 ${selectedDeviceIds.length} 个设备`);
      setIsAddDeviceModalOpen(false);
      setSelectedDeviceIds([]);
      void fetchGroupDetail();
    } catch (error) {
      console.error('添加设备失败:', error);
    }
  };

  /**
   * 从分组移除设备
   */
  const handleRemoveDevice = async (deviceId: string) => {
    if (!groupId) return;
    try {
      await removeDevicesFromGroup(groupId, { device_ids: [deviceId] });
      void message.success('设备已从分组中移除');
      void fetchGroupDetail();
    } catch (error) {
      console.error('移除设备失败:', error);
    }
  };

  /**
   * 打开批量控制 Modal
   */
  const handleOpenBatchControlModal = () => {
    batchControlForm.resetFields();
    setBatchStatus(null);
    setIsBatchControlModalOpen(true);
  };

  /**
   * 发送批量控制指令
   */
  const handleSendBatchControl = async () => {
    if (!groupId) return;
    try {
      const values = await batchControlForm.validateFields();
      setBatchControlLoading(true);

      const request: SendBatchControlRequest = {
        command_type: values.command_type,
        command_params: JSON.parse(values.command_params || '{}'),
      };

      const response = await sendBatchControlCommand(groupId, request);
      void message.success(`批量指令已发送，共 ${response.total_devices} 个设备`);

      // 开始轮询状态
      startPollingBatchStatus(response.batch_id);
    } catch (error) {
      if (error instanceof Error && error.name !== 'ValidationError') {
        console.error('发送批量控制指令失败:', error);
      }
    } finally {
      setBatchControlLoading(false);
    }
  };

  /**
   * 轮询批量控制指令状态
   */
  const startPollingBatchStatus = (batchIdToQuery: string) => {
    if (pollingInterval) clearInterval(pollingInterval);

    let pollCount = 0;
    const maxPolls = 20; // 最多轮询20次（约1分钟）

    const interval = setInterval(async () => {
      if (!groupId) return;
      try {
        const status = await getBatchControlStatus(groupId, batchIdToQuery);
        setBatchStatus(status);

        // 如果所有指令都已完成（成功、失败或超时），停止轮询
        if (status.pending_count === 0 || pollCount >= maxPolls) {
          clearInterval(interval);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error('查询批量控制状态失败:', error);
        clearInterval(interval);
        setPollingInterval(null);
      }
      pollCount++;
    }, 3000); // 每3秒轮询一次

    setPollingInterval(interval);
  };

  /**
   * 打开批量导出 Modal
   */
  const handleOpenExportModal = () => {
    exportForm.resetFields();
    setIsExportModalOpen(true);
  };

  /**
   * 批量导出设备数据
   */
  const handleExportData = async () => {
    if (!groupId) return;
    try {
      const values = await exportForm.validateFields();
      setExportLoading(true);

      const params: ExportGroupDataParams = {
        format: exportFormat,
        start_time: values.dateRange ? values.dateRange[0].toISOString() : undefined,
        end_time: values.dateRange ? values.dateRange[1].toISOString() : undefined,
        data_keys: values.data_keys?.join(','),
      };

      const blob = await exportGroupDeviceData(groupId, params);
      const filename = `group-${groupId}-${Date.now()}.${exportFormat}`;
      downloadFile(blob, filename);

      void message.success('数据导出成功');
      setIsExportModalOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name !== 'ValidationError') {
        console.error('导出数据失败:', error);
      }
    } finally {
      setExportLoading(false);
    }
  };

  /**
   * 设备成员列表表格列配置
   */
  const deviceColumns: ColumnsType<DeviceGroupDeviceInfo> = [
    {
      title: '设备名称',
      dataIndex: 'custom_name',
      key: 'custom_name',
    },
    {
      title: '设备ID',
      dataIndex: 'device_id',
      key: 'device_id',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '最后连接时间',
      dataIndex: 'last_connected_at',
      key: 'last_connected_at',
      render: (date: string) => (date ? format(new Date(date), 'yyyy-MM-dd HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDevice(record.id)}
        >
          移除
        </Button>
      ),
    },
  ];

  /**
   * 数据聚合表格列配置
   */
  const aggregationColumns: ColumnsType<DataKeyAggregation> = [
    {
      title: '数据键',
      dataIndex: 'data_key',
      key: 'data_key',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      render: (text?: string) => text || '-',
    },
    {
      title: '平均值',
      dataIndex: 'average',
      key: 'average',
      render: (num: number) => num.toFixed(2),
    },
    {
      title: '最大值',
      dataIndex: 'max',
      key: 'max',
      render: (num: number) => num.toFixed(2),
    },
    {
      title: '最小值',
      dataIndex: 'min',
      key: 'min',
      render: (num: number) => num.toFixed(2),
    },
    {
      title: '样本数',
      dataIndex: 'sample_count',
      key: 'sample_count',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!group) {
    return (
      <Card>
        <Text type="danger">分组不存在或无权访问</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 返回按钮和标题 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/device-groups')}>
            返回列表
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {group.group_name}
          </Title>
        </div>

        {/* 分组基本信息 */}
        <Card title="分组信息">
          <Descriptions column={2}>
            <Descriptions.Item label="分组名称">{group.group_name}</Descriptions.Item>
            <Descriptions.Item label="所属端点">
              <Tag color="blue">{group.endpoint_name}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="设备数量">{group.device_count}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {format(new Date(group.created_at), 'yyyy-MM-dd HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="分组描述" span={2}>
              {group.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 设备成员列表 */}
        <Card
          title="设备成员"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddDeviceModal}>
              添加设备
            </Button>
          }
        >
          <Table
            columns={deviceColumns}
            dataSource={group.devices}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: '暂无设备成员' }}
          />
        </Card>

        {/* 分组数据聚合视图 */}
        <Card
          title="数据聚合视图"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchGroupDataAggregation()}
                loading={aggregationLoading}
              >
                刷新
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleOpenExportModal}>
                导出数据
              </Button>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleOpenBatchControlModal}
              >
                批量控制
              </Button>
            </Space>
          }
        >
          {aggregation ? (
            <div>
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={6}>
                  <Statistic title="设备数量" value={aggregation.device_count} suffix="个" />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="数据键数量"
                    value={aggregation.aggregations.length}
                    suffix="个"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="最后更新"
                    value={format(new Date(aggregation.last_update), 'yyyy-MM-dd HH:mm:ss')}
                  />
                </Col>
              </Row>
              <Table
                columns={aggregationColumns}
                dataSource={aggregation.aggregations}
                rowKey="data_key"
                pagination={false}
                locale={{ emptyText: '暂无数据' }}
              />
            </div>
          ) : (
            <Spin spinning={aggregationLoading}>
              <Text type="secondary">暂无聚合数据</Text>
            </Spin>
          )}
        </Card>
      </Space>

      {/* 添加设备 Modal */}
      <Modal
        title="添加设备到分组"
        open={isAddDeviceModalOpen}
        onOk={handleAddDevices}
        onCancel={() => setIsAddDeviceModalOpen(false)}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: selectedDeviceIds.length === 0 }}
      >
        <Spin spinning={devicesLoading}>
          <Checkbox.Group
            style={{ width: '100%' }}
            onChange={(values) => setSelectedDeviceIds(values as string[])}
            value={selectedDeviceIds}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {availableDevices.map((device) => (
                <Checkbox key={device.id} value={device.id}>
                  {device.custom_name || device.device_id}
                </Checkbox>
              ))}
              {availableDevices.length === 0 && <Text type="secondary">没有可添加的设备</Text>}
            </Space>
          </Checkbox.Group>
        </Spin>
      </Modal>

      {/* 批量控制 Modal */}
      <Modal
        title="批量控制指令"
        open={isBatchControlModalOpen}
        onOk={handleSendBatchControl}
        onCancel={() => {
          setIsBatchControlModalOpen(false);
          if (pollingInterval) clearInterval(pollingInterval);
        }}
        confirmLoading={batchControlLoading}
        width={600}
        okText="发送指令"
        cancelText="关闭"
        okButtonProps={{ disabled: !!batchStatus }}
      >
        <Form form={batchControlForm} layout="vertical">
          <Form.Item
            label="指令类型"
            name="command_type"
            rules={[{ required: true, message: '请输入指令类型' }]}
          >
            <Input placeholder="例如: reboot, reset, set_config" />
          </Form.Item>
          <Form.Item label="指令参数（JSON格式）" name="command_params">
            <Input.TextArea placeholder='例如: {"temperature": 25}' rows={4} />
          </Form.Item>
        </Form>

        {batchStatus && (
          <div style={{ marginTop: '16px' }}>
            <Title level={5}>执行状态</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="成功"
                  value={batchStatus.success_count}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="失败"
                  value={batchStatus.failed_count}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="等待中" value={batchStatus.pending_count} />
              </Col>
            </Row>
            <Progress
              percent={Math.round(
                ((batchStatus.success_count + batchStatus.failed_count) /
                  batchStatus.total_devices) *
                  100
              )}
              status={batchStatus.pending_count === 0 ? 'success' : 'active'}
              style={{ marginTop: '16px' }}
            />
          </div>
        )}
      </Modal>

      {/* 批量导出 Modal */}
      <Modal
        title="批量导出设备数据"
        open={isExportModalOpen}
        onOk={handleExportData}
        onCancel={() => setIsExportModalOpen(false)}
        confirmLoading={exportLoading}
        width={600}
        okText="导出"
        cancelText="取消"
      >
        <Form form={exportForm} layout="vertical">
          <Form.Item label="时间范围" name="dateRange">
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="数据键筛选" name="data_keys">
            <Select
              mode="multiple"
              placeholder="选择要导出的数据键（留空则导出全部）"
              options={aggregation?.aggregations.map((agg) => ({
                label: agg.data_key,
                value: agg.data_key,
              }))}
            />
          </Form.Item>
          <Form.Item label="导出格式" name="format">
            <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <Radio value="csv">CSV</Radio>
              <Radio value="json">JSON</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceGroupDetailPage;
