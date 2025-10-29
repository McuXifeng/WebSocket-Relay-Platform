import { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Spin,
  message,
  Typography,
  Space,
  Modal,
  Form,
  DatePicker,
  Tag,
  Segmented,
  Input,
  InputNumber,
  Card,
  Row,
  Col,
  Radio,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import type { Dayjs } from 'dayjs';
import type { InviteCodeListItem, CreateInviteCodeRequest } from '@websocket-relay/shared';
import { createInviteCode, getInviteCodes } from '@/services/admin.service';

const { Title, Text } = Typography;

/**
 * 状态过滤类型定义
 */
type StatusFilter = 'all' | 'unused' | 'used' | 'expired';

/**
 * InviteCodesPage 组件 - 授权码管理页面
 *
 * 职责:
 * - 展示所有授权码列表
 * - 提供授权码生成功能
 * - 显示授权码状态(未使用/已使用/已过期)
 * - 支持复制授权码到剪贴板
 *
 * 实现要点:
 * - 使用 Ant Design Table 组件展示数据
 * - 使用 Tag 组件显示不同状态
 * - 使用 Modal 和 Form 组件实现授权码生成
 * - 使用 Typography.Text 的 copyable 属性实现复制功能
 */
function InviteCodesPage() {
  const [inviteCodes, setInviteCodes] = useState<InviteCodeListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [form] = Form.useForm();

  // 导出相关状态
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  /**
   * 加载授权码列表(组件挂载时)
   */
  useEffect(() => {
    void fetchInviteCodes();
  }, []);

  /**
   * 加载授权码列表(提取为独立函数,供生成成功后刷新使用)
   */
  const fetchInviteCodes = async () => {
    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: InviteCodeListItem[] = await getInviteCodes();
      setInviteCodes(data);
    } catch (error) {
      console.error('加载授权码列表失败:', error);
      void message.error('加载授权码列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 生成授权码处理函数（支持批量生成）
   */
  const handleCreateInviteCode = async () => {
    try {
      setCreateLoading(true);
      // 验证表单
      const values = (await form.validateFields()) as { count: number; expires_at?: Dayjs };

      // 构建请求数据
      const payload: CreateInviteCodeRequest = values.expires_at
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          { expires_at: values.expires_at.toISOString() }
        : {};

      const count = values.count ?? 1;

      // 并行创建多个授权码
      const promises = Array.from({ length: count }, () => createInviteCode(payload));
      const results = await Promise.all(promises);

      // 生成成功
      void message.success(`成功生成 ${results.length} 个授权码`);

      // 关闭 Modal
      setModalVisible(false);

      // 重置表单
      form.resetFields();

      // 刷新授权码列表
      await fetchInviteCodes();
    } catch (error: unknown) {
      // 检查是否为表单验证错误
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        // 表单验证失败,不显示错误消息
        return;
      }

      // API 错误处理
      console.error('授权码生成失败:', error);
      void message.error('授权码生成失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (date: string | null): string => {
    if (!date) return '永久';
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm');
    } catch (error) {
      console.error('日期格式化失败:', date, error);
      return '日期无效';
    }
  };

  /**
   * 获取授权码状态
   */
  const getInviteCodeStatus = (
    record: InviteCodeListItem
  ): { text: string; color: 'blue' | 'default' | 'error' } => {
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const isExpired: boolean = !!(record.expires_at && new Date(record.expires_at) < now);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isUsed: boolean = !!record.used_by;

    if (isUsed) {
      return { text: '已使用', color: 'default' };
    } else if (isExpired) {
      return { text: '已过期', color: 'error' };
    } else {
      return { text: '未使用', color: 'blue' };
    }
  };

  /**
   * 获取过滤后的授权码数据
   * 根据状态过滤器和搜索文本过滤授权码列表
   */
  const getFilteredData = (): InviteCodeListItem[] => {
    let filtered = inviteCodes;

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => {
        const now = new Date();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        const isExpired = !!(item.expires_at && new Date(item.expires_at) < now);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const isUsed = !!item.used_by;

        switch (statusFilter) {
          case 'unused':
            return !isUsed && !isExpired;
          case 'used':
            return isUsed;
          case 'expired':
            return isExpired && !isUsed;
          default:
            return true;
        }
      });
    }

    // 搜索过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.code.toLowerCase().includes(lowerSearch) ||
          (item.used_by_username?.toLowerCase().includes(lowerSearch) ?? false)
      );
    }

    return filtered;
  };

  /**
   * 导出授权码为 CSV 格式
   * @param data 授权码数据数组
   * @returns CSV 字符串
   */
  const exportToCSV = (data: InviteCodeListItem[]): string => {
    // CSV 表头
    const headers = ['授权码', '状态', '使用者', '有效期', '创建时间'];
    const headerRow = headers.join(',');

    // 字段值转义函数（如果包含逗号或引号，使用双引号包裹）
    const escapeField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    // 数据行
    const dataRows = data.map((item) => {
      const status = getInviteCodeStatus(item).text;
      const usedBy = item.used_by_username || '-';
      const expiresAt = formatDateTime(item.expires_at);
      const createdAt = formatDateTime(item.created_at);

      return [
        escapeField(item.code),
        escapeField(status),
        escapeField(usedBy),
        escapeField(expiresAt),
        escapeField(createdAt),
      ].join(',');
    });

    // 合并表头和数据行
    return [headerRow, ...dataRows].join('\n');
  };

  /**
   * 导出授权码为 JSON 格式
   * @param data 授权码数据数组
   * @returns JSON 字符串
   */
  const exportToJSON = (data: InviteCodeListItem[]): string => {
    // 使用 JSON.stringify 格式化数据（缩进 2 空格）
    return JSON.stringify(data, null, 2);
  };

  /**
   * 生成导出文件名（包含时间戳）
   * @param format 导出格式（csv 或 json）
   * @returns 文件名
   */
  const generateFilename = (formatType: 'csv' | 'json'): string => {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    return `invite-codes-${timestamp}.${formatType}`;
  };

  /**
   * 下载文件到本地
   * @param content 文件内容
   * @param filename 文件名
   * @param mimeType MIME 类型
   */
  const downloadFile = (content: string, filename: string, mimeType: string): void => {
    // 创建 Blob 对象
    const blob = new Blob([content], { type: mimeType });

    // 生成下载链接
    const url = URL.createObjectURL(blob);

    // 创建临时 <a> 标签并触发点击下载
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 清理：移除临时元素并释放 URL 对象
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * 处理导出操作
   */
  const handleExport = (): void => {
    try {
      // 1. 获取当前过滤后的授权码数据
      const data = getFilteredData();

      // 2. 检查数据是否为空
      if (data.length === 0) {
        void message.warning('没有可导出的授权码数据');
        return;
      }

      // 3. 设置加载状态
      setExportLoading(true);

      // 4. 根据选择的格式导出
      let content: string;
      let mimeType: string;

      if (exportFormat === 'csv') {
        content = exportToCSV(data);
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        content = exportToJSON(data);
        mimeType = 'application/json;charset=utf-8;';
      }

      // 5. 生成文件名
      const filename = generateFilename(exportFormat);

      // 6. 下载文件
      downloadFile(content, filename, mimeType);

      // 7. 显示成功提示
      void message.success(`成功导出 ${data.length} 条授权码`);

      // 8. 关闭 Modal
      setExportModalVisible(false);
    } catch (error) {
      console.error('导出失败:', error);
      void message.error('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  /**
   * Table 列配置
   */
  const columns: ColumnsType<InviteCodeListItem> = [
    {
      title: '授权码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => (
        <Typography.Text code copyable={{ text: code }}>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_text: unknown, record: InviteCodeListItem) => {
        const status = getInviteCodeStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '使用者',
      dataIndex: 'used_by_username',
      key: 'used_by_username',
      width: 150,
      render: (username: string | null) =>
        username ? <Text>{username}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '有效期',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 180,
      render: formatDateTime,
      sorter: (a, b) => {
        // 永久有效的授权码排在末尾
        if (!a.expires_at && !b.expires_at) return 0;
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend', // 默认降序（最新的在前）
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
              授权码管理
            </Title>
            <Text type="secondary">生成和管理用户注册授权码</Text>
          </Space>
          <Space size="middle">
            <Button
              type="default"
              size="large"
              icon={<DownloadOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              导出授权码
            </Button>
            <Button type="primary" size="large" onClick={() => setModalVisible(true)}>
              生成授权码
            </Button>
          </Space>
        </div>

        {/* 搜索和状态过滤器卡片 */}
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
                placeholder="搜索授权码或使用者"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                size="large"
              />
            </Col>
            <Col xs={24} sm={24} md={14}>
              <Segmented
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { label: '全部', value: 'all' },
                  { label: '未使用', value: 'unused' },
                  { label: '已使用', value: 'used' },
                  { label: '已过期', value: 'expired' },
                ]}
                block
                size="large"
              />
            </Col>
          </Row>
        </Card>

        {/* 生成授权码 Modal */}
        <Modal
          title="生成授权码"
          open={modalVisible}
          onOk={() => void handleCreateInviteCode()}
          onCancel={() => setModalVisible(false)}
          confirmLoading={createLoading}
          okText="确定"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="count"
              label="生成数量"
              initialValue={1}
              rules={[
                { required: true, message: '请输入生成数量' },
                { type: 'number', min: 1, max: 50, message: '数量范围：1-50' },
              ]}
            >
              <InputNumber
                min={1}
                max={50}
                style={{ width: '100%' }}
                placeholder="输入生成数量（1-50）"
              />
            </Form.Item>
            <Form.Item name="expires_at" label="有效期(可选)">
              <DatePicker
                showTime
                placeholder="选择过期时间"
                style={{ width: '100%' }}
                format="YYYY-MM-DD HH:mm"
              />
            </Form.Item>
            <div style={{ color: '#999', fontSize: '12px' }}>
              如果不设置有效期,所有授权码将永久有效
            </div>
          </Form>
        </Modal>

        {/* 导出授权码 Modal */}
        <Modal
          title="导出授权码"
          open={exportModalVisible}
          onOk={() => void handleExport()}
          onCancel={() => setExportModalVisible(false)}
          confirmLoading={exportLoading}
          okText="确定"
          cancelText="取消"
          width={400}
        >
          <div style={{ marginBottom: '16px', color: '#666' }}>选择导出格式:</div>
          <Radio.Group
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="csv">CSV 格式（逗号分隔，适合 Excel 打开）</Radio>
              <Radio value="json">JSON 格式（结构化数据，适合程序处理）</Radio>
            </Space>
          </Radio.Group>
        </Modal>

        {/* 授权码列表卡片 */}
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <Spin tip="加载中..." size="large" />
          </div>
        ) : (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Table
              dataSource={getFilteredData()}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个授权码`,
              }}
              locale={{
                emptyText: '还没有授权码,点击生成按钮开始',
              }}
              style={{
                background: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default InviteCodesPage;
