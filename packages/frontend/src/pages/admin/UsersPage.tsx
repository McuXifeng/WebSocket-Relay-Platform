import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Input,
  Spin,
  message,
  Typography,
  Space,
  Badge,
  Card,
  Row,
  Col,
  Segmented,
  Popover,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { TeamOutlined } from '@ant-design/icons';
import type { UserListItem } from '@websocket-relay/shared';
import { getUsers } from '@/services/admin.service';

const { Title, Text, Link } = Typography;

/**
 * 角色过滤类型定义
 */
type RoleFilter = 'all' | 'admin' | 'user';

/**
 * 端点数量范围过滤类型定义
 */
type EndpointCountFilter = 'all' | 'none' | 'any' | 'multiple';

/**
 * UsersPage 组件 - 用户管理页面
 *
 * 职责:
 * - 展示所有用户列表
 * - 提供用户名搜索功能
 * - 显示用户角色(管理员/普通用户)
 * - 显示用户端点数量
 * - 支持点击端点数量跳转到端点列表
 *
 * 实现要点:
 * - 使用 Ant Design Table 组件展示数据
 * - 使用 Badge 组件显示管理员标识
 * - 使用 Input.Search 实现搜索功能
 * - 使用 Typography.Link 实现可点击的端点数量
 */
function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [endpointCountFilter, setEndpointCountFilter] = useState<EndpointCountFilter>('all');

  /**
   * 加载用户列表(组件挂载时)
   */
  useEffect(() => {
    void fetchUsers();
  }, []);

  /**
   * 加载用户列表
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: UserListItem[] = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      void message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理用户搜索
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  /**
   * 获取过滤后的用户列表
   * 支持角色过滤、端点数量范围过滤和搜索过滤的组合
   */
  const getFilteredUsers = (): UserListItem[] => {
    let filtered = users;

    // 角色过滤
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (roleFilter === 'admin') return user.is_admin === true;
        if (roleFilter === 'user') return user.is_admin === false;
        return true;
      });
    }

    // 端点数量范围过滤
    if (endpointCountFilter !== 'all') {
      filtered = filtered.filter((user) => {
        switch (endpointCountFilter) {
          case 'none':
            return user.endpoint_count === 0;
          case 'any':
            return user.endpoint_count > 0;
          case 'multiple':
            return user.endpoint_count >= 3;
          default:
            return true;
        }
      });
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => user.username.toLowerCase().includes(lowerQuery));
    }

    return filtered;
  };

  /**
   * 处理查看用户端点（路由跳转）
   */
  const handleViewUserEndpoints = (user: UserListItem) => {
    void navigate(`/admin/users/${user.id}/endpoints`);
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (date: string): string => {
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error('日期格式化失败:', date, error);
      return '日期无效';
    }
  };

  /**
   * 渲染用户名 Popover（鼠标悬停显示用户详情）
   */
  const renderUserPopover = (user: UserListItem) => {
    const content = (
      <div style={{ width: '300px' }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {user.is_admin ? '管理员' : '普通用户'}
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">{formatDateTime(user.created_at)}</Descriptions.Item>
          <Descriptions.Item label="端点数量">{user.endpoint_count}</Descriptions.Item>
        </Descriptions>
      </div>
    );

    return (
      <Popover content={content} title="用户详情" trigger="hover">
        <Text style={{ cursor: 'pointer', color: '#1890ff' }}>{user.username}</Text>
      </Popover>
    );
  };

  /**
   * Table 列配置
   */
  const columns: ColumnsType<UserListItem> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (_text: unknown, record: UserListItem) => renderUserPopover(record),
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      key: 'is_admin',
      render: (_text: unknown, record: UserListItem) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        record.is_admin ? (
          <Badge count="管理员" style={{ backgroundColor: '#52c41a' }} />
        ) : (
          <Text type="secondary">普通用户</Text>
        ),
    },
    {
      title: '端点数量',
      dataIndex: 'endpoint_count',
      key: 'endpoint_count',
      sorter: (a, b) => a.endpoint_count - b.endpoint_count,
      render: (count: number, record: UserListItem) =>
        count > 0 ? (
          <Link onClick={() => handleViewUserEndpoints(record)}>{count}</Link>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend', // 默认降序（最新用户在前）
    },
  ];

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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '20px 24px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Space direction="vertical" size={0}>
            <Title level={2} style={{ margin: 0 }}>
              用户管理
            </Title>
            <Text type="secondary">查看和管理系统用户</Text>
          </Space>
        </div>

        {/* 搜索和过滤器卡片 */}
        <Card
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={24} md={10}>
              <Input.Search
                placeholder="搜索用户名"
                allowClear
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '100%' }}
                size="large"
              />
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Segmented
                value={roleFilter}
                onChange={(value) => setRoleFilter(value as RoleFilter)}
                options={[
                  { label: '全部', value: 'all' },
                  { label: '管理员', value: 'admin' },
                  { label: '普通用户', value: 'user' },
                ]}
                block
                size="large"
              />
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Segmented
                value={endpointCountFilter}
                onChange={(value) => setEndpointCountFilter(value as EndpointCountFilter)}
                options={[
                  { label: '全部', value: 'all' },
                  { label: '无端点', value: 'none' },
                  { label: '有端点', value: 'any' },
                  { label: '多端点', value: 'multiple' },
                ]}
                block
                size="large"
              />
            </Col>
          </Row>
        </Card>

        {/* 用户列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <Spin tip="加载中..." size="large" />
          </div>
        ) : (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              background: '#fff',
            }}
          >
            <Table
              dataSource={getFilteredUsers()}
              columns={columns}
              rowKey="id"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个用户`,
              }}
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <TeamOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                    <div style={{ marginTop: '16px', color: '#999' }}>还没有用户数据</div>
                  </div>
                ),
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default UsersPage;
