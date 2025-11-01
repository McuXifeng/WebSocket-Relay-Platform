import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Popconfirm,
  Tag,
  Grid,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import {
  getDeviceGroups,
  createDeviceGroup,
  updateDeviceGroup,
  deleteDeviceGroup,
} from '@/services/device-group.service';
import { getEndpoints } from '@/services/endpoint.service';
import { getEndpointDevices } from '@/services/device.service';
import type {
  DeviceGroupListItem,
  CreateDeviceGroupRequest,
  UpdateDeviceGroupRequest,
} from '@websocket-relay/shared';
import type { EndpointWithUrl, Device } from '@websocket-relay/shared';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * DeviceGroupsPage 组件 - 设备分组管理页面
 *
 * 职责：
 * - 展示当前用户的所有设备分组列表
 * - 提供创建、编辑、删除设备分组功能
 * - 支持按分组名称搜索和端点筛选
 * - 点击分组名称跳转到分组详情页
 *
 * Story 6.6: 设备分组和批量管理
 */
function DeviceGroupsPage() {
  const [groups, setGroups] = useState<DeviceGroupListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroupListItem | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState<string>('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>(undefined);

  // 端点列表和设备列表（用于创建分组时选择）
  const [endpoints, setEndpoints] = useState<EndpointWithUrl[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [selectedEndpointForCreate, setSelectedEndpointForCreate] = useState<string | undefined>(
    undefined
  );

  // 判断是否为移动端
  const isMobile = !screens.md;

  /**
   * 加载设备分组列表
   */
  useEffect(() => {
    void fetchDeviceGroups();
    void fetchEndpoints();
  }, []);

  /**
   * 加载设备分组列表（提取为独立函数，供搜索、筛选、刷新使用）
   */
  const fetchDeviceGroups = async () => {
    try {
      setLoading(true);
      const data = await getDeviceGroups({
        search: searchText || undefined,
        endpoint_id: selectedEndpointId,
      });
      setGroups(data.groups);
    } catch (error) {
      console.error('加载设备分组列表失败:', error);
      // 错误消息已经在 apiClient 响应拦截器中显示
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载端点列表（用于筛选和创建分组时选择）
   */
  const fetchEndpoints = async () => {
    try {
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (error) {
      console.error('加载端点列表失败:', error);
    }
  };

  /**
   * 当选择端点时，加载该端点的设备列表
   */
  const handleEndpointChange = async (endpointId: string) => {
    setSelectedEndpointForCreate(endpointId);
    setDevicesLoading(true);
    try {
      const data = await getEndpointDevices(endpointId);
      setDevices(data.devices);
    } catch (error) {
      console.error('加载设备列表失败:', error);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  /**
   * 搜索和筛选变化时重新加载分组列表
   */
  useEffect(() => {
    void fetchDeviceGroups();
  }, [searchText, selectedEndpointId]);

  /**
   * 打开创建分组 Modal
   */
  const handleOpenCreateModal = () => {
    createForm.resetFields();
    setSelectedEndpointForCreate(undefined);
    setDevices([]);
    setIsCreateModalOpen(true);
  };

  /**
   * 关闭创建分组 Modal
   */
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    createForm.resetFields();
  };

  /**
   * 创建设备分组
   */
  const handleCreateGroup = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);

      const request: CreateDeviceGroupRequest = {
        endpoint_id: values.endpoint_id,
        group_name: values.group_name,
        description: values.description,
        device_ids: values.device_ids || [],
      };

      await createDeviceGroup(request);
      void message.success('设备分组创建成功');
      handleCloseCreateModal();
      void fetchDeviceGroups();
    } catch (error) {
      if (error instanceof Error && error.name !== 'ValidationError') {
        console.error('创建设备分组失败:', error);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 打开编辑分组 Modal
   */
  const handleOpenEditModal = (group: DeviceGroupListItem) => {
    setEditingGroup(group);
    editForm.setFieldsValue({
      group_name: group.group_name,
      description: '', // 列表中没有description，这里留空
    });
    setIsEditModalOpen(true);
  };

  /**
   * 关闭编辑分组 Modal
   */
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingGroup(null);
    editForm.resetFields();
  };

  /**
   * 更新设备分组
   */
  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      const values = await editForm.validateFields();
      setEditLoading(true);

      const request: UpdateDeviceGroupRequest = {
        group_name: values.group_name,
        description: values.description,
      };

      await updateDeviceGroup(editingGroup.id, request);
      void message.success('设备分组更新成功');
      handleCloseEditModal();
      void fetchDeviceGroups();
    } catch (error) {
      if (error instanceof Error && error.name !== 'ValidationError') {
        console.error('更新设备分组失败:', error);
      }
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除设备分组
   */
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDeviceGroup(groupId);
      void message.success('设备分组已删除');
      void fetchDeviceGroups();
    } catch (error) {
      console.error('删除设备分组失败:', error);
    }
  };

  /**
   * 跳转到分组详情页
   */
  const navigateToGroupDetail = (groupId: string) => {
    navigate(`/device-groups/${groupId}`);
  };

  /**
   * 表格列配置
   */
  const columns: ColumnsType<DeviceGroupListItem> = [
    {
      title: '分组名称',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (text: string, record) => (
        <Button
          type="link"
          onClick={() => navigateToGroupDetail(record.id)}
          icon={<TeamOutlined />}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '所属端点',
      dataIndex: 'endpoint_name',
      key: 'endpoint_name',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '设备数量',
      dataIndex: 'device_count',
      key: 'device_count',
      sorter: (a, b) => a.device_count - b.device_count,
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => format(new Date(date), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除分组不会删除设备本身，只会解除分组关系。确定要删除这个分组吗？"
            onConfirm={() => handleDeleteGroup(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面标题 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <Title level={3} style={{ margin: 0 }}>
              设备分组管理
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
              创建分组
            </Button>
          </div>

          {/* 搜索和筛选 */}
          <Space size="middle" wrap>
            <Input
              placeholder="搜索分组名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: isMobile ? '100%' : '240px' }}
              allowClear
            />
            <Select
              placeholder="选择端点筛选"
              value={selectedEndpointId}
              onChange={setSelectedEndpointId}
              style={{ width: isMobile ? '100%' : '200px' }}
              allowClear
              options={[
                ...endpoints.map((ep) => ({
                  label: ep.name,
                  value: ep.id,
                })),
              ]}
            />
          </Space>

          {/* 设备分组列表 */}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={groups}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个分组`,
              }}
              locale={{ emptyText: '暂无设备分组' }}
            />
          </Spin>
        </Space>
      </Card>

      {/* 创建分组 Modal */}
      <Modal
        title="创建设备分组"
        open={isCreateModalOpen}
        onOk={handleCreateGroup}
        onCancel={handleCloseCreateModal}
        confirmLoading={createLoading}
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="分组名称"
            name="group_name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 50, message: '分组名称最多50个字符' },
            ]}
          >
            <Input placeholder="请输入分组名称（1-50字符）" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ max: 200, message: '描述最多200个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入分组描述（可选，最多200字符）"
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="所属端点"
            name="endpoint_id"
            rules={[{ required: true, message: '请选择所属端点' }]}
          >
            <Select
              placeholder="请选择端点"
              onChange={handleEndpointChange}
              options={endpoints.map((ep) => ({
                label: ep.name,
                value: ep.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="设备成员" name="device_ids">
            <Select
              mode="multiple"
              placeholder="请选择设备（可选，也可以在分组创建后添加）"
              loading={devicesLoading}
              disabled={!selectedEndpointForCreate}
              options={devices.map((device) => ({
                label: device.custom_name || device.device_id,
                value: device.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑分组 Modal */}
      <Modal
        title="编辑设备分组"
        open={isEditModalOpen}
        onOk={handleUpdateGroup}
        onCancel={handleCloseEditModal}
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="分组名称"
            name="group_name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 50, message: '分组名称最多50个字符' },
            ]}
          >
            <Input placeholder="请输入分组名称（1-50字符）" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ max: 200, message: '描述最多200个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入分组描述（可选，最多200字符）"
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceGroupsPage;
