import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Table, Descriptions, Badge, Typography, Spin, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import type { UserListItem, EndpointWithUrl } from '@websocket-relay/shared';
import { getUsers, getUserEndpoints } from '@/services/admin.service';

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
  ];

  // 加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <Spin tip="加载中..." size="large" />
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
            <Spin tip="加载中..." />
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
      </div>
    </div>
  );
}

export default AdminUserEndpointsPage;
