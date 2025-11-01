import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Row,
  Col,
  Statistic,
  Button,
  Spin,
  Space,
  message,
  Modal,
  Form,
  Input,
} from 'antd';
import { UserOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { getEndpoints } from '@/services/endpoint.service';
import { api } from '@/services/api';

/**
 * ProfilePage 组件 - 个人中心页面
 *
 * 职责：
 * - 展示用户基本信息（用户名、邮箱、注册时间）
 * - 展示统计数据（总端点数、账户创建天数）
 * - 提供退出登录功能
 *
 * 实现要点：
 * - 使用 useAuth Hook 获取当前用户信息
 * - 使用 useEffect 加载端点列表（计算端点数量）
 * - 使用 Ant Design Card、Descriptions、Statistic 组件展示信息
 * - 使用 date-fns 格式化日期并计算天数
 *
 * 架构设计：
 * - ProfilePage 嵌套在 MainLayout 内，复用顶部导航栏
 * - 通过 ProtectedRoute 保护，需要登录才能访问
 */
function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const [endpointCount, setEndpointCount] = useState<number>(0);
  const [endpointsLoading, setEndpointsLoading] = useState<boolean>(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  /**
   * 加载端点列表（仅用于计算数量）
   */
  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        setEndpointsLoading(true);
        const endpoints = await getEndpoints();
        setEndpointCount(endpoints.length);
      } catch (error) {
        // 统计数据获取失败不应阻塞页面显示
        // 静默失败，显示默认值 0
        console.error('获取端点列表失败:', error);
        setEndpointCount(0);
      } finally {
        setEndpointsLoading(false);
      }
    };

    void fetchEndpoints();
  }, []);

  /**
   * 退出登录处理函数
   */
  const handleLogout = () => {
    logout(); // 清除 localStorage 和 AuthContext 状态
    void message.success('已退出登录');
    void navigate('/login');
  };

  /**
   * 打开编辑邮箱对话框
   */
  const handleEditEmail = () => {
    form.setFieldsValue({ email: user?.email });
    setIsEditModalVisible(true);
  };

  /**
   * 提交邮箱修改
   */
  const handleSubmitEmail = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const values = await form.validateFields();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      await api.put('/auth/profile', { email: values.email });
      void message.success('邮箱更新成功');
      setIsEditModalVisible(false);
      // 刷新用户信息
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      if ((error as { errorFields?: unknown[] }).errorFields) {
        // 表单验证失败
        return;
      }
      void message.error('邮箱更新失败');
      console.error('Failed to update email:', error);
    }
  };

  /**
   * 初始化加载状态
   */
  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#666' }}>加载中...</div>
      </div>
    );
  }

  /**
   * 用户未登录（通常不会到达这里，因为 ProtectedRoute 已经保护路由）
   */
  if (!user) {
    void navigate('/login');
    return null;
  }

  /**
   * 计算账户创建天数
   */
  const accountDays = differenceInDays(new Date(), new Date(user.created_at));

  /**
   * 格式化注册时间
   */
  const formattedCreatedAt = format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss', {
    locale: zhCN,
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 用户信息卡片 */}
        <Card
          title="个人信息"
          bordered={false}
          extra={
            <Button type="link" icon={<EditOutlined />} onClick={handleEditEmail}>
              编辑邮箱
            </Button>
          }
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{formattedCreatedAt}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 统计数据区域 */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Card>
              {endpointsLoading ? (
                <Spin />
              ) : (
                <Statistic
                  title="总端点数"
                  value={endpointCount}
                  prefix={<UserOutlined />}
                  suffix="个"
                />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="账户创建天数"
                value={accountDays}
                prefix={<CalendarOutlined />}
                suffix="天"
              />
            </Card>
          </Col>
        </Row>

        {/* 退出登录按钮 */}
        <Card bordered={false}>
          <Button
            danger
            size="large"
            onClick={handleLogout}
            style={{ width: '100%', maxWidth: 200 }}
          >
            退出登录
          </Button>
        </Card>
      </Space>

      {/* 编辑邮箱对话框 */}
      <Modal
        title="编辑邮箱"
        open={isEditModalVisible}
        onOk={() => void handleSubmitEmail()}
        onCancel={() => setIsEditModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱地址"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ProfilePage;
