import { useState, useEffect } from 'react';
import { Table, Input, Spin, message, Typography, Space, Badge, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { UserOutlined } from '@ant-design/icons';
import type { UserListItem } from '@websocket-relay/shared/types/user.types';
import { getUsers } from '@/services/admin.service';

const { Title, Text, Link } = Typography;

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
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * 加载用户列表(组件挂载时)
   */
  useEffect(() => {
    void fetchUsers();
  }, []);

  /**
   * 同步 filteredUsers 当 users 变化时
   */
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

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
    if (!query.trim()) {
      // 清空搜索，显示所有用户
      setFilteredUsers(users);
    } else {
      // 按用户名过滤（不区分大小写）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const filtered = users.filter((user) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        user.username.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  /**
   * 处理查看用户端点
   */
  const handleViewUserEndpoints = (userId: string) => {
    // 跳转到 Dashboard 并传递 userId 查询参数
    void navigate(`/dashboard?userId=${userId}`);
    void message.info('正在查看该用户的端点列表');
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
   * Table 列配置
   */
  const columns: ColumnsType<UserListItem> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      sorter: (a, b) => a.endpoint_count - b.endpoint_count,
      render: (count: number, record: UserListItem) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        count > 0 ? (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          <Link onClick={() => handleViewUserEndpoints(record.id)}>{count}</Link>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      render: (date: string) => formatDateTime(date),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* 页面标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>
            <UserOutlined style={{ marginRight: '8px' }} />
            用户管理
          </Title>
          <span style={{ color: '#666' }}>查看和管理系统用户</span>
        </Space>
        <Input.Search
          placeholder="搜索用户名"
          allowClear
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <Spin tip="加载中..." size="large" />
        </div>
      ) : (
        <Card>
          <Table
            dataSource={filteredUsers}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个用户`,
            }}
            locale={{
              emptyText: '暂无用户',
            }}
          />
        </Card>
      )}
    </div>
  );
}

export default UsersPage;
