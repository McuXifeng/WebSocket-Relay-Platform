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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import type { Dayjs } from 'dayjs';
import type {
  InviteCodeListItem,
  CreateInviteCodeRequest,
} from '@websocket-relay/shared/types/invite-code.types';
import { createInviteCode, getInviteCodes } from '@/services/admin.service';

const { Title, Text } = Typography;

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
  const [form] = Form.useForm();

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
   * 生成授权码处理函数
   */
  const handleCreateInviteCode = async () => {
    try {
      setCreateLoading(true);
      // 验证表单
      const values = (await form.validateFields()) as { expires_at?: Dayjs };

      // 构建请求数据
      const payload: CreateInviteCodeRequest = values.expires_at
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          { expires_at: values.expires_at.toISOString() }
        : {};

      // 调用 createInviteCode API
      await createInviteCode(payload);

      // 生成成功
      void message.success('授权码生成成功');

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
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => formatDateTime(date),
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
            授权码管理
          </Title>
          <span style={{ color: '#666' }}>生成和管理用户注册授权码</span>
        </Space>
        <Button type="primary" size="large" onClick={() => setModalVisible(true)}>
          生成授权码
        </Button>
      </div>

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
          <Form.Item name="expires_at" label="有效期(可选)">
            <DatePicker
              showTime
              placeholder="选择过期时间"
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
          <div style={{ color: '#999', fontSize: '12px' }}>如果不设置有效期,授权码将永久有效</div>
        </Form>
      </Modal>

      {/* 授权码列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <Spin tip="加载中..." size="large" />
        </div>
      ) : (
        <Table
          dataSource={inviteCodes}
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
          style={{ background: '#fff' }}
        />
      )}
    </div>
  );
}

export default InviteCodesPage;
