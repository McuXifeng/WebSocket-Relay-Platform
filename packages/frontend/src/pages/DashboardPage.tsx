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
  Dropdown,
  Grid,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Radio,
} from 'antd';
import {
  CopyOutlined,
  EllipsisOutlined,
  EyeOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { format, isAfter, subDays } from 'date-fns';
import { getEndpoints, createEndpoint, deleteEndpoint } from '@/services/endpoint.service';
import type { EndpointWithUrl } from '@websocket-relay/shared';
import { ForwardingMode } from '@websocket-relay/shared';
import './DashboardPage.module.css';

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
   * 计算活跃端点数量（最近7天有活动的端点）
   *
   * @param endpoints 端点列表
   * @returns 活跃端点数量
   */
  const calculateActiveEndpoints = (endpoints: EndpointWithUrl[]): number => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return endpoints.filter((ep) => {
      if (!ep.last_active_at) return false;
      return isAfter(new Date(ep.last_active_at), sevenDaysAgo);
    }).length;
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
   * 删除端点
   *
   * @param id 端点 ID
   */
  const handleDeleteEndpoint = async (id: string) => {
    try {
      await deleteEndpoint(id);
      void message.success('端点删除成功');
      await fetchEndpoints(); // 刷新端点列表
    } catch (error) {
      console.error('删除端点失败:', error);
      // 错误消息已经在 apiClient 拦截器中显示
    }
  };

  /**
   * 创建端点处理函数
   */
  const handleCreateEndpoint = async () => {
    try {
      setCreateLoading(true);
      // 验证表单
      const values = (await form.validateFields()) as {
        name?: string;
        forwarding_mode?: ForwardingMode;
        custom_header?: string;
      };
      // 调用 createEndpoint API
      const name = values.name ?? undefined;
      const forwarding_mode = values.forwarding_mode ?? undefined;
      const custom_header = values.custom_header ?? undefined;
      await createEndpoint({ name, forwarding_mode, custom_header });
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
  const getActionMenuItems = (
    endpointId: string,
    websocketUrl: string,
    endpointName: string
  ): MenuProps['items'] => [
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
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除端点',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除端点"${endpointName}"吗？此操作不可撤销。`,
          okText: '确认',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: async () => {
            await handleDeleteEndpoint(endpointId);
          },
        });
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
      ellipsis: {
        showTitle: false,
      },
      render: (url: string) => (
        <Tooltip placement="topLeft" title={url}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ flex: 1 }}>{url}</span>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                void handleCopy(url);
              }}
            >
              复制
            </Button>
          </div>
        </Tooltip>
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
        date ? (
          formatDateTime(date)
        ) : (
          <Text type="secondary" style={{ fontSize: '13px' }}>
            从未活跃
          </Text>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_text: unknown, record: EndpointWithUrl) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              void navigate(`/endpoints/${record.id}`);
            }}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除端点"${record.name}"吗？此操作不可撤销。`}
            onConfirm={() => void handleDeleteEndpoint(record.id)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /**
   * 移动端 Card 列表渲染
   */
  const renderMobileCardList = () => {
    if (endpoints.length === 0) {
      return (
        <Card
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: '#fafafa',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <DatabaseOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#595959', margin: '16px 0 8px' }}>
            您还没有创建任何端点
          </p>
          <p style={{ fontSize: '14px', color: '#8c8c8c', margin: 0 }}>
            点击上方按钮创建您的第一个端点
          </p>
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
                    menu={{
                      items: getActionMenuItems(endpoint.id, endpoint.websocket_url, endpoint.name),
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      size="large"
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    />
                  </Dropdown>
                </div>
              }
              style={{
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
              }}
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
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f5f5f5', padding: '24px' }}>
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
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
              端点管理
            </Title>
            <Text type="secondary">管理您的所有 WebSocket 端点</Text>
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

            <Form.Item
              name="forwarding_mode"
              label={
                <span>
                  转发模式{' '}
                  <Tooltip title="选择 WebSocket 消息的转发格式">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              initialValue={ForwardingMode.JSON}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value={ForwardingMode.DIRECT}>
                    <Tooltip
                      title="消息原样转发，不做任何处理，保留原始格式和类型"
                      placement="right"
                    >
                      直接转发（原始消息）
                    </Tooltip>
                  </Radio>
                  <Radio value={ForwardingMode.JSON}>
                    <Tooltip
                      title="消息标准化为 JSON 格式，确保格式一致性（推荐）"
                      placement="right"
                    >
                      JSON 标准化转发（推荐）
                    </Tooltip>
                  </Radio>
                  <Radio value={ForwardingMode.CUSTOM_HEADER}>
                    <Tooltip title="在消息前添加自定义帧头（简单字符串拼接）" placement="right">
                      自定义帧头转发（高级）
                    </Tooltip>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            {/* 自定义帧头输入框 - 仅在选择 CUSTOM_HEADER 模式时显示 */}
            <Form.Item
              noStyle
              shouldUpdate={(
                prevValues: { forwarding_mode?: ForwardingMode },
                currentValues: { forwarding_mode?: ForwardingMode }
              ) => prevValues.forwarding_mode !== currentValues.forwarding_mode}
            >
              {({ getFieldValue }) =>
                getFieldValue('forwarding_mode') === ForwardingMode.CUSTOM_HEADER ? (
                  <Form.Item
                    name="custom_header"
                    label={
                      <span>
                        自定义帧头{' '}
                        <Tooltip title="输入一个字符串作为帧头，消息转发时会在原始数据前添加这个帧头（例如：帧头为 'test'，数据为 'xifeng'，转发数据为 'testxifeng'）">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: '请输入自定义帧头',
                      },
                      {
                        max: 100,
                        message: '帧头长度不能超过 100 个字符',
                      },
                    ]}
                  >
                    <Input
                      placeholder="例如：test"
                      maxLength={100}
                      showCount
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Form>
        </Modal>

        {/* 统计卡片区域 */}
        {!loading && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={12}>
              <Card
                hoverable
                style={{
                  borderRadius: '12px',
                  border: '2px solid #1890ff',
                  boxShadow: '0 2px 8px rgba(24,144,255,0.15)',
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ fontSize: '14px', fontWeight: 500 }}>总端点数</span>}
                  value={endpoints.length}
                  prefix={<DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '32px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Card
                hoverable
                style={{
                  borderRadius: '12px',
                  border: '2px solid #52c41a',
                  boxShadow: '0 2px 8px rgba(82,196,26,0.15)',
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Statistic
                  title={<span style={{ fontSize: '14px', fontWeight: 500 }}>活跃端点数</span>}
                  value={calculateActiveEndpoints(endpoints)}
                  suffix={<span style={{ fontSize: '14px' }}>/ 最近7天</span>}
                  prefix={<CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '32px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 端点列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>加载中...</div>
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
              emptyText: (
                <div style={{ padding: '80px 24px' }}>
                  <DatabaseOutlined
                    style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }}
                  />
                  <p style={{ fontSize: '16px', color: '#595959', margin: '16px 0 8px' }}>
                    您还没有创建任何端点
                  </p>
                  <p style={{ fontSize: '14px', color: '#8c8c8c', margin: '0 0 16px' }}>
                    点击上方按钮创建您的第一个端点
                  </p>
                  <Button type="primary" size="large" onClick={() => setIsModalOpen(true)}>
                    创建端点
                  </Button>
                </div>
              ),
            }}
            style={{
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            rowClassName={(_, index) => (index % 2 === 0 ? 'table-row-light' : 'table-row-dark')}
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
