import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Table,
  Descriptions,
  Badge,
  Typography,
  Spin,
  message,
  Button,
  Modal,
  Form,
  Input,
  Alert,
  Popover,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import type { UserListItem, EndpointWithUrl } from '@websocket-relay/shared';
import { getUsers, getUserEndpoints } from '@/services/admin.service';
import { disableEndpoint, enableEndpoint } from '@/services/ban.service';

const { TextArea } = Input;

const { Title, Text } = Typography;

/**
 * AdminUserEndpointsPage 组件 - 管理员查看用户端点页面
 *
 * 职责:
 * - 显示指定用户的详细信息(用户名、邮箱、角色、注册时间、端点数量)
 * - 显示该用户的所有端点列表(端点名称、ID、创建时间、最后活跃时间)
 * - 仅管理员可访问，普通用户访问返回 403
 *
 * 实现要点:
 * - 使用 useParams 获取路由参数 userId
 * - 使用 Ant Design Card, Descriptions, Table 组件
 * - 复用 DashboardPage 的表格列配置
 */
function AdminUserEndpointsPage() {
  // 获取路由参数
  const { userId } = useParams<{ userId: string }>();

  // 状态变量
  const [user, setUser] = useState<UserListItem | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointWithUrl[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [endpointsLoading, setEndpointsLoading] = useState<boolean>(true);

  // 禁用相关状态
  const [disableModalVisible, setDisableModalVisible] = useState<boolean>(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<EndpointWithUrl | null>(null);
  const [disableLoading, setDisableLoading] = useState<boolean>(false);
  const [form] = Form.useForm();

  /**
   * 加载用户信息和端点列表
   */
  useEffect(() => {
    if (userId) {
      void fetchUserData(userId);
      void fetchEndpoints(userId);
    }
  }, [userId]);

  /**
   * 加载用户信息(从 getUsers 结果中筛选)
   */
  const fetchUserData = async (id: string) => {
    try {
      setLoading(true);
      const users = await getUsers();
      const targetUser = users.find((u) => u.id === id);

      if (!targetUser) {
        void message.error('用户不存在');
        return;
      }

      setUser(targetUser);
    } catch (error) {
      console.error('加载用户信息失败:', error);
      void message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载用户端点列表
   */
  const fetchEndpoints = async (id: string) => {
    try {
      setEndpointsLoading(true);
      const data = await getUserEndpoints(id);
      setEndpoints(data);
    } catch (error) {
      console.error('加载端点列表失败:', error);
      void message.error('加载端点列表失败');
    } finally {
      setEndpointsLoading(false);
    }
  };

  /**
   * 打开禁用端点弹窗
   */
  const handleOpenDisableModal = (endpoint: EndpointWithUrl) => {
    setCurrentEndpoint(endpoint);
    setDisableModalVisible(true);
    form.resetFields();
  };

  /**
   * 关闭禁用端点弹窗
   */
  const handleCloseDisableModal = () => {
    setDisableModalVisible(false);
    setCurrentEndpoint(null);
    form.resetFields();
  };

  /**
   * 确认禁用端点
   */
  const handleConfirmDisable = async () => {
    if (!currentEndpoint || !userId) return;

    try {
      setDisableLoading(true);
      const values = form.getFieldsValue() as { reason?: string };
      await disableEndpoint(currentEndpoint.id, values.reason);
      void message.success('端点已禁用');
      handleCloseDisableModal();
      await fetchEndpoints(userId); // 刷新端点列表
    } catch (error) {
      console.error('禁用端点失败:', error);
      void message.error('禁用端点失败,请稍后重试');
    } finally {
      setDisableLoading(false);
    }
  };

  /**
   * 启用端点
   */
  const handleEnableEndpoint = async (endpoint: EndpointWithUrl) => {
    if (!userId) return;

    try {
      await enableEndpoint(endpoint.id);
      void message.success('端点已启用');
      await fetchEndpoints(userId); // 刷新端点列表
    } catch (error) {
      console.error('启用端点失败:', error);
      void message.error('启用端点失败,请稍后重试');
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (date: string | Date | null): string => {
    if (!date) return '未活跃';
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error('日期格式化失败:', date, error);
      return '日期无效';
    }
  };

  /**
   * 端点列表表格列配置
   */
  const columns: ColumnsType<EndpointWithUrl> = [
    {
      title: '端点名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '端点 ID',
      dataIndex: 'endpoint_id',
      key: 'endpoint_id',
    },
    {
      title: '状态',
      key: 'is_disabled',
      render: (_text: unknown, record: EndpointWithUrl) => {
        if (!record.is_disabled) {
          return <Badge status="success" text="正常" />;
        } else {
          // 被禁用状态 - 显示红色Badge和Popover提示
          const content = (
            <div style={{ maxWidth: '250px' }}>
              <p>
                <strong>禁用时间:</strong>{' '}
                {record.disabled_at ? formatDateTime(record.disabled_at) : '未知'}
              </p>
              <p>
                <strong>禁用原因:</strong> {record.disabled_reason || '无'}
              </p>
            </div>
          );
          return (
            <Popover content={content} title="禁用详情" trigger="hover">
              <Badge status="error" text="已禁用" style={{ cursor: 'pointer' }} />
            </Popover>
          );
        }
      },
      sorter: (a, b) => Number(a.is_disabled) - Number(b.is_disabled), // 已禁用端点在前
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '最后活跃时间',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      render: (date: string | null) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 120,
      render: (_text: unknown, record: EndpointWithUrl) => {
        if (!record.is_disabled) {
          // 端点正常 - 显示禁用按钮
          return (
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => handleOpenDisableModal(record)}
            >
              禁用
            </Button>
          );
        } else {
          // 端点被禁用 - 显示启用按钮
          return (
            <Button type="primary" size="small" onClick={() => void handleEnableEndpoint(record)}>
              启用
            </Button>
          );
        }
      },
    },
  ];

  // 加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#666' }}>加载中...</div>
      </div>
    );
  }

  // 用户不存在
  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <Text type="danger">用户不存在</Text>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#f5f5f5',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 页面标题栏 */}
        <div
          style={{
            marginBottom: '24px',
            padding: '20px 24px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            用户端点管理
          </Title>
          <Text type="secondary">查看用户的所有端点</Text>
        </div>

        {/* 用户信息卡片 */}
        <Card
          title="用户信息"
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Descriptions column={2}>
            <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {user.is_admin ? (
                <Badge count="管理员" style={{ backgroundColor: '#52c41a' }} />
              ) : (
                <Text type="secondary">普通用户</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {formatDateTime(user.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="端点数量">{user.endpoint_count}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 端点列表表格 */}
        <Card
          title="端点列表"
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {endpointsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin />
              <div style={{ marginTop: 16, color: '#666' }}>加载中...</div>
            </div>
          ) : (
            <Table
              dataSource={endpoints}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个端点`,
              }}
              locale={{ emptyText: '该用户暂无端点' }}
            />
          )}
        </Card>

        {/* 禁用端点Modal */}
        <Modal
          title="禁用端点"
          open={disableModalVisible}
          onCancel={handleCloseDisableModal}
          footer={[
            <Button key="cancel" onClick={handleCloseDisableModal}>
              取消
            </Button>,
            <Button
              key="confirm"
              type="primary"
              danger
              loading={disableLoading}
              onClick={() => void handleConfirmDisable()}
            >
              确认禁用
            </Button>,
          ]}
        >
          <Alert
            message="警告"
            description="禁用后端点将无法建立WebSocket连接,请谨慎操作!"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={form} layout="vertical">
            <Form.Item
              label="禁用原因"
              name="reason"
              rules={[{ max: 255, message: '禁用原因不能超过255字符' }]}
            >
              <TextArea rows={4} placeholder="请输入禁用原因(可选)" />
            </Form.Item>
          </Form>
          {currentEndpoint && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                即将禁用端点: <strong>{currentEndpoint.name}</strong> ({currentEndpoint.endpoint_id}
                )
              </Text>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default AdminUserEndpointsPage;
