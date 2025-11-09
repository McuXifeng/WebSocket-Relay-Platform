import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Modal } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { LoginRequest } from '@shared/types/auth.types';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 登录页面组件
 *
 * 功能：
 * - 用户名和密码表单
 * - 客户端验证（必填）
 * - 调用登录 API
 * - 存储 JWT Token 到 localStorage
 * - 更新 AuthContext 认证状态
 * - 成功后跳转到 Dashboard
 * - 显示加载状态
 */
function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  /**
   * 异步登录处理
   *
   * 流程：
   * 1. 调用 AuthContext 的 login() 方法（内部会调用 API、存储 token、更新状态）
   * 2. 显示成功消息
   * 3. 跳转到 Dashboard
   *
   * 错误处理：
   * - api.ts 拦截器已统一处理错误显示，组件不需要手动调用 message.error()
   * - catch 块仅用于静默处理或日志记录
   * - Epic 10 Story 10.4: 检测用户被封禁错误,显示封禁详情Modal
   *
   * 修复 CODE-001: 提取为独立 async 函数，提高代码可读性
   */
  const performLogin = async (loginData: LoginRequest) => {
    try {
      // 调用 AuthContext 的 login() 方法
      // 该方法内部会：调用 API、存储 token、更新用户状态
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      await login(loginData.username, loginData.password);

      // 显示成功消息
      void message.success('登录成功');

      // 跳转到 Dashboard
      void navigate('/dashboard');
    } catch (error: unknown) {
      // Epic 10 Story 10.4: 检查是否为用户被封禁错误
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const response = error.response as {
          status?: number;
          data?: { message?: string; user?: { banned_at?: string; banned_reason?: string } };
        };

        // 检查是否为403错误且错误消息包含"封禁"关键词
        if (
          response.status === 403 &&
          response.data?.message &&
          (response.data.message.includes('封禁') || response.data.message.includes('banned'))
        ) {
          // 显示封禁详情Modal
          Modal.error({
            title: '账户已被封禁',
            icon: <ExclamationCircleOutlined />,
            content: (
              <div>
                <p>
                  您的账户已被管理员封禁,无法登录。
                  {response.data.user?.banned_at && (
                    <>
                      <br />
                      <strong>封禁时间:</strong> {response.data.user.banned_at}
                    </>
                  )}
                </p>
                {response.data.user?.banned_reason && (
                  <p>
                    <strong>封禁原因:</strong> {response.data.user.banned_reason}
                  </p>
                )}
                <p style={{ marginTop: 16, color: '#666' }}>如有疑问,请联系管理员。</p>
              </div>
            ),
            okText: '确定',
          });
          return; // 不再继续执行默认错误处理
        }
      }

      // 其他错误: api.ts 拦截器已经显示了错误消息
      // 这里只需要记录日志
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 表单提交处理器
   *
   * Ant Design Form onFinish 类型要求返回 void，
   * 因此使用包装函数调用异步 performLogin
   */
  const handleSubmit = (values: unknown) => {
    // 类型保护：确保 values 符合 LoginRequest 接口
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const loginData = values as LoginRequest;

    setLoading(true);

    // 调用异步登录函数
    void performLogin(loginData);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <Card
        title="用户登录"
        style={{
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          {/* 用户名字段 */}
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          {/* 密码字段 */}
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>

          {/* 注册链接 */}
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Text>
              还没有账号? <Link to="/register">去注册</Link>
            </Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
