import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions,
  Button,
  Spin,
  Result,
  Space,
  message,
  Modal,
  Card,
  Grid,
  Tag,
  Tooltip,
  Radio,
  Form,
  Input,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  BookOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { EndpointWithUrl, EndpointStatsResponse } from '@websocket-relay/shared';
import { ForwardingMode } from '@websocket-relay/shared';
import {
  getEndpointById,
  deleteEndpoint,
  getEndpointStats,
  updateForwardingMode,
} from '../services/endpoint.service';
import EndpointStatsCard from '../components/endpoints/EndpointStatsCard';
import MessageHistoryCard from '../components/endpoints/MessageHistoryCard';
import DeviceListCard from '../components/endpoints/DeviceListCard';
import { usePolling } from '../hooks/usePolling';

const { useBreakpoint } = Grid;

/**
 * EndpointDetailPage 组件
 *
 * 职责：展示单个端点的详细信息，提供复制和删除功能
 *
 * 功能：
 * - 从 URL 获取端点 ID 并加载详情
 * - 使用 Descriptions 组件展示端点信息
 * - 提供 WebSocket URL 复制功能
 * - 提供删除端点功能（带确认对话框）
 * - 错误处理（404、403、网络错误）
 *
 * 关键原则：
 * - KISS: 使用 React Hooks 管理状态，逻辑清晰
 * - DRY: 复制功能封装为独立函数
 * - 错误处理: 针对不同错误码提供友好提示
 */
function EndpointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  // 判断是否为移动端 (小于 md 断点，即 <768px)
  const isMobile = !screens.md;

  const [endpoint, setEndpoint] = useState<EndpointWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 统计数据状态
  const [stats, setStats] = useState<EndpointStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 修改转发模式状态
  const [isForwardingModeModalOpen, setIsForwardingModeModalOpen] = useState(false);
  const [updatingForwardingMode, setUpdatingForwardingMode] = useState(false);
  const [forwardingModeForm] = Form.useForm();

  // 加载端点详情
  useEffect(() => {
    async function fetchEndpoint() {
      if (!id || typeof id !== 'string') {
        setError('端点 ID 缺失');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data: EndpointWithUrl = await getEndpointById(id);
        setEndpoint(data);
        setError(null);
      } catch (err: unknown) {
        // 类型安全的错误处理
        const error = err as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
              };
            };
          };
          message?: string;
        };

        const errorCode = error.response?.data?.error?.code;
        const errorMessage = error.response?.data?.error?.message || '加载失败';

        // 针对特定错误码提供友好提示
        if (errorCode === 'ENDPOINT_NOT_FOUND') {
          setError('端点不存在');
        } else if (errorCode === 'FORBIDDEN') {
          setError('无权访问此端点');
        } else {
          setError(errorMessage);
        }

        void message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    void fetchEndpoint();
  }, [id]);

  // 加载统计数据的函数（支持静默刷新）
  const fetchStats = useCallback(
    async (silent = false) => {
      // 只有当端点 ID 存在且类型正确时才加载统计数据
      if (!id || typeof id !== 'string') {
        return;
      }

      try {
        // 非静默模式才显示 loading
        if (!silent) {
          setStatsLoading(true);
        }

        const data = await getEndpointStats(id);
        setStats(data);
      } catch (err: unknown) {
        // 静默刷新时不显示错误提示
        if (!silent) {
          void message.error('获取统计数据失败，请稍后重试');
        }
      } finally {
        if (!silent) {
          setStatsLoading(false);
        }
      }
    },
    [id]
  );

  // 使用智能轮询 Hook，每 5 秒静默刷新一次（页面可见时）
  // 页面不可见时自动暂停，重新可见时立即刷新
  usePolling(() => fetchStats(true), {
    interval: 5000, // 5 秒间隔，与历史消息和设备列表保持一致
    enabled: !!id,
  });

  // 手动刷新统计数据的函数
  const handleRefreshStats = async () => {
    if (!id || typeof id !== 'string') {
      return;
    }

    try {
      setStatsLoading(true);
      const data = await getEndpointStats(id);
      setStats(data);
      void message.success('统计数据已刷新');
    } catch (err: unknown) {
      void message.error('刷新统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 复制 WebSocket URL 到剪贴板
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success('已复制');
    } catch (err) {
      // Clipboard API 不可用时的 fallback
      void message.error('复制失败');
    }
  };

  // 删除端点
  const handleDelete = (endpointId: string) => {
    void Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此端点吗?删除后无法恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setDeleting(true);
          await deleteEndpoint(endpointId);
          void message.success('端点已删除');
          void navigate('/dashboard');
        } catch (err: unknown) {
          // 类型安全的错误处理
          const error = err as {
            response?: {
              data?: {
                error?: {
                  message?: string;
                };
              };
            };
            message?: string;
          };

          const errorMessage = error.response?.data?.error?.message || '删除失败';
          void message.error(errorMessage);
          setDeleting(false);
        }
      },
    });
  };

  // 返回 Dashboard
  const handleBack = () => {
    void navigate('/dashboard');
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string | Date) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  // 打开修改转发模式 Modal
  const handleOpenForwardingModeModal = () => {
    if (endpoint) {
      forwardingModeForm.setFieldsValue({
        forwarding_mode: endpoint.forwarding_mode,
        custom_header: endpoint.custom_header ?? '',
      });
      setIsForwardingModeModalOpen(true);
    }
  };

  // 关闭修改转发模式 Modal
  const handleCloseForwardingModeModal = () => {
    setIsForwardingModeModalOpen(false);
    forwardingModeForm.resetFields();
  };

  // 处理转发模式更新
  const handleUpdateForwardingMode = async () => {
    if (!id || typeof id !== 'string' || !endpoint) {
      return;
    }

    try {
      setUpdatingForwardingMode(true);
      const values = forwardingModeForm.getFieldsValue() as {
        forwarding_mode: string;
        custom_header?: string;
      };
      const updatedEndpoint = await updateForwardingMode(
        id,
        values.forwarding_mode,
        values.custom_header || null
      );
      setEndpoint(updatedEndpoint);
      void message.success('转发模式已更新');
      handleCloseForwardingModeModal();
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            error?: {
              message?: string;
            };
          };
        };
        message?: string;
      };

      const errorMessage = error.response?.data?.error?.message || '更新失败';
      void message.error(errorMessage);
    } finally {
      setUpdatingForwardingMode(false);
    }
  };

  // 渲染转发模式标签
  const renderForwardingModeTag = (mode: ForwardingMode) => {
    switch (mode) {
      case ForwardingMode.DIRECT:
        return (
          <Tooltip title="消息原样转发，不做任何处理">
            <Tag color="default">直接转发</Tag>
          </Tooltip>
        );
      case ForwardingMode.JSON:
        return (
          <Tooltip title="消息标准化为 JSON 格式（推荐）">
            <Tag color="blue">JSON 标准化</Tag>
          </Tooltip>
        );
      case ForwardingMode.CUSTOM_HEADER:
        return (
          <Tooltip title="在消息前添加自定义帧头（简单字符串拼接）">
            <Tag color="purple">自定义帧头</Tag>
          </Tooltip>
        );
      default:
        return <Tag color="default">未知模式</Tag>;
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error || !endpoint) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error || '未找到端点信息'}
        extra={
          <Button type="primary" onClick={handleBack} icon={<ArrowLeftOutlined />}>
            返回首页
          </Button>
        }
      />
    );
  }

  // 类型守卫：确保 endpoint 存在
  if (!endpoint) {
    return null; // This should never happen, but helps TypeScript
  }

  // 正常显示端点详情
  const currentEndpoint: EndpointWithUrl = endpoint;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 顶部操作栏 */}
        <Space
          direction={isMobile ? 'vertical' : 'horizontal'}
          size="small"
          style={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} block={isMobile}>
            返回
          </Button>
          <Button
            type="default"
            icon={<BookOutlined />}
            onClick={() => {
              void navigate('/docs/developer');
            }}
            block={isMobile}
          >
            查看开发文档
          </Button>
        </Space>

        {/* 端点详情卡片 */}
        <Card title="端点详情" bordered={false}>
          <Descriptions bordered column={isMobile ? 1 : 2}>
            <Descriptions.Item label="端点名称">{currentEndpoint.name}</Descriptions.Item>

            <Descriptions.Item label="端点 ID">{currentEndpoint.endpoint_id}</Descriptions.Item>

            <Descriptions.Item label="转发模式">
              <Space>
                {renderForwardingModeTag(currentEndpoint.forwarding_mode)}
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={handleOpenForwardingModeModal}
                  type="link"
                >
                  修改
                </Button>
              </Space>
            </Descriptions.Item>

            {/* 自定义帧头显示 - 仅在 CUSTOM_HEADER 模式下显示 */}
            {currentEndpoint.forwarding_mode === ForwardingMode.CUSTOM_HEADER && (
              <Descriptions.Item label="自定义帧头">
                <Tag color="geekblue">{currentEndpoint.custom_header || '(未设置)'}</Tag>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="WebSocket URL" span={isMobile ? 1 : 2}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: '8px',
                  alignItems: isMobile ? 'flex-start' : 'center',
                }}
              >
                <span
                  style={{
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    flex: 1,
                  }}
                >
                  {currentEndpoint.websocket_url}
                </span>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => void handleCopy(currentEndpoint.websocket_url)}
                  size={isMobile ? 'middle' : 'small'}
                  type="primary"
                  ghost
                  style={{ flexShrink: 0 }}
                >
                  复制
                </Button>
              </div>
            </Descriptions.Item>

            <Descriptions.Item label="创建时间">
              {formatDateTime(currentEndpoint.created_at)}
            </Descriptions.Item>

            <Descriptions.Item label="最后活跃时间">
              {currentEndpoint.last_active_at
                ? formatDateTime(currentEndpoint.last_active_at)
                : '从未活跃'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 实时统计卡片 */}
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void handleRefreshStats()}
              loading={statsLoading}
            >
              刷新统计数据
            </Button>
          </div>
          <EndpointStatsCard stats={stats} loading={statsLoading} />
        </div>

        {/* 历史消息卡片 */}
        <MessageHistoryCard endpointId={currentEndpoint.id} />

        {/* 连接设备列表 */}
        <DeviceListCard endpointId={currentEndpoint.id} />

        {/* 危险操作区 */}
        <Card title="危险操作" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ color: '#666' }}>删除端点后将无法恢复，请谨慎操作。</div>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(currentEndpoint.id)}
              loading={deleting}
              type="primary"
              block={isMobile}
              size={isMobile ? 'large' : 'middle'}
            >
              删除端点
            </Button>
          </Space>
        </Card>
      </Space>

      {/* 修改转发模式 Modal */}
      <Modal
        title="修改转发模式"
        open={isForwardingModeModalOpen}
        onOk={() => void handleUpdateForwardingMode()}
        onCancel={handleCloseForwardingModeModal}
        confirmLoading={updatingForwardingMode}
        okText="确认"
        cancelText="取消"
      >
        <Form form={forwardingModeForm} layout="vertical">
          <Form.Item
            name="forwarding_mode"
            label="转发模式"
            rules={[{ required: true, message: '请选择转发模式' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value={ForwardingMode.DIRECT}>
                  <Tooltip title="消息原样转发，不做任何处理">直接转发（原始消息）</Tooltip>
                </Radio>
                <Radio value={ForwardingMode.JSON}>
                  <Tooltip title="消息标准化为 JSON 格式（推荐）">JSON 标准化转发（推荐）</Tooltip>
                </Radio>
                <Radio value={ForwardingMode.CUSTOM_HEADER}>
                  <Tooltip title="在消息前添加自定义帧头（简单字符串拼接）">
                    自定义帧头转发（高级）
                  </Tooltip>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(
              prevValues: { forwarding_mode?: ForwardingMode },
              currentValues: { forwarding_mode?: ForwardingMode }
            ) => prevValues.forwarding_mode !== currentValues.forwarding_mode}
          >
            {({ getFieldValue }) =>
              (getFieldValue('forwarding_mode') as ForwardingMode) ===
              ForwardingMode.CUSTOM_HEADER ? (
                <Form.Item
                  name="custom_header"
                  label={
                    <span>
                      自定义帧头字符串{' '}
                      <Tooltip title="将在每条消息前添加此字符串（简单拼接，不包含时间戳等信息）">
                        <span style={{ cursor: 'help', color: '#999' }}>ⓘ</span>
                      </Tooltip>
                    </span>
                  }
                  rules={[
                    { max: 255, message: '自定义帧头不能超过255个字符' },
                    {
                      required: true,
                      message: '使用自定义帧头模式时，请设置帧头字符串',
                    },
                  ]}
                >
                  <Input.TextArea
                    placeholder="例如：[MSG] 或 Header:"
                    rows={3}
                    showCount
                    maxLength={255}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default EndpointDetailPage;
