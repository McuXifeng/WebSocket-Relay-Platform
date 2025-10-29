import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Dropdown,
  Grid,
} from 'antd';
import { CopyOutlined, EllipsisOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { format } from 'date-fns';
import { getEndpoints, createEndpoint } from '@/services/endpoint.service';
import type { EndpointWithUrl } from '@websocket-relay/shared/types/endpoint.types';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * DashboardPage 组件 - 端点管理主页
 *
 * 职责：
 * - 展示当前用户的所有端点列表
 * - 提供 WebSocket URL 复制功能
 * - 显示端点创建时间和最后活跃时间
 *
 * 实现要点：
 * - 嵌套在 MainLayout 内，复用顶部导航栏（用户信息和登出按钮）
 * - 使用 useEffect 在组件挂载时加载端点列表
 * - 使用 Ant Design Table 组件展示数据
 * - 使用 Clipboard API 实现复制功能
 *
 * 架构设计：
 * - DashboardPage 不包含完整的 Layout，由 MainLayout 提供统一的应用框架
 * - 这样可以在所有受保护路由之间保持一致的导航体验
 */
function DashboardPage() {
  const [endpoints, setEndpoints] = useState<EndpointWithUrl[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  // 判断是否为移动端 (小于 md 断点，即 <768px)
  const isMobile = !screens.md;

  /**
   * 加载端点列表（组件挂载时）
   */
  useEffect(() => {
    void fetchEndpoints();
  }, []);

  /**
   * 加载端点列表（提取为独立函数，供创建成功后刷新使用）
   */
  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (error) {
      console.error('加载端点列表失败:', error);
      // 错误消息已经在 apiClient 响应拦截器中显示
    } finally {
      setLoading(false);
    }
  };

  /**
   * 复制 WebSocket URL 到剪贴板
   *
   * @param url WebSocket URL
   */
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success('已复制');
    } catch (error) {
      console.error('复制失败:', error);
      void message.error('复制失败');
    }
  };

  /**
   * 创建端点处理函数
   */
  const handleCreateEndpoint = async () => {
    try {
      setCreateLoading(true);
      // 验证表单
      const values = (await form.validateFields()) as { name?: string };
      // 调用 createEndpoint API
      const name = values.name ?? undefined;
      await createEndpoint({ name });
      // 创建成功
      void message.success('端点创建成功');
      // 关闭 Modal
      setIsModalOpen(false);
      // 重置表单
      form.resetFields();
      // 刷新端点列表
      await fetchEndpoints();
    } catch (error: unknown) {
      // 检查是否为表单验证错误
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        // 表单验证失败，不显示错误消息
        return;
      }
      // API 错误处理
      const axiosError = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      const errorCode = axiosError.response?.data?.error?.code;
      const errorMessage = axiosError.response?.data?.error?.message ?? '创建失败';

      // 特定错误码处理
      if (errorCode === 'ENDPOINT_LIMIT_REACHED') {
        void message.error('已达到端点数量上限（5个）');
      } else {
        void message.error(errorMessage);
      }
      // 保持 Modal 打开，允许用户重试
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (date: string | Date | null): string => {
    if (!date) return '从未活跃';
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm');
    } catch (error) {
      console.error('日期格式化失败:', date, error);
      return '日期无效';
    }
  };

  /**
   * 处理查看详情操作
   */
  const handleViewDetail = (endpointId: string) => {
    void navigate(`/endpoints/${endpointId}`);
  };

  /**
   * 构建端点操作菜单项
   */
  const getActionMenuItems = (endpointId: string, websocketUrl: string): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => {
        handleViewDetail(endpointId);
      },
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制 URL',
      onClick: () => {
        void handleCopy(websocketUrl);
      },
    },
  ];

  /**
   * Table 列配置
   */
  const columns: ColumnsType<EndpointWithUrl> = [
    {
      title: '端点名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'WebSocket URL',
      dataIndex: 'websocket_url',
      key: 'websocket_url',
      render: (url: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ flex: 1, wordBreak: 'break-all' }}>{url}</span>
          <Button size="small" icon={<CopyOutlined />} onClick={() => void handleCopy(url)}>
            复制
          </Button>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '最后活跃时间',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      width: 180,
      render: (date: string | Date | null) =>
        date ? formatDateTime(date) : <span style={{ color: '#999' }}>从未活跃</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_text: unknown, record: EndpointWithUrl) => (
        <Link to={`/endpoints/${record.id}`}>
          <Button type="link" size="small">
            查看详情
          </Button>
        </Link>
      ),
    },
  ];

  /**
   * 移动端 Card 列表渲染
   */
  const renderMobileCardList = () => {
    if (endpoints.length === 0) {
      return (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#999', margin: 0 }}>还没有端点,点击创建按钮开始</p>
        </Card>
      );
    }

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {endpoints.map((ep) => {
          const endpoint = ep;
          return (
            <Card
              key={endpoint.id}
              size="small"
              title={
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text strong ellipsis style={{ flex: 1 }}>
                    {endpoint.name}
                  </Text>
                  <Dropdown
                    menu={{ items: getActionMenuItems(endpoint.id, endpoint.websocket_url) }}
                    trigger={['click']}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} size="large" />
                  </Dropdown>
                </div>
              }
              style={{ background: '#fff' }}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* WebSocket URL */}
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    WebSocket URL
                  </Text>
                  <br />
                  <Text
                    copyable={{ text: endpoint.websocket_url }}
                    ellipsis={{ tooltip: endpoint.websocket_url }}
                    style={{
                      fontSize: '13px',
                      wordBreak: 'break-all',
                      display: 'block',
                      marginTop: '4px',
                    }}
                  >
                    {endpoint.websocket_url}
                  </Text>
                </div>

                {/* 创建时间 */}
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    创建时间
                  </Text>
                  <br />
                  <Text style={{ fontSize: '13px' }}>{formatDateTime(endpoint.created_at)}</Text>
                </div>

                {/* 最后活跃时间 */}
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    最后活跃
                  </Text>
                  <br />
                  <Text
                    style={{
                      fontSize: '13px',
                      color: endpoint.last_active_at ? undefined : '#999',
                    }}
                  >
                    {endpoint.last_active_at ? formatDateTime(endpoint.last_active_at) : '从未活跃'}
                  </Text>
                </div>
              </Space>
            </Card>
          );
        })}
      </Space>
    );
  };

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
            端点管理
          </Title>
          <span style={{ color: '#666' }}>管理您的所有 WebSocket 端点</span>
        </Space>
        <Button type="primary" size="large" onClick={() => setIsModalOpen(true)}>
          创建端点
        </Button>
      </div>

      {/* 创建端点 Modal */}
      <Modal
        title="创建新端点"
        open={isModalOpen}
        onOk={() => void handleCreateEndpoint()}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={createLoading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="端点名称"
            rules={[{ max: 50, message: '端点名称不能超过50个字符' }]}
          >
            <Input placeholder="未命名端点" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 端点列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <Spin tip="加载中..." size="large" />
        </div>
      ) : isMobile ? (
        // 移动端使用 Card 列表视图
        renderMobileCardList()
      ) : (
        // 桌面端使用 Table 视图
        <Table
          dataSource={endpoints}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个端点`,
          }}
          locale={{
            emptyText: '还没有端点,点击创建按钮开始',
          }}
          style={{ background: '#fff' }}
        />
      )}
    </div>
  );
}

export default DashboardPage;
