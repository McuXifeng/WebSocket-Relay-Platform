import { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Switch,
  Tag,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type {
  AlertRuleWithDetails,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertOperator,
  AlertLevel,
  Device,
} from '@websocket-relay/shared';
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
} from '../../services/alert.service';
import { getEndpointDevices, getDeviceDataKeys, type DataKey } from '../../services/device.service';
import type { ColumnsType } from 'antd/es/table';

interface AlertRulesTabProps {
  endpointId: string;
}

/**
 * AlertRulesTab 组件
 *
 * 职责：显示和管理告警规则列表
 *
 * 功能：
 * - 显示告警规则列表（表格展示）
 * - 创建新规则（按钮 + 表单对话框）
 * - 编辑规则（点击编辑按钮）
 * - 删除规则（Popconfirm 确认）
 * - 启用/禁用规则（Switch 开关）
 * - 告警级别标签展示（Tag 组件）
 */
function AlertRulesTab({ endpointId }: AlertRulesTabProps) {
  const [rules, setRules] = useState<AlertRuleWithDetails[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dataKeysLoading, setDataKeysLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleWithDetails | null>(null);
  const [form] = Form.useForm();

  // 加载告警规则列表
  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await getAlertRules({ endpoint_id: endpointId });
      setRules(response.rules);
    } catch (error) {
      void message.error('加载告警规则失败');
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载设备列表
  const fetchDevices = async () => {
    try {
      const response = await getEndpointDevices(endpointId);
      setDevices(response.devices);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  // 加载设备的数据字段
  const fetchDataKeys = async (deviceId: string) => {
    try {
      setDataKeysLoading(true);
      const response = await getDeviceDataKeys(endpointId, deviceId);
      setDataKeys(response.dataKeys);
    } catch (error) {
      console.error('Failed to fetch data keys:', error);
      // 如果加载失败，允许用户手动输入
      setDataKeys([]);
    } finally {
      setDataKeysLoading(false);
    }
  };

  useEffect(() => {
    void fetchRules();
    void fetchDevices();
  }, [endpointId]);

  // 当选择设备时，加载数据字段
  useEffect(() => {
    if (selectedDeviceId) {
      void fetchDataKeys(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  // 打开创建规则对话框
  const handleCreate = () => {
    setEditingRule(null);
    setSelectedDeviceId('');
    setDataKeys([]);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 打开编辑规则对话框
  const handleEdit = (rule: AlertRuleWithDetails) => {
    setEditingRule(rule);
    setSelectedDeviceId(rule.device_id);
    // 加载对应设备的数据字段
    void fetchDataKeys(rule.device_id);
    form.setFieldsValue({
      device_id: rule.device_id,
      rule_name: rule.rule_name,
      data_key: rule.data_key,
      operator: rule.operator,
      threshold: rule.threshold,
      alert_level: rule.alert_level,
      enabled: rule.enabled,
    });
    setIsModalVisible(true);
  };

  // 删除规则
  const handleDelete = async (ruleId: string) => {
    try {
      await deleteAlertRule(ruleId);
      void message.success('删除成功');
      void fetchRules();
    } catch (error) {
      void message.error('删除失败');
      console.error('Failed to delete rule:', error);
    }
  };

  // 启用/禁用规则
  const handleToggle = async (ruleId: string, enabled: boolean) => {
    try {
      await toggleAlertRule(ruleId, enabled);
      void message.success(enabled ? '已启用' : '已禁用');
      void fetchRules();
    } catch (error) {
      void message.error('操作失败');
      console.error('Failed to toggle rule:', error);
    }
  };

  // 提交表单（创建或更新）
  const handleSubmit = async () => {
    try {
      // 定义表单值类型
      interface FormValues {
        device_id: string;
        rule_name: string;
        data_key: string;
        operator: AlertOperator;
        threshold: string | number;
        alert_level: AlertLevel;
        enabled: boolean;
      }

      const values = (await form.validateFields()) as FormValues;

      if (editingRule) {
        // 更新规则
        const updateData: UpdateAlertRuleRequest = {
          rule_name: values.rule_name,
          data_key: values.data_key,
          operator: values.operator,
          threshold: String(values.threshold),
          alert_level: values.alert_level,
          enabled: values.enabled,
        };
        await updateAlertRule(editingRule.id, updateData);
        void message.success('更新成功');
      } else {
        // 创建规则
        const createData: CreateAlertRuleRequest = {
          endpoint_id: endpointId,
          device_id: values.device_id,
          rule_name: values.rule_name,
          data_key: values.data_key,
          operator: values.operator,
          threshold: String(values.threshold),
          alert_level: values.alert_level,
          enabled: values.enabled !== undefined ? values.enabled : true,
        };
        await createAlertRule(createData);
        void message.success('创建成功');
      }

      setIsModalVisible(false);
      void fetchRules();
    } catch (error) {
      if ((error as { errorFields?: unknown[] }).errorFields) {
        // 表单验证失败
        return;
      }
      void message.error(editingRule ? '更新失败' : '创建失败');
      console.error('Failed to submit rule:', error);
    }
  };

  // 表格列定义
  const columns: ColumnsType<AlertRuleWithDetails> = [
    {
      title: '规则名称',
      dataIndex: 'rule_name',
      key: 'rule_name',
      width: 150,
    },
    {
      title: '设备',
      key: 'device',
      width: 120,
      render: (_, record) => record.device?.custom_name || record.device?.device_id || '-',
    },
    {
      title: '数据字段',
      dataIndex: 'data_key',
      key: 'data_key',
      width: 120,
    },
    {
      title: '条件',
      key: 'condition',
      width: 150,
      render: (_, record) => `${record.operator} ${record.threshold}`,
    },
    {
      title: '告警级别',
      dataIndex: 'alert_level',
      key: 'alert_level',
      width: 100,
      render: (level: AlertLevel) => {
        const colorMap = {
          info: 'blue',
          warning: 'orange',
          critical: 'red',
        };
        const labelMap = {
          info: '信息',
          warning: '警告',
          critical: '严重',
        };
        return <Tag color={colorMap[level]}>{labelMap[level]}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record) => (
        <Switch checked={enabled} onChange={(checked) => void handleToggle(record.id, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => void handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建告警规则
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={rules}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 创建/编辑规则对话框 */}
      <Modal
        title={editingRule ? '编辑告警规则' : '创建告警规则'}
        open={isModalVisible}
        onOk={() => void handleSubmit()}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: true,
            alert_level: 'warning',
            operator: '>',
          }}
        >
          <Form.Item
            name="rule_name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：温度过高告警" />
          </Form.Item>

          <Form.Item
            name="device_id"
            label="目标设备"
            rules={[{ required: true, message: '请选择目标设备' }]}
          >
            <Select
              placeholder="选择设备"
              disabled={!!editingRule}
              onChange={(value: string) => {
                setSelectedDeviceId(value);
                // 清空数据字段选择
                form.setFieldsValue({ data_key: undefined });
              }}
            >
              {devices.map((device) => (
                <Select.Option key={device.id} value={device.id}>
                  {device.custom_name || device.device_id}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="data_key"
            label="数据字段"
            rules={[{ required: true, message: '请选择或输入数据字段' }]}
          >
            {dataKeys.length > 0 ? (
              <Select
                placeholder="选择数据字段"
                disabled={!selectedDeviceId}
                loading={dataKeysLoading}
                showSearch
              >
                {dataKeys.map((dataKey) => (
                  <Select.Option key={dataKey.key} value={dataKey.key}>
                    {dataKey.key} {dataKey.unit ? `(${dataKey.unit})` : ''} - {dataKey.type}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <Input
                placeholder={
                  selectedDeviceId ? '请输入数据字段名称（如：temperature）' : '请先选择设备'
                }
                disabled={!selectedDeviceId}
              />
            )}
          </Form.Item>

          <Form.Item
            name="operator"
            label="比较运算符"
            rules={[{ required: true, message: '请选择运算符' }]}
          >
            <Select>
              <Select.Option value=">">&gt;</Select.Option>
              <Select.Option value="<">&lt;</Select.Option>
              <Select.Option value=">=">&gt;=</Select.Option>
              <Select.Option value="<=">&lt;=</Select.Option>
              <Select.Option value="==">==</Select.Option>
              <Select.Option value="!=">!=</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="threshold"
            label="阈值"
            rules={[{ required: true, message: '请输入阈值' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例如：30" />
          </Form.Item>

          <Form.Item
            name="alert_level"
            label="告警级别"
            rules={[{ required: true, message: '请选择告警级别' }]}
          >
            <Select>
              <Select.Option value="info">信息</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="critical">严重</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AlertRulesTab;
