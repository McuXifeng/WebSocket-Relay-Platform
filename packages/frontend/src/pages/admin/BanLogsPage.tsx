import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Form,
  Select,
  DatePicker,
  Button,
  Typography,
  Spin,
  message,
  Tag,
  Badge,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { HistoryOutlined, DownloadOutlined } from '@ant-design/icons';
import type { BanLog, BanLogQuery } from '@websocket-relay/shared';
import { getBanLogs } from '@/services/ban.service';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * BanLogsPage 组件 - 封禁日志页面
 *
 * 职责:
 * - 展示所有封禁/解封/禁用/启用操作日志
 * - 提供筛选功能(目标类型、操作类型、时间范围)
 * - 支持分页和数据导出
 *
 * Epic 10 Story 10.4: 前端管理员封禁界面
 */
function BanLogsPage() {
  const [logs, setLogs] = useState<BanLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<BanLogQuery>({ page: 1, page_size: 20 });
  const [form] = Form.useForm();

  /**
   * 加载封禁日志(组件挂载时和筛选条件变化时)
   */
  useEffect(() => {
    void fetchLogs();
    // eslint-disable-next-line
  }, [filters]);

  /**
   * 加载封禁日志
   */
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getBanLogs(filters);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error('加载封禁日志失败:', error);
      void message.error('加载封禁日志失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理筛选器提交
   */
  const handleSearch = () => {
    const values = form.getFieldsValue() as {
      target_type?: string;
      action?: string;
      date_range?: [Date, Date];
    };

    const newFilters: BanLogQuery = {
      page: 1, // 重置到第一页
      page_size: filters.page_size,
    };

    // 目标类型筛选
    if (values.target_type && values.target_type !== 'all') {
      newFilters.target_type = values.target_type as 'user' | 'endpoint';
    }

    // 操作类型筛选
    if (values.action && values.action !== 'all') {
      newFilters.action = values.action as 'ban' | 'unban' | 'disable' | 'enable';
    }

    // 时间范围筛选
    if (values.date_range && values.date_range.length === 2) {
      newFilters.start_date = values.date_range[0].toISOString();
      newFilters.end_date = values.date_range[1].toISOString();
    }

    setFilters(newFilters);
  };

  /**
   * 重置筛选器
   */
  const handleReset = () => {
    form.resetFields();
    setFilters({ page: 1, page_size: 20 });
  };

  /**
   * 处理分页变化
   */
  const handleTableChange = (pagination: { current?: number; pageSize?: number }) => {
    setFilters({
      ...filters,
      page: pagination.current || 1,
      page_size: pagination.pageSize || 20,
    });
  };

  /**
   * 导出CSV
   */
  const handleExport = async () => {
    try {
      // 导出当前筛选条件下的所有日志(不分页)
      const exportFilters = { ...filters, page: undefined, page_size: undefined };
      const data = await getBanLogs(exportFilters);

      // 生成CSV内容
      const csvHeader = '操作时间,目标类型,目标ID,操作类型,原因,操作者ID\n';
      const csvRows = data.logs.map((log) => {
        const createdAt = formatDateTime(log.created_at);
        const targetType = log.target_type === 'user' ? '用户' : '端点';
        const action = getActionLabel(log.action);
        const reason = (log.reason || '无').replace(/,/g, '，'); // 替换逗号避免CSV格式问题
        return `${createdAt},${targetType},${log.target_id},${action},${reason},${log.operator_id}`;
      });
      const csvContent = csvHeader + csvRows.join('\n');

      // 创建Blob并触发下载
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ban-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      void message.success(`成功导出 ${data.logs.length} 条记录`);
    } catch (error) {
      console.error('导出CSV失败:', error);
      void message.error('导出CSV失败');
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (date: string | Date): string => {
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error('日期格式化失败:', date, error);
      return '日期无效';
    }
  };

  /**
   * 获取操作类型标签文本
   */
  const getActionLabel = (action: string): string => {
    const actionMap: Record<string, string> = {
      ban: '封禁',
      unban: '解封',
      disable: '禁用',
      enable: '启用',
    };
    return actionMap[action] || action;
  };

  /**
   * 渲染操作类型Badge
   */
  const renderActionBadge = (action: string) => {
    const badgeMap: Record<
      string,
      { status: 'error' | 'success' | 'warning' | 'processing'; text: string }
    > = {
      ban: { status: 'error', text: '封禁' },
      unban: { status: 'success', text: '解封' },
      disable: { status: 'warning', text: '禁用' },
      enable: { status: 'processing', text: '启用' },
    };
    const config = badgeMap[action] || { status: 'default' as const, text: action };
    return <Badge status={config.status} text={config.text} />;
  };

  /**
   * 渲染目标类型Tag
   */
  const renderTargetTypeTag = (type: string) => {
    if (type === 'user') {
      return <Tag color="blue">用户</Tag>;
    } else if (type === 'endpoint') {
      return <Tag color="green">端点</Tag>;
    }
    return <Tag>{type}</Tag>;
  };

  /**
   * Table 列配置
   */
  const columns: ColumnsType<BanLog> = [
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      defaultSortOrder: 'descend', // 默认降序(最新的在前)
    },
    {
      title: '目标类型',
      dataIndex: 'target_type',
      key: 'target_type',
      width: 100,
      render: (type: string) => renderTargetTypeTag(type),
    },
    {
      title: '目标ID',
      dataIndex: 'target_id',
      key: 'target_id',
      width: 280,
      ellipsis: true,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => renderActionBadge(action),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string | null) => <Text type="secondary">{reason || '-'}</Text>,
    },
    {
      title: '操作者ID',
      dataIndex: 'operator_id',
      key: 'operator_id',
      width: 280,
      ellipsis: true,
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
              封禁日志
            </Title>
            <Text type="secondary">查看所有封禁/解封/禁用/启用操作记录</Text>
          </Space>
        </div>

        {/* 筛选器卡片 */}
        <Card
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Form form={form} layout="inline">
            <Form.Item label="目标类型" name="target_type" initialValue="all">
              <Select placeholder="全部" style={{ width: 120 }}>
                <Option value="all">全部</Option>
                <Option value="user">用户</Option>
                <Option value="endpoint">端点</Option>
              </Select>
            </Form.Item>
            <Form.Item label="操作类型" name="action" initialValue="all">
              <Select placeholder="全部" style={{ width: 120 }}>
                <Option value="all">全部</Option>
                <Option value="ban">封禁</Option>
                <Option value="unban">解封</Option>
                <Option value="disable">禁用</Option>
                <Option value="enable">启用</Option>
              </Select>
            </Form.Item>
            <Form.Item label="时间范围" name="date_range">
              <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
                <Button icon={<DownloadOutlined />} onClick={() => void handleExport()}>
                  导出CSV
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 日志列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>加载中...</div>
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
              dataSource={logs}
              columns={columns}
              rowKey="id"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
              }}
              pagination={{
                current: filters.page,
                pageSize: filters.page_size,
                total: total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              onChange={handleTableChange}
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <HistoryOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                    <div style={{ marginTop: '16px', color: '#999' }}>暂无封禁日志</div>
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

export default BanLogsPage;
